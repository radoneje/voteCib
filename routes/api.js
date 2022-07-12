var express = require('express');
var moment = require('moment');
var router = express.Router();
//var geoip = require('geoip-lite');


/* GET home page. */
router.get('/depatments', async (req, res, next) => {
    res.json(await req.knex.select("*").from("t_departments").orderBy("sort"));
});
router.post('/depatments', checkAdmin,async (req, res, next) => {
    var id=req.body.id;
    delete req.body.id
    await req.knex("t_departments").update(req.body).where({id:id})
    res.json(await req.knex.select("*").from("t_departments").orderBy("sort"));
});
router.post('/login', async (req, res, next) => {
    let code = parseInt(req.body.code);
    if (isNaN(code))
        return res.json({error: true});

    let dep = parseInt(req.body.dep);
    if (isNaN(dep))
        return res.json({error: true});

    let users = await req.knex.select("*").from("t_users").where({code: parseInt(req.body.code)});

    if (users.length == 0)
        return res.json({error: true});
    let user = users[0];
    if (
        normalizeString(user.f) === normalizeString(req.body.f) &&
        normalizeString(user.i) === normalizeString(req.body.i)
    ) {

        if (req.users.filter(u => {
            return u.id == user.id
        }).length > 0) {
            return res.json({error: true, doubleLogin: true});
        }
        var ip= req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      //  var geo = geoip.lookup(ip);
        var info = "";
        info += (" " + req.headers["user-agent"]);
        info += (" " + req.headers["accept-language"]);
       // info += (" Country: " + (geo ? geo.country : "Unknown"));
       // info += (" Region: " + (geo ? geo.region : "Unknown"));


        var r = await req.knex("t_logins").insert({
            userId: user.id,
            dep: dep,
            ip: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
            Descr: info
        }, "*")
        await req.knex("t_users").update({deptid: dep}, "*").where({id: user.id});
        delete user.code;
        req.session["user"] = user;
        req.updateUser(user)

        return res.json({success: true});
    }
    res.json({error: true});
});

function normalizeString(str) {
    str = str.toLowerCase();
    str.trim();
    str = str.replace(/\s/gi, "");
    str = str.replace(/ё/gi, "е");
    return str;
}

function checkAdmin(req, res, next) {
    if (!req.session["admin"])
        return res.send(401);
    next();
}

function checkLogin(req, res, next) {

    if (!req.session["user"])
        return res.send(401);
    var find = false;
    req.users.forEach(u => {
        if (u.id == req.session["user"].id) {
            u.time = moment().unix();
            find = true;
        }
    })
    if (!find)
        req.users.push({id: req.session["user"].id, time: moment().unix()});
    next();
}

router.get("/status", checkLogin, (req, res, next) => {
    res.json({chat: [], q: [], vote: [], user: req.session["user"]})
})
router.get("/logout",/*checkLogin,*/(req, res, next) => {
    req.clearUser(req.session["user"].id);
    console.log("logout", req.users);
    req.session["user"] = null;
    res.json({success: true});
})
router.post("/chatSend", checkLogin, async (req, res, next) => {

    var r = await req.knex("t_chat").insert({text: req.body.text, userid: req.session["user"].id}, "*");
    var dt = await req.knex.select("*").from("v_chat").where({id: r[0].id})
    res.json(dt[0]);
})

router.post("/qSend", checkLogin, async (req, res, next) => {
    var r = await req.knex("t_q").insert({text: req.body.text, userid: req.session["user"].id}, "*");
    var dt = await req.knex.select("*").from("v_q").where({id: r[0].id})
    res.json(dt[0]);
})
router.post("/qDelete", checkAdmin, async (req, res, next) => {
    var r = await req.knex("t_q").update({isDeleted: true}, "*").where({id: req.body.id});

    res.json(r[0].id);
})
router.post("/chatDelete", checkAdmin, async (req, res, next) => {
    var r = await req.knex("t_chat").update({isDeleted: true}, "*").where({id: req.body.id});
    res.json(r[0].id);
})
router.get("/users", checkAdmin, async (req, res, next) => {

    res.json(await getUsers(req));
})
async function getUsers(req){
    var r = await req.knex.select("*").from("t_users").orderBy("f").orderBy("i")
    for (let user of r) {
        user.logins = await req.knex.select("*").from("v_logins").where({userId: user.id}).orderBy("id")
    }
    return r;
}

