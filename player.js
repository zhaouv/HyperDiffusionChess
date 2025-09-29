////////////////// GamePlayer //////////////////
GamePlayer=function(){}

GamePlayer.prototype.bind=function(playerId,callback){
    this.playerId=playerId
    this.player=this.game.player[playerId]
    this.player.pointer=this
    var thisplayer=this
    this.player.changeTurn=function(callback){return thisplayer.changeTurn(callback)}
    this.player.continueTurn=function(callback){return thisplayer.continueTurn(callback)}
    //if(this.game.playerId===playerId && !this.game.lock)this.changeTurn(callback);
    return this
}
GamePlayer.prototype.remove=function(){
    var game=this.game
    this.player.changeTurn=function(callback){game.lock=0}
    this.player.continueTurn=function(callback){}
    this.player.pointer=null
    if(game.playerId===this.playerId)game.lock=0;
}
GamePlayer.prototype.init=function(game){
    this.game=game
    return this
}

GamePlayer.prototype.changeTurn=function(callback){
    //this.game.lock=1
    //计算
    this.game.lock=0
    //this.game.putxy(x,y)
}

GamePlayer.prototype.continueTurn=function(callback){
    //this.game.lock=1
    //计算
    this.game.lock=0
    //this.game.putxy(x,y)
}

////////////////// LocalPlayer //////////////////
LocalPlayer=function(){
    GamePlayer.call(this)
    return this
}
LocalPlayer.prototype = Object.create(GamePlayer.prototype)
LocalPlayer.prototype.constructor = LocalPlayer

LocalPlayer.prototype.changeTurn=function(callback){this.game.lock=0}
LocalPlayer.prototype.continueTurn=function(callback){this.game.lock=0}

////////////////// NetworkPlayer //////////////////
NetworkPlayer=function(){
    GamePlayer.call(this)
    return this
}
NetworkPlayer.prototype = Object.create(GamePlayer.prototype)
NetworkPlayer.prototype.constructor = NetworkPlayer

NetworkPlayer.prototype.changeTurn=function(callback){this.game.lock=1}
NetworkPlayer.prototype.continueTurn=function(callback){this.game.lock=1}

NetworkPlayer.prototype.init=function(game,gameview){
    this.game=game
    this.gameview=gameview
    return this
}
NetworkPlayer.prototype.bind=function(playerId,callback){
    new GamePlayer().bind.call(this,playerId,callback)
    this.game.lock=1
    var thisplayer = this
    thisplayer.emitPut=function(xy){
        if(thisplayer.game.playerId===thisplayer.playerId)return;
        thisplayer.socket.emit('put', thisplayer.room, [xy,thisplayer.playerId]);
    }
    thisplayer.restart=function(){
        //重置游戏并交换先后手
        setTimeout(function(){
            var newgame = new Game().init(thisplayer.game.xsize,thisplayer.game.ysize)
            if(thisplayer.gameview){
                var game=newgame
                thisplayer.gameview.init(game,'hasInited')
            }
            var p1=thisplayer.game.player[1].pointer
            var p2=thisplayer.game.player[0].pointer
            p2.init(newgame,thisplayer.gameview).bind(1)
            p1.init(newgame,thisplayer.gameview).bind(0)

            thisplayer.socket.emit('ready', thisplayer.room)
        },1000)
    }
    this.game.changeHistory.push(thisplayer.emitPut)
    if(this.gameview){
        while(this.game.win.length>2)this.game.win.pop();
    }
    this.game.win.push(thisplayer.restart)
    if(!this.room){
        this.queryRoom()
        this.initSocket()
        this.connect()
    }
    return this
}
NetworkPlayer.prototype.remove=function(){
    new GamePlayer().remove.call(this)
    var index = this.game.changeHistory.indexOf(this.emitPut)
    this.game.changeHistory.splice(index,1)
    this.emitPut=null
    var index = this.game.win.indexOf(this.restart)
    this.game.win.splice(index,1)
    this.restart=null
    this.socket.close()
}

