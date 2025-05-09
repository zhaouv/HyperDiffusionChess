////////////////// Game //////////////////
Game=function(){
    this.xsize=1
    this.ysize=1
}

Game.prototype.MODELS=['HEPTAGONAL','SQUARE']
Game.prototype.HEPTAGONAL=Heptagonal
Game.prototype.SQUARE=Square

Game.prototype.DIFFUSION=4

Game.prototype.BLANK=0
Game.prototype.CRITICAL=1
Game.prototype.CHESS=2
Game.prototype.BAN=3

Game.prototype.POINT=1
Game.prototype.SCORE=2
Game.prototype.SCORE_PLAYER=[4,8]

Game.prototype.initMap=function(){
    var game=this
    game.model=game[game.MODELS[game.xsize-1]]
    game.map=Array.from(game.model).map(v=>game.BLANK)
    game.history=[]
}
Game.prototype.setSize=function(xsize,ysize){
    var game=this
    if(xsize)game.xsize=xsize;
    if(ysize)game.ysize=ysize;
    game.initMap()
}
Game.prototype.xy=function(xy,value){
    var game=this
    if(value==null)return game.map[xy];
    var oldValue=game.map[xy]
    game.map[xy]=value
    game.changeChess.forEach(function(f){f(xy,oldValue,value)})
}
Game.prototype.initPlayer=function(){
    var game=this
    game.playerId=0
    game.player=[]
    for(var ii=0;ii<2;ii++){
        game.player.push({
            score:0,
            id:ii,
            changeTurn:function(callback){game.lock=0},
            continueTurn:function(callback){},
            pointer:null,
        })
    }
}
Game.prototype.firstStep=function(callback){
    var game=this
    game.player[game.playerId].changeTurn(callback)
    return game
}

