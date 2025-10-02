var socketIO = require('socket.io');

var http = require('http');
/////////
const fs = require('fs')
const url = require('url')
const path = require('path')
const root = path.resolve('.');

console.log('Static root dir: ' + root);

const mainpost = function (request, response) {
    console.log(getTime()+'POST 200 ' + request.url);

    // request.setEncoding('utf-8')
    var postDataList = [];
    request.on("data", function (postDataChunk) {
        postDataList.push(postDataChunk);
    })
    request.on("end", function () {
        var body = postDataList.join('');
        var urlstr = request.url;
        if (urlstr === '/') {
            console.log(urlstr, body);
        }
        response.writeHead(200);
        response.end('no service this url');
    })
}
const mimeTypes = {
    "html": "text/html",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "svg": "image/svg+xml",
    "json": "application/json",
    "js": "text/javascript",
    "css": "text/css"
};
const mainget = function (request, response) {
    var pathname = url.parse(request.url).pathname;
    var filepath = path.join(root, pathname);
    if (filepath.endsWith('/') || filepath.endsWith('\\')) {
        filepath += 'index.html';
    }
    fs.stat(filepath, function (err, stats) {
        if (!err && stats.isFile()) {
            console.log(getTime()+'200 ' + request.url);
            var mimeType = mimeTypes[filepath.split('.').pop()];
            if (!mimeType) {
              mimeType = 'text/plain';
            }
            response.writeHead(200,{ "Content-Type": mimeType });
            fs.createReadStream(filepath).pipe(response);
        } else {
            console.log(getTime()+'404 ' + request.url);
            response.writeHead(404);
            response.end('404 Not Found');
            // fs.readFile(path.join(root, '404.html'), function(error, content) {
            //     response.writeHead(404, { 'Content-Type': 'text/html' });
            //     response.end(content, 'utf-8');
            // });
        }
    });
}
const server = http.createServer(function (request, response) {
    //POST
    if(request.method==='POST'){
        mainpost(request, response);
        return;
    }
    //GET
    if(request.method==='GET'){
        mainget(request, response);
        return;
    }
    response.writeHead(403);
    response.end('no service');
});
/////////
// var server = http.createServer();

var io = socketIO(server);

server.listen(13086, '0.0.0.0', function () {
    console.log(getTime()+'Starting server on port 13086');
});

var isset = function (t) {
    if (t == undefined || t == null || (typeof t == "number" && isNaN(t)))
        return false;
    return true;
}

var getTime = function() {
    var date = new Date();
    var setTwoDigits = function(x) {return parseInt(x)<10?("0"+x):x;}
    return "[" + 
    date.getFullYear()+"-"+setTwoDigits(date.getMonth()+1)+"-"+setTwoDigits(date.getDate())+" "
    +setTwoDigits(date.getHours())+":"+setTwoDigits(date.getMinutes())+":"+setTwoDigits(date.getSeconds())+
    "] "
}

// const towers = io.of('/hyperDiffusion');
const towers = io.of(/^\/.+$/);
towers.on('connection', function (socket) {
    const tower = socket.nsp;
    var printlog = (msg)=>console.log(tower.name.slice(1)+' '+msg);
    var wait = function (socket, board) { // board [playerId, ...]
        if (!isset(tower.adapter.rooms['waiting'])) {
            printlog(getTime()+'Waiting '+JSON.stringify(board)+' '+socket.id);
            socket.join('waiting');
            tower.adapter.rooms['waiting'].board=board
            return;
        }

        var room = tower.adapter.rooms['waiting'];

        if (room.length > 0) {
            var temp = tower.connected[Object.keys(room.sockets)[0]];

            var id = ~~(Math.random() * 2147483647) + 100;
            while (isset(tower.adapter.rooms[id]) && tower.adapter.rooms[id].length > 0) {
                id = ~~(Math.random() * 2147483647) + 100;
            }

            socket.join(id);
            temp.leave('waiting');
            temp.join(id);

            printlog(getTime()+'Match '+id+": "+temp.id+" with "+socket.id);

            board=room.board
            temp.emit('start', id, board);
            var board2=[1-board[0],...board.slice(1)];
            socket.emit('start', id, board2);
            printlog(getTime()+id+" start!");

            var curr = tower.adapter.rooms[id];
            
            curr.first = temp.id;
            curr.second = socket.id;
            curr.position = [];
            curr.board = board;

            return;
        }

        socket.join('waiting');
    }

    socket.on('join', function (id, board) { // board [xsize,ysize,playerId]
        if (id == 0) {
            wait(socket, board);
            return;
        }
        var room = tower.adapter.rooms[id];
        if (isset(room) && room.length >= 2) {
            // tower.in(socket.id).emit('error', '房间已满');
            printlog(getTime()+id+" visitor: "+socket.id);
            socket.join(id);
            tower.in(id).emit('msg', [2,0,"目前观战人数："+(room.length-2)]);
            board=room.board
            var board3=[-1,...board.slice(1)];
            socket.emit('start', id, board3);
            socket.emit('position', room.position);
            return;
        }
        var first = null;
        if (isset(room) && room.length == 1) {
            first = tower.connected[Object.keys(room.sockets)[0]];
        }
        socket.join(id);
        if (!isset(room)){
            tower.adapter.rooms[id].board=board
        }
        printlog(getTime()+id+" player: "+socket.id);
        if (isset(first)) {
            room = tower.adapter.rooms[id];
            board=room.board
            first.emit('start', id, board);
            var board2=[1-board[0],...board.slice(1)];
            socket.emit('start', id, board2);
            printlog(getTime()+id+" start!");
            room.first = first.id;
            room.second = socket.id;
            room.position = [];
        }
    });

    socket.on('ready', function (id, condition) { 
        var room = tower.adapter.rooms[id];
        if (!isset(room)) {
            tower.in(id).emit('error', '未知错误');
            return;
        }
        if (!isset(room.count)) room.count = 0;
        room.count++;
        printlog(getTime()+id+" ready: "+JSON.stringify(condition)+' '+socket.id);
        if (room.first==socket.id)room.condition=condition;
        if (room.count == 2) {
            delete room.count;
            room.position = [room.condition];
            tower.in(id).emit('ready', room.condition);
            tower.in(id).emit('position', room.position);
        }
    })

    socket.on('put', function (id, square) {
        printlog(getTime()+id+": "+square);
        tower.in(id).emit('put', square);

        var room = tower.adapter.rooms[id];
        if (!isset(room) || !isset(room.position)) return;
        room.position.push(square);
        tower.in(id).emit('position', room.position);
    })

    socket.on('msg', function (id, data) {
        printlog(getTime()+id+": "+data);
        tower.in(id).emit('msg', data);
    })

    socket.on('disconnecting', function () {
        Object.keys(socket.rooms).forEach(function (id) {
            // tower.in(id).emit('error', '对方断开了链接');
            var room = tower.adapter.rooms[id];
            if (id!=socket.id)
                printlog(getTime()+id+" disconnect: "+socket.id);
            if (isset(room) && isset(room.first) && isset(room.second)) {
                if (room.first==socket.id || room.second==socket.id) {
                    tower.in(id).emit('error', '对方断开了连接');
                    return;
                }
                tower.in(id).emit('msg', [2,0,"目前观战人数："+(tower.adapter.rooms[id].length-3)]);
                return;
            }
            tower.in(id).emit('error', '对方断开了连接');
        });
    })
});