router.get("/newUserCode", checkAdmin, async (req, res, next) => {
    var e = await createCode(randomIntFromInterval(10000, 99999))
    res.json(e);


    async function createCode(candidate) {
        var r = await req.knex.select("*").from("t_users").where({code: candidate});
        if (r.length == 0)
            return candidate;
        return (await createCode(randomIntFromInterval(10000, 99999)));
    }

    function randomIntFromInterval(min, max) { // min and max included
        return Math.floor(Math.random() * (max - min + 1) + min)
    }
})
router.post("/addUser", checkAdmin, async (req, res, next) => {
r=await req.knex("t_users").insert(req.body, "*");
    res.json({id:r[0].id, list:await getUsers(req)});
});
router.post("/addVote", checkAdmin, async (req, res, next) => {
    r=await req.knex("t_vote").insert(req.body, "*");
    res.json({id:r[0].id, list:await getVotes(req)});
});
router.post("/addTag", checkAdmin, async (req, res, next) => {
    let r=await req.knex("t_tags").insert(req.body, "*");
    res.json({id:r[0].id, list:await getTags(req)});
});
router.post("/tagSend", async (req, res, next) => {
    let id= req.body.id;
    let words=req.body.answer.replace(/;/gi,",").split(",");

    for(var w of words){
        if(w) {
            w = w.replace(/\s+|\s+$/ig, "").toUpperCase().trim();
            if (w.length > 0) {
                console.log("INSERT" + " '" + w + "'")
                var v = await req.knex("t_tagsanswers")
                    .insert({val: w, tagsid: id}, "*")
            }
        }
    }

    res.json(words.length);
});


router.get("/tagRes/:id", async (req, res, next) => {
    let r=await req.knex.select("*").from ("t_tagsanswers").where({tagsid:req.params.id});
    var arr=[];
    r.forEach(v=>{
        let val=v.val;
        let find=false;
        arr.forEach(aa=>{
            console.log(aa.x==val, "'"+aa.x+"'", "'"+val+"'" )
            if(aa.x==val){
                find=true;
                aa.value++;
            }
        })
        if(!find)
            arr.push({x:val,value:1});
    })
    res.json(arr);
});
async function getVotes(req){
    var r= await req.knex.select("*").from("t_vote").where({isDeleted:false}).orderBy("id");
    return r;
}
async function getTags(req){
    var r= await req.knex.select("*").from("t_tags").where({isDeleted:false}).orderBy("id", "desc");
    return r;
}
router.post("/deleteVote", checkAdmin, async (req, res, next) => {
    let r=await req.knex("t_vote").update({isDeleted:true},"*").where({id:req.body.id});
    res.json({id:r[0].id});
});

router.post("/startVote", checkAdmin, async (req, res, next) => {
    let r=await req.knex("t_vote").update({isactive:req.body.isactive},"*").where({id:req.body.id});
    res.json(r[0]);
});

router.post("/multyVote", checkAdmin, async (req, res, next) => {
    let r=await req.knex("t_vote").update({multy:req.body.multy},"*").where({id:req.body.id});
    res.json(r[0]);
});
router.post("/resultVote", checkAdmin, async (req, res, next) => {
    let r=await req.knex("t_vote").update({iscompl:req.body.iscompl},"*").where({id:req.body.id});
    res.json(r[0]);
});
///
router.post("/deleteTag", checkAdmin, async (req, res, next) => {
    let r=await req.knex("t_tags").update({isDeleted:true},"*").where({id:req.body.id});
    res.json({id:r[0].id});
});
router.post("/clearTag", checkAdmin, async (req, res, next) => {
    let r=await req.knex("t_tagsanswers").where({tagsid:req.body.id}).del();
    res.json(0);
});
router.post("/clearVote", checkAdmin, async (req, res, next) => {
    let r=await req.knex("t_voteanswers").update({count:0}).where({voteid:req.body.id});
    res.json(0);
});