Game.prototype.CACHE={
    UNVISITED:0,
    VISITED:1,
}
Game.prototype.connectingCount=function(xy,cacheMap){
    var game=this
    if (cacheMap==null) {
        cacheMap=Array.from(game.model).map(v=>game.CACHE.UNVISITED)
    }
    var count=1
    var queue=[xy]
    cacheMap[xy]=game.CACHE.VISITED
    while (queue.length) {
        var cxy=queue.pop()
        game.model.link[cxy].forEach(xyi=>{
            if (cacheMap[xyi]===game.CACHE.UNVISITED) {
                cacheMap[xyi]=game.CACHE.VISITED
                if (game.xy(xyi)===game.CHESS) {
                    count+=1
                    queue.push(xyi)
                }
            }
        })
    }
    return [count,cacheMap]
}
Game.prototype.test1=function () {
    var game=this
    game.map=[0, 2, 0, 0, 0, 2, 2, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    console.log(game.connectingCount(0))
    console.log(game.connectingCount(1))
    console.log(game.connectingCount(2))
}
Game.prototype.putxy=function(xy,callback){
    var game=this
    if(game.lock){
        if(callback)callback(null,'lock');
        return 'lock';
    }
    var currentXY=game.xy(xy)
    if(currentXY!==game.BLANK && currentXY!==game.CRITICAL){
        if(callback)callback(null,'Invalid click');
        return 'Invalid click';
    }
    game.xy(xy,game.CHESS)
    if (currentXY===game.BLANK) {
        //数连接个数然后扩大一圈的检查有没有临界
        var [count,cacheMap]=game.connectingCount(xy)
        cacheMap.forEach((v,i)=>{
            if (v===game.CACHE.VISITED && game.xy(i)===game.BLANK) {
                if (count==game.DIFFUSION-1) {
                    game.xy(i,game.CRITICAL)
                } else{
                    // var ncount=game.connectingCount(i,Array.from(cacheMap))[0]
                    var ncount=game.connectingCount(i)[0]
                    if (ncount>=game.DIFFUSION) {
                        game.xy(i,game.CRITICAL)
                    }
                }
            }
        })

    } else { // currentXY===game.CRITICAL
        //一圈改成ban
        var [count,cacheMap]=game.connectingCount(xy)
        cacheMap.forEach((v,i)=>{
            if (v===game.CACHE.VISITED && (game.xy(i)===game.BLANK || game.xy(i)===game.CRITICAL)) {
                game.xy(i,game.BAN)
            }
        })
    }
    game.history.push([xy,game.playerId])
    // game.changeHistory
    game.changeHistory.forEach(function(f){f(xy)})

    // 游戏是否结束的检查
    if(game.map.filter(v=>v===game.BLANK || v===game.CRITICAL).length===0){
        game.winnerId=currentXY===game.BLANK?game.playerId:1-game.playerId
        game.win.forEach(function(f){f(game.winnerId)})
        if(callback)callback('win',null);
        return 'win'+game.playerId
    }

    if(currentXY===game.CRITICAL){
        game.player[game.playerId].continueTurn(callback)
        return 'continueTurn'
    } else { // currentXY===game.BLANK
        game.playerId=1-game.playerId
        game.changePlayer.forEach(function(f){f(game.playerId)})
        game.player[game.playerId].changeTurn(callback)
        return 'changeTurn'
    }
}
Game.prototype.init=function(xsize,ysize){
    var game=this
    game.lock=1
    game.setSize(xsize,ysize)
    game.initPlayer()
    game.winnerId=null
    
    game.changeHistory=[]//function(xy){}
    game.changeChess=[]//function(xy,from,to){}
    game.changeScore=[]//function(xy,playerId,score){}
    game.changePlayer=[]//function(playerId){}
    game.win=[]//function(playerId){}

    game.win.push(function(playerId){
        game.lock=1
    })

    return game
}

////////////////// gameview //////////////////
gameview={}
gameview.class={
    [Game.prototype.BLANK]:'blank',
    [Game.prototype.CRITICAL]:'critical',
    [Game.prototype.CHESS]:'chess',
    [Game.prototype.BAN]:'ban',
}
gameview.playerColor=['#fbb','#bbf']

gameview.initTable=function(){
    var game=gameview.game
    var svg = gameview.discsvg;
    function disc(p1, size, pid) {
        var path = document.createElementNS("http://www.w3.org/2000/svg", "circle");

        path.setAttribute("cx", p1.x);
        path.setAttribute("cy", p1.y);
        path.setAttribute("r", size);
        // path.setAttribute("fill", "#d0000033");
        // path.setAttribute("fill", "#88888833");
        path.setAttribute("stroke", "none");
        path.setAttribute("pid", pid);
        path.setAttribute("class", `place blank p${pid}`);

        svg.appendChild(path);
    }
    robj=game.model
    svg.innerHTML=''
    if(1)Array.from(robj).forEach((v,ii) => {
        var [x1,y1]=robj['center'][ii]
        disc({ x: x1, y: y1 }, robj['size'][ii], ii)
    });
    // document.querySelector('.p1').classList.add('ban')
    // document.querySelector('.p1').classList.remove('blank')

    // document.querySelector('.p5').classList.add('chess')
    // document.querySelector('.p5').classList.remove('blank')

    // document.querySelector('.p3').classList.add('critical')

    // document.querySelector('.p4').classList.add('lastaction')
}
gameview.xy=function(xy){return gameview.discsvg.children[xy]}
gameview.printtip=function(tip){
    gameview.gametip.innerText=tip
}
gameview.listenTable=function(){
    setTimeout(function(){
        var game=gameview.game
        Array.from(game.model).forEach((v,ii) => {
            gameview.xy(ii).onclick=function(){
                console.log('click xy',ii)
                game.putxy(ii)
            }
        })
    },0)
}
gameview.buildTable=function(){
    gameview.initTable()
    gameview.listenTable()
}
gameview.listenGame=function(){
    var game=gameview.game
    var lastedge = null
    game.changeHistory.push(function(xy){
        if(lastedge)gameview.xy(lastedge[0]).classList.remove('lastaction')
        gameview.xy(xy).classList.add('lastaction')
        lastedge=[xy]
    })
    game.changeChess.push(function(xy,oldValue,value){
        if (oldValue===value) return;
        gameview.xy(xy).classList.remove(gameview.class[oldValue])
        gameview.xy(xy).classList.add(gameview.class[value])
    })
    game.changeScore.push(function(playerId,score){
        gameview.gameinfo.children[playerId].children[0].children[0].innerHTML=score
    })
    game.changePlayer.push(function(playerId){
        gameview.gameinfo.children[playerId].children[0].children[1].innerHTML='-'
        gameview.gameinfo.children[1-playerId].children[0].children[1].innerHTML=''
        gameview.gameinfo.children[playerId].style.background=gameview.playerColor[playerId]
        gameview.gameinfo.children[1-playerId].style.background=''
    })
    game.win.push(function(playerId){
        gameview.gameinfo.children[playerId].children[0].children[1].innerHTML='win'
    })
    game.win.push(function(playerId){
        setTimeout(function(){
            var replay=confirm((playerId==0?'先手玩家':'后手玩家')+' win, replay?')
            if(replay)resetgame(first2);
        },30)
    })
}
gameview.init=function(game,hasInited){
    gameview.discsvg = document.querySelector('.discsvg')
    gameview.gameinfo = document.getElementById('gameinfo')
    gameview.gametip = document.getElementById('gametip')
    gameview.x = document.getElementById('gx')
    gameview.y = document.getElementById('gy')

    var ss = window.location.search
    if(ss.indexOf('url=')!==-1){
        gameview.urlstr=ss.split('url=')[1].split('&')[0]
    }

    gameview.gameinfo.children[0].style.background=gameview.playerColor[0]
    gameview.gameinfo.children[1].style.background=''
    gameview.gameinfo.children[0].children[0].children[0].innerHTML='0'
    gameview.gameinfo.children[1].children[0].children[0].innerHTML='0'
    gameview.gameinfo.children[0].children[0].children[1].innerHTML='-'
    gameview.gameinfo.children[1].children[0].children[1].innerHTML=''
    gameview.game=game
    if(hasInited){
        gameview.x.value=game.xsize
        gameview.y.value=game.ysize
    } else {
        game.init(~~gameview.x.value,~~gameview.y.value)
    }
    gameview.buildTable()
    gameview.listenGame()
    return gameview
}

////////////////// ReplayController //////////////////
ReplayController=function(){

}

ReplayController.prototype.init=function(game,gameview){
    var rc = this
    rc.game=game
    rc.gameview=gameview
    return rc
}

ReplayController.prototype.replay=function(step,time,callback){
    var rc = this
    var newgame = new Game().init(rc.game.xsize,rc.game.ysize)
    rc.newgame = newgame
    if(step=='last'){
        if(rc.game.history.length>=2){
            var index=rc.game.history.length-2
            var lastplayer=rc.game.history[rc.game.history.length-1][1]
            while(index>0){
                if(rc.game.history[index][1]!==lastplayer)break;
                index--;
            }
            step=index
        } else {
            step=null
        }
    }
    if(step==null)step=rc.game.history.length;
    if(time==null)time=10;
    rc.player1 = new LocalPlayer().init(newgame,rc.gameview)
    rc.player2 = new LocalPlayer().init(newgame,rc.gameview)
    if(rc.gameview){
        var game=newgame
        rc.gameview.init(game,'hasInited')
    }
    var stepfunc=function(cb){
        newgame.lock=1
        var func=function(){
            nowstep=newgame.history.length
            if(nowstep<step){
                newgame.lock=0
                newgame.putxy(rc.game.history[nowstep][0])
            } else {
                rc.player1.remove()
                rc.player2.remove()
                newgame.lock=1
                if(callback){
                    callback(newgame,rc.gameview)
                } else {
                    newgame.lock=0
                    player2 = new LocalPlayer().init(newgame,rc.gameview).bind(1)
                    player1 = new LocalPlayer().init(newgame,rc.gameview).bind(0)
                    newgame.firstStep()
                }
            }
        }
        if(time){
            setTimeout(func,time)
        } else {
            func()
        }
    }
    rc.player1.changeTurn=rc.player1.continueTurn=stepfunc
    rc.player2.changeTurn=rc.player2.continueTurn=stepfunc
    rc.player2.bind(1)
    rc.player1.bind(0)
    //newgame.firstStep()
    
    return newgame
}
//new ReplayController().init(gameview.game,gameview).replay('last',120,null).firstStep()