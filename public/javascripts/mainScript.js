(() => {
    let app = new Vue({
        el: "#app",
        data: {
            isQActive: true,
            q: [],
            chat: [],
            qText: "",
            chatText: [],
            isLoading: false,
            vote:[],
            status:{},
            isLoaded:false,
            timeout:20,
            logTimeout:60
        },
        methods: {

            getCalcPercent:function(total, count){

                var perc = getPercent(total, count);
                return  'calc(100% - '+perc+')';
            },
            getPercent:function(total, count){
                if (total == 0)
                    return "0%"
                var perc = (parseFloat(count) / parseFloat(total) * 100);
                return perc.toPrecision(4) + "%"
            },
            voiting:async function(item){

                var store=localStorage.getItem("vote"+item.voteid);
                if(store==item.id)
                    return

                if(store) {

                    await axios.post("/api/reVote", {id: store});
                }
                await axios.post("/api/Vote", {id: item.id});
                localStorage.setItem("vote"+item.voteid, item.id);
                this.vote=this.vote.filter(v=>{return true});

            },
            checkVote:function(item){
                var store=localStorage.getItem("vote"+item.voteid);
                return store==item.id;
            },
            chatSend: async function () {
                if (this.chatText.length < 1)
                    return;
                this.isLoading = true;
                try {
                    var r = await axios.post("/api/chatSend", {text: this.chatText});
                    this.chat.push(r.data);
                    var objDiv = document.getElementById("chatBox");
                    if (objDiv)
                        setTimeout(function () {
                            objDiv.scrollTop = objDiv.scrollHeight;
                        }, 0)
                    this.chatText = "";
                } catch (e) {
                    console.warn(e);
                } finally {
                    setTimeout(() => {
                        this.isLoading = false;
                    }, 2000)

                }

            },
            qSend: async function () {
                if (this.qText.length < 1)
                    return;
                this.isLoading = true;
                try {
                    var r = await axios.post("/api/qSend", {text: this.qText});
                    this.q.push(r.data);
                    var objDiv = document.getElementById("qBox");
                    if (objDiv)
                        setTimeout(function () {
                            objDiv.scrollTop = objDiv.scrollHeight;
                        }, 0)
                    this.qText = "";
                } catch (e) {
                    console.warn(e);
                } finally {
                    setTimeout(() => {
                        this.isLoading = false;
                    }, 2000)

                }

            },
            updateStatus: async function () {
                try {
                   var  d = await axios.get("/status/");
                    //var d = await axios.get("/vcbr/status/");
                    this.isLoaded=true;
                    this.status=d.data.status;
                    var to=parseInt(d.data.timeout);
                    if(Number.isInteger(to) && to>2 && to<300)
                        this.timeout=to;
                    var inserted = false;
                   /* d.data.chat.forEach(c => {

                        if (this.chat.filter(cc => cc.id == c.id).length == 0) {
                            this.chat.push(c);
                            inserted = true;
                        }
                    });
                    this.chat.forEach(cc => {
                        if (d.data.chat.filter(c => cc.id == c.id).length == 0) {
                            cc.isDeleted = true;
                        }
                    })
                    this.chat.forEach(cc => {
                        d.data.chat.forEach(c => {
                            if (c.id == cc.id) {
                                cc.answer = c.answer
                            }
                        });


                    })

                    this.chat = this.chat.filter(cc => {
                        return !cc.isDeleted && cc.userid == user.id
                    })

                    if (inserted) {
                        var objDiv1 = document.getElementById("chatBox");
                        if (objDiv1)
                            setTimeout(function () {
                                objDiv1.scrollTop = objDiv1.scrollHeight;
                            }, 0)
                    }*/
                    /////////////

                    inserted = false;
                    /*
                    d.data.q.forEach(c => {

                        if (this.q.filter(cc => cc.id == c.id).length == 0) {
                            this.q.push(c);
                            inserted = true;
                        }
                    });
                    this.q.forEach(cc => {
                        if (d.data.q.filter(c => cc.id == c.id).length == 0) {
                            cc.isDeleted = true;
                        }
                    })
                    this.q = this.q.filter(cc => {
                        return !cc.isDeleted || cc.userid == user.id
                    })
                    this.q.forEach(q=>{
                        d.data.q.forEach(c=>{
                            if(q.id==c.id){
                                q.isApproved=c.isApproved;
                            }
                        })
                    })
                        this.q = this.q.filter(cc => {
                        return (cc.isApproved || cc.userid == user.id) && ! cc.isDeleted;
                    })

                    if (inserted) {
                        var objDiv2 = document.getElementById("qBox");
                        if (objDiv2)
                            setTimeout(function () {
                                objDiv2.scrollTop = objDiv2.scrollHeight;
                            }, 10)
                    }*/
                    ////////////
                  ///  console.log("d.data.vote", d.data)
                    this.vote = d.data.vote
                    console.log("d.data.vote", d.data)
                    /////
                }
                catch (e){
                    console.warn(e);
                }
                console.log("setTimeout", this.timeout )
                setTimeout(() => {
                    this.updateStatus();
                }, this.timeout * 1000)
            },
            stat:async function(){
                try {

                    var d=await axios.post("/api/stat");

                    var to=parseInt(d.data.timeout);
                    if(Number.isInteger(to) && to>5 && to<300)
                        this.logTimeout=to;

                }
                catch(e){
                    console.warn(e)
                }
                console.log("setLogTimeout",this.logTimeout )
                setTimeout(() => {
                    this.stat();
                }, this.logTimeout * 1000);
            }
        },
        watch: {
            status:function (val){
              //  if(!val.q)
               //     this.isQActive=false

                    },
            isQActive: function (val) {
                var objDiv1 = document.getElementById("chatBox");
                if (objDiv1)
                    setTimeout(function () {
                        objDiv1.scrollTop = objDiv1.scrollHeight;
                    }, 0)
                var objDiv2 = document.getElementById("qBox");
                if (objDiv2)
                    setTimeout(function () {
                        objDiv2.scrollTop = objDiv2.scrollHeight;
                    }, 0)
            }
        },
        mounted: function () {
           /* document.getElementById("chatInput").addEventListener("keyup", (e) => {
               // if (e.code == "Enter")
               //     this.chatSend();document.querySelector(".up").addEven
            })
            document.getElementById("qInput").addEventListener("keyup", (e) => {
               // if (e.code == "Enter")
                //    this.qSend();
            })*/
            this.updateStatus();
            //this.stat();
        }
    });
    /*document.querySelector(".up").addEventListener("click", () => {
        //document.body.scrollTop = document.documentElement.scrollTop = 0;
        window.scrollTo({top: 0, behavior: 'smooth'});
    })


    var observer = new IntersectionObserver((entries, observer) => {
        if (entries[0].isIntersecting)
            document.querySelector('.up').classList.add('hidden')
        else
            document.querySelector('.up').classList.remove('hidden')
    }, {root: null, rootMargin: '10px', threshold: [0.0, 0.0]});
    observer.observe(document.querySelector('.headerBox'));
*/
}
)();


async function logout() {
    var dt = await axios.get("/api/logout");
    if (dt.data.success)
        window.location.reload();
}

function scrollToElement(elemId) {
    var elem = document.getElementById(elemId);
    scrollToSmoothly(elem.offsetTop, 600);
}

function scrollToSmoothly(pos, time) {
    var currentPos = window.pageYOffset;
    var start = null;
    if (time == null) time = 500;
    pos = +pos, time = +time;
    window.requestAnimationFrame(function step(currentTime) {
        start = !start ? currentTime : start;
        var progress = currentTime - start;
        if (currentPos < pos) {
            window.scrollTo(0, ((pos - currentPos) * progress / time) + currentPos);
        } else {
            window.scrollTo(0, currentPos - ((currentPos - pos) * progress / time));
        }
        if (progress < time) {
            window.requestAnimationFrame(step);
        } else {
            window.scrollTo(0, pos);
        }
    });
}
function downloadFile(src, name){
    console.log(src)
    var link = document.createElement('a');
    link.style.display="none"
    link.href = src;
    link.download = name;
    link.dispatchEvent(new MouseEvent('click'));

}


