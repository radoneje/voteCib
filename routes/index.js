var express = require('express');
var router = express.Router();
var path = require('path');
var fs = require('fs');
var JavaScriptObfuscator = require('javascript-obfuscator');

/* GET home page. */
router.get('/js/:name', function(req, res, next) {
   fs.readFile(path.join(__dirname, '../public/javascripts/'+req.params.name),  "utf8",(err, data)=>{
            if(err) {
                console.log(path.join(__dirname, '../public/javascripts/'+req.params.name), err)
                return res.sendStatus(404);
            }
       var obfuscationResult = JavaScriptObfuscator.obfuscate( data,
           {
               compact: true,
               controlFlowFlattening: true,
               controlFlowFlatteningThreshold: 1,
               numbersToExpressions: true,
               simplify: true,
               stringArrayShuffle: false,
               splitStrings: true,
               stringArrayThreshold: 1
           });
        console.log("res",obfuscationResult.getObfuscatedCode())

       res.contentType("application/javascript");
       res.send(obfuscationResult.getObfuscatedCode())
    });
});

router.post('/admin', function(req, res, next) {
  if(req.body.l!="editor" && req.body.l!="dfczgegrby")
  {
    return res.render('adminLogin', {msg:"неверный логин или пароль", name:req.body.l});
  }
  req.session["admin"]="editor"
  res.render('admin', );
});
router.get('/admin', function(req, res, next) {
  if(!req.session["admin"])
    return res.render('adminLogin', {msg:""});
  var user=req.session["admin"];

  res.render('admin', { user: req.session["user"] });
});

router.get("/status", async (req, res)=>{
    let chat=await req.knex.select("*").from("v_chat").orderBy("date", );
    let q=await req.knex.select("*").from("v_q").orderBy("date", );
    let tags=await req.knex.select("*").from("t_tags").where({isDeleted:false}).orderBy("id", "desc");
    for(let tag of tags){
        let a=await req.knex("t_tagsanswers").count('id as count').where({tagsid:tag.id});
        tag.count=a[0].count;
    }

    let count=50-chat.length;
    if(count<0)
      chat=chat.slice(count);

     count=50-q.length;
    if(count<0)
      q=q.slice(count);

    let vote=await req.knex.select("*").from("t_vote").where({isDeleted:false, isactive:true}).orderBy("id");

    for(let item of vote){
      item.answers=await( req.knex.select("*").from("t_voteanswers").where({voteid:item.id, isDeleted:false}).orderBy("id"));
      let total=0;
      item.answers.forEach(a=>{total+=a.count});
      item.total=total;
    }
    let status=(await req.knex.select("*").from("t_status"))[0]
    var timeout=20;
    try {
      var timeout=parseInt(fs.readFileSync(path.join(__dirname, '../updateTimeout.txt')))
    }
    catch(e){
      console.warn(e)
    }

  res.json({chat, q, vote, tags, status, timeout});
})
router.get('/vote', function(req, res, next) {
    res.render('vote', );
})
router.get('/:id?', function(req, res, next) {

    res.render('index', { user: req.session["user"] });
});

module.exports = router;
