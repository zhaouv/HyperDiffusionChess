////////////////// GameData //////////////////
GameData=function(){
}

GameData.prototype.fromGame=function(game){
    this.game=game
    return this
}

GameData.prototype.putxy=function(xy){

}
////////////////// Functions for AIPlayer //////////////////

GameData.prototype.randomUntilEnd=function(step1){
    var game = new Game()
    this._game=game
    game.initPlayer()
    game.map=Array.from(this.game.map)
    game.model=this.game.model
    game.winnerId=null
    
    game.changeHistory=[]
    game.changeChess=[]
    game.changeScore=[]
    game.changePlayer=[]
    game.win=[]
    game.history=[]

    var choice=[];
    for(var ii=0;ii<game.map.length;ii++){
        if([game.BLANK,game.CRITICAL].indexOf(game.xy(ii))!==-1){
            choice.push(ii);
        }
    }
    game.changeChess.push((xy,oldValue,value)=>{
        if (value===game.CHESS || value===game.BAN) {
            choice.splice(choice.indexOf(xy), 1)
        }
    })
    if(step1!=null)game.putxy(step1)
    while (choice.length) {
        game.putxy(choice[~~(choice.length*Math.random())])
    }
    return game.winnerId // 0 means winner is self
    // a=new GameData().fromGame(gameview.game);console.log(a.randomUntilEnd());console.log(a._game.history.map(v=>v[0]))
}

GameData.prototype.randomWinRate=function(count,step1){
    if (count==null) {
        count=100
    }
    var lose=0
    for (var ii = 0; ii < count; ii++) {
        lose+=this.randomUntilEnd(step1)
    }
    return 1-lose/count
    // new GameData().fromGame(gameview.game).randomWinRate(500)
}

GameData.prototype.choiceByRandomWinRate=function(count){
    if (count==null) {
        count=100
    }
    var game=this.game
    var choice=[];
    for(var ii=0;ii<game.map.length;ii++){
        if([game.BLANK,game.CRITICAL].indexOf(game.xy(ii))!==-1){
            choice.push(ii);
        }
    }
    var rates = choice.map(ii=>this.randomWinRate(count,ii));
    var maxIndex = rates.indexOf(Math.max(...rates));
    this.choice=choice
    this.rates=rates
    console.log(rates[maxIndex])
    return choice[maxIndex]
    // new GameData().fromGame(gameview.game).choiceByRandomWinRate()
}