router.post("/startTag", checkAdmin, async (req, res, next) => {
    let r=await req.knex("t_tags").update({isactive:req.body.isactive},"*").where({id:req.body.id});
    res.json(r[0]);
});
router.post("/resultTag", checkAdmin, async (req, res, next) => {
    let r=await req.knex("t_tags").update({iscompl:req.body.iscompl},"*").where({id:req.body.id});
    res.json(r[0]);
});
router.get("/votes", checkAdmin, async (req, res, next) => {
    let r=await req.knex.select("*").from("t_vote").where({isDeleted:false}).orderBy("id");
    for(let item of r){
         item.answers=await( req.knex.select("*").from("t_voteanswers").where({voteid:item.id, isDeleted:false}).orderBy("id"));
    }
    res.json(r);
});
router.post("/addAnswer", checkAdmin, async (req, res, next) => {
    let r = await req.knex("t_voteanswers").insert({voteid:req.body.id}, "*");
    res.json(r[0])
})
router.post("/changeAnswer", checkAdmin, async (req, res, next) => {
    let r = await req.knex("t_voteanswers").update({title:req.body.title}, "*").where({id:req.body.id});
    res.json(r[0])
})
router.post("/deleteAnswer", checkAdmin, async (req, res, next) => {
    let r = await req.knex("t_voteanswers").update({isDeleted:true}, "*").where({id:req.body.id});
    res.json(r[0])
})

router.post("/aVote", checkAdmin, async (req, res, next) => {
    let r = await req.knex.select("*").from("t_voteanswers").where({id:req.body.id});

     r= await req.knex("t_voteanswers").update({count:(r[0].count+1)}, "*").where({id:req.body.id});
    res.json(r[0])
})
router.post("/changeChatAnswer", checkAdmin, async (req, res, next) => {
    let r= await req.knex("t_chat").update({answer:req.body.answer}, "*").where({id:req.body.id});
    res.json(r[0])
})

router.post("/reVote", /*checkLogin,*/ async (req, res)=>{
    try {
        let r = await req.knex.select("*").from("t_voteanswers").where({id: req.body.id});
        let count=r[0].count - 1;

        if(count<0)
            count =0;
        r = await req.knex("t_voteanswers").update({count:count }, "*").where({id: req.body.id});
        res.json(r[0])
    }
    catch (e){
        console.warn(e);
        res.json("error");
    }
})
router.post("/vote", /*checkLogin,*/ async (req, res)=>{
    try {
        let r = await req.knex.select("*").from("t_voteanswers").where({id: req.body.id});
        let count=r[0].count + 1;
        r = await req.knex("t_voteanswers").update({count:count }, "*").where({id: req.body.id});
        res.json(r[0])
    }
    catch (e){
        console.warn(e);
        res.json("error");
    }
})

router.post("/changeStatus", checkAdmin, async (req, res, next) => {

    let r= await req.knex("t_status").update(req.body, "*");

    res.json(r[0])
})
router.post("/stat", async (req, res, next) => {
    if (!req.session["user"])
        return res.sendStatus(401);
   // req.updateUser(req.session["user"]);
    return res.json(299);
});

router.get("/logs" , checkAdmin, async (req, res, next) => {
   var r= await req.knex.select("date", "count").from("t_log").orderBy("id","desc").limit(200);

   return res.json({users:req.users, logs:r});
});
router.get("/iframe" , checkLogin, async (req, res, next) => {
    return res.render("iframe");
});

router.post("/changeQApproved", checkAdmin, async (req, res, next) => {

    let r= await req.knex("t_q").update({isApproved:req.body.isApproved},"*").where({id:req.body.id});
    res.json(r[0])
})
router.post("/changeQSpk", checkAdmin, async (req, res, next) => {

    let r= await req.knex("t_q").update({isSpk:req.body.isSpk},"*").where({id:req.body.id});
    res.json(r[0])
})









module.exports = router;
