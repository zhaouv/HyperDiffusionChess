G2PNetworkPlayer=function(){
    GamePlayer.call(this)
    return this
}
G2PNetworkPlayer.prototype = Object.create(GamePlayer.prototype)
G2PNetworkPlayer.prototype.constructor = G2PNetworkPlayer

G2PNetworkPlayer.prototype.changeTurn=function(callback){this.game.lock=1}
G2PNetworkPlayer.prototype.continueTurn=function(callback){this.game.lock=1}

G2PNetworkPlayer.prototype.init=function(game,gameview){
    this.game=game
    this.gameview=gameview
    return this
}
G2PNetworkPlayer.prototype.bind=function(playerId,callback){
    new GamePlayer().bind.call(this,playerId,callback)
    this.game.lock=1
    var thisplayer = this
    thisplayer.emitPut=function(xy){
        if(thisplayer.game.playerId===thisplayer.playerId)return;
        thisplayer.socket.emit('put', thisplayer.room, [thisplayer.playerId,xy]);
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

            thisplayer.socket.emit('ready', thisplayer.room, [thisplayer.playerId])
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
G2PNetworkPlayer.prototype.remove=function(){
    new GamePlayer().remove.call(this)
    var index = this.game.changeHistory.indexOf(this.emitPut)
    this.game.changeHistory.splice(index,1)
    this.emitPut=null
    var index = this.game.win.indexOf(this.restart)
    this.game.win.splice(index,1)
    this.restart=null
    this.socket.close()
}

G2PNetworkPlayer.prototype.queryRoom=function(){
    // getinput -> room, 0 for rand match
    this.room=0
}
G2PNetworkPlayer.prototype.printtip=function(tip){
    console.log(tip)
    if(this.gameview&&this.gameview.gametip){
        this.gameview.printtip(tip)
    }
}

G2PNetworkPlayer.prototype.initSocket=function(){
    var urlstr=':13086/hyperDiffusion'
    // http://pencilonline.top/index.html?url=https://h5mota.com:13086/hyperDiffusion
    if(this.gameview && this.gameview.urlstr)urlstr=this.gameview.urlstr;
    var socket = io(urlstr)
    this.socket=socket
    var thisplayer = this
    var printtip = thisplayer.printtip
    var updateBoard = function(position){
        if(!Array.isArray(position))return;
        var board=position.slice(1).map(v=>[v[1],v[0]])
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
    socket.on('start', function(room, data) { // data [playerId, ...]
        if(data[0]==-1){
            thisplayer.playerId=-1
            thisplayer.game.setSize(data[1],data[2])
        }
        thisplayer.room=room
        printtip("已分配到 "+room+"。")
        if (data[0]>=0) {
            setTimeout(function(){
                //重置游戏
                var newgame = new Game().init(data[1],data[2])
                if(thisplayer.gameview){
                    var game=newgame
                    thisplayer.gameview.init(game,'hasInited')
                }
                var p1=thisplayer.game.player[0].pointer
                var p2=thisplayer.game.player[1].pointer
                if(data[0]!==thisplayer.playerId){ //交换先后手
                    p1.init(newgame,thisplayer.gameview).bind(1)
                    p2.init(newgame,thisplayer.gameview).bind(0)
                } else {
                    p1.init(newgame,thisplayer.gameview).bind(0)
                    p2.init(newgame,thisplayer.gameview).bind(1)
                }
                
                printtip("连接中！\n你当前"+(data[0]==1?"先手":"后手")+"。")
                thisplayer.socket.emit('ready', thisplayer.room, [thisplayer.playerId])
            },1000)
        }
    })

    socket.on('ready', function(position) {
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
        if (data[0]!=thisplayer.playerId && thisplayer.playerId>=0) {
            put_down(data[1], data[2])
        }
    })

    socket.on('msg', function (data) {
        if(data[1]==1){
            printtip("本局游戏被约定结束");
            thisplayer.restart();
            return
        }
        if (data[0]<0 || data[0]!=thisplayer.playerId) { //-1游客 0先手 1后手 2系统
            printtip((data[0]>=0?"对方消息：":data[0]==2?"":"游客消息：")+data[2]);
        }
    })

    socket.on('position', function (position) {
        if (thisplayer.playerId==-1) {
            updateBoard(position);
        }
    })
}
G2PNetworkPlayer.prototype.connect=function(){
    this.socket.emit('join', this.room, [this.playerId, this.game.xsize, this.game.ysize]); // getinput -> room, 0 for rand match
    var printtip = this.printtip
    printtip("正在等待其他玩家加入，请稍后...")
}
G2PNetworkPlayer.prototype.ready=function(){
    this.game.player[0].changeTurn()
}