NetworkPlayer.prototype.queryRoom=function(){
    // getinput -> room, 0 for rand match
    this.room=0
}
NetworkPlayer.prototype.printtip=function(tip){
    console.log(tip)
    if(this.gameview&&this.gameview.gametip){
        this.gameview.printtip(tip)
    }
}

NetworkPlayer.prototype.initSocket=function(){
    var urlstr=':13086/hyperDiffusion'
    // http://pencilonline.top/index.html?url=https://h5mota.com:13086/hyperDiffusion
    if(this.gameview && this.gameview.urlstr)urlstr=this.gameview.urlstr;
    var socket = io(urlstr)
    this.socket=socket
    var thisplayer = this
    var printtip = thisplayer.printtip
    var updateBoard = function(board){
        thisplayer.game.history=board
        if(thisplayer.gameview){
            game=new ReplayController().init(thisplayer.game,thisplayer.gameview).replay(null,0,function(newgame,gameview){
                newgame.lock=0
                var player1 = new LocalPlayer().init(newgame,gameview).bind(0)
                var player2 = new LocalPlayer().init(newgame,gameview).bind(1)
                newgame.win=[]
                newgame.firstStep()
            })
            game.win=[]
            game.firstStep()
        }
    }
    var endgame = function(){
        thisplayer.remove()
    }
    var put_down = function(xy, type){
        thisplayer.game.lock=0
        thisplayer.game.putxy(xy)
    }

    // start game
    socket.on('start', function(data, room, board) { // data [xsize,ysize,playerId]
        if(data[2]==-1){
            thisplayer.playerId=-1
            thisplayer.game.setSize(data[0],data[1])
        }
        thisplayer.room=room
        printtip("已分配到 "+room+"。")
        if (data[2]>=0) {
            setTimeout(function(){
                //重置游戏
                var newgame = new Game().init(data[0],data[1])
                if(thisplayer.gameview){
                    var game=newgame
                    thisplayer.gameview.init(game,'hasInited')
                }
                var p1=thisplayer.game.player[0].pointer
                var p2=thisplayer.game.player[1].pointer
                if(data[2]!==thisplayer.playerId){ //交换先后手
                    p1.init(newgame,thisplayer.gameview).bind(1)
                    p2.init(newgame,thisplayer.gameview).bind(0)
                } else {
                    p1.init(newgame,thisplayer.gameview).bind(0)
                    p2.init(newgame,thisplayer.gameview).bind(1)
                }
                
                printtip("连接中！\n你当前"+(data[2]==1?"先手":"后手")+"。")
                thisplayer.socket.emit('ready', thisplayer.room)
            },1000)
        } else {
            printtip("观战模式")
            updateBoard(board)
        }
    })

    socket.on('ready', function() {
        if (thisplayer.playerId>=0) {
            printtip("开始游戏！\n你当前"+(thisplayer.playerId==1?"先手":"后手")+"。")
            thisplayer.ready() //thisplayer.game.lock=thisplayer.playerId==1?0:1
        }
    })

    socket.on('error', function(reason) {
        printtip("\t[错误]"+(reason||"未知错误"))
        endgame()
    })

    socket.on('put', function(data) {
        if (data[1]!=thisplayer.playerId && thisplayer.playerId>=0) {
            put_down(data[0], data[1])
        }
    })

    socket.on('msg', function (data, room) {
        if (data[1]<0 || data[1]!=thisplayer.playerId) { //-1游客 0先手 1后手 2系统
            printtip((data[1]>=0?"对方消息：":data[1]==2?"":"游客消息：")+data[0]);
        }
    })

    socket.on('board', function (board) {
        if (thisplayer.playerId==-1) {
            updateBoard(board);
        }
    })
}
NetworkPlayer.prototype.connect=function(){
    this.socket.emit('join', this.room, [this.game.xsize, this.game.ysize, this.playerId]); // getinput -> room, 0 for rand match
    var printtip = this.printtip
    printtip("正在等待其他玩家加入，请稍后...")
}
NetworkPlayer.prototype.ready=function(){
    this.game.player[0].changeTurn()
}

