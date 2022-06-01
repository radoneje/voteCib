var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var lessMiddleware = require('less-middleware');
var logger = require('morgan');
var moment = require('moment');

var session = require('express-session');

const config = require("./config.json")

var knex = require('knex')({
  client: 'pg',
  version: '7.2',
  connection: config.pgConnection,
  pool: {min: 0, max: 40}
});
const pgSession = require('connect-pg-simple')(session);
const pgStoreConfig = {conObject: config.pgConnection}
var sess = {
  secret: (config.sha256Secret),
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 10 * 24 * 60 * 60 * 1000,
    // secure: true,
    //httpOnly: true,
    //sameSite: 'none',
  }, // 10 days
  store: new pgSession(pgStoreConfig),
};


var indexRouter = require('./routes/index');
var apiRouter = require('./routes/api');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger(':date[clf] ":method :url"'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(lessMiddleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session(sess));

let users = [];
(async () => {
  var r=await knex.select("*").from("t_log").orderBy("id", "desc");
  if(r.length>0)
    users=r[0].values;
  await updateLogs();
})();
async function updateLogs(){
  try{
    // await knex("t_log").insert({count:users.length,values:JSON.stringify(users)})
  }
  catch (e) {
    console.warn(e)
  }
  // setTimeout(updateLogs,5*60*1000)
}
app.use("/", (req, res, next) => {
  req.knex = knex;
  next();
});
app.use("/", (req, res, next) => {
  req.users = users;
  next();
});
app.use("/", (req, res, next) => {
  req.clearUser = function (userid) {
    users = users.filter(u => {
      return u.id != userid
    })
  };
  next();
});
app.use("/", (req, res, next) => {
  req.updateUser = function (user) {
    // console.log("updateUser", user)
    users = users.filter(u => {
      return u.id !== user.id
    });
    users.push({id: user.id, time: moment().unix(), stage:1});
  };
  next();
});

app.use('/', indexRouter);
app.use('/api', apiRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

setInterval(() => {
  var time = moment().unix() - 90;
  users = users.filter(u => {
    return u.time > time
  });
}, 90 * 1000)


module.exports = app;