////////////////// AIPlayer //////////////////
AIPlayer=function(){
    GamePlayer.call(this)
    return this
}
AIPlayer.prototype = Object.create(GamePlayer.prototype)
AIPlayer.prototype.constructor = AIPlayer

AIPlayer.prototype.init=function(game){
    this.game=game
    this.gameData=new GameData().fromGame(game)
    return this
}
AIPlayer.prototype.bind=function(playerId,callback){
    new GamePlayer().bind.call(this,playerId,callback)
    var thisplayer = this
    thisplayer.emitPut=function(xy){
        thisplayer.gameData.putxy(xy)
    }
    thisplayer.emitWin=function(){
    }
    this.game.changeHistory.push(thisplayer.emitPut)
    this.game.win.push(thisplayer.emitWin)
    return this
}
AIPlayer.prototype.remove=function(){
    new GamePlayer().remove.call(this)
    var index = this.game.changeHistory.indexOf(this.emitPut)
    this.game.changeHistory.splice(index,1)
    this.emitPut=null
    var index = this.game.changeHistory.indexOf(this.emitWin)
    this.game.win.splice(index,1)
    this.emitWin=null
}
AIPlayer.prototype.where=function(){
    var game=this.game
    var choice=[];
    for(var ii=game.map.length-1;ii>0;ii--){
        if([game.BLANK,game.CRITICAL].indexOf(game.xy(ii))!==-1){
            // return ii;
            choice.push(ii);
        }
    }
    return choice[~~(choice.length*Math.random())]
}
AIPlayer.prototype.changeTurn=function(){
    var thisplayer = this
    thisplayer.game.lock=1
    var where = this.where()
    setTimeout(function(){
        thisplayer.game.lock=0
        thisplayer.game.putxy(where)
    },250)
}
AIPlayer.prototype.continueTurn=function(){
    var thisplayer = this
    thisplayer.game.lock=1
    var where = this.where()
    setTimeout(function(){
        thisplayer.game.lock=0
        thisplayer.game.putxy(where)
    },500)
}

////////////////// GreedyRandomAI //////////////////
GreedyRandomAI=function(){
    AIPlayer.call(this)
    return this
}
GreedyRandomAI.prototype = Object.create(AIPlayer.prototype)
GreedyRandomAI.prototype.constructor = GreedyRandomAI

GreedyRandomAI.prototype.where=function(){
    var game=this.game
    var choice=[];
    for(var ii=game.map.length-1;ii>0;ii--){
        if([game.BLANK,game.CRITICAL].indexOf(game.xy(ii))!==-1){
            choice.push(ii);
            if(game.xy(ii)===game.CRITICAL)return ii;
        }
    }
    return choice[~~(choice.length*Math.random())]
}


////////////////// MCAI //////////////////
MCAI=function(){
    AIPlayer.call(this)
    return this
}
MCAI.prototype = Object.create(AIPlayer.prototype)
MCAI.prototype.constructor = MCAI
MCAI.prototype.where=function(){
    var game=this.game
    var choice=[];
    for(var ii=game.map.length-1;ii>0;ii--){
        if([game.BLANK,game.CRITICAL].indexOf(game.xy(ii))!==-1){
            choice.push(ii);
        }
    }
    if (choice.length>=40) {
        return choice[~~(choice.length*Math.random())]
    }
    if (choice.length>=20) {
        return this.gameData.choiceByRandomWinRate(12)
    }
    if (choice.length>=10) {
        return this.gameData.choiceByRandomWinRate(50)
    }
    return this.gameData.choiceByRandomWinRate(200)
}