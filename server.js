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

const hyperDiffusion = io.of('/hyperDiffusion');
hyperDiffusion.on('connection', function (socket) {
    var printlog = console.log;
    var wait = function (socket, data) { // data [xsize,ysize,playerId]
        if (!isset(hyperDiffusion.adapter.rooms['waiting'])) {
            printlog(getTime()+'Waiting '+JSON.stringify(data)+' '+socket.id);
            socket.join('waiting');
            hyperDiffusion.adapter.rooms['waiting'].data=data
            return;
        }

        var room = hyperDiffusion.adapter.rooms['waiting'];

        if (room.length > 0) {
            var temp = hyperDiffusion.connected[Object.keys(room.sockets)[0]];

            var rand = parseInt(Math.random() * 2147483647) + 100;
            while (isset(hyperDiffusion.adapter.rooms[rand]) && hyperDiffusion.adapter.rooms[rand].length > 0) {
                rand = parseInt(Math.random() * 2147483647) + 100;
            }

            socket.join(rand);
            temp.leave('waiting');
            temp.join(rand);

            printlog(getTime()+'Match '+rand+": "+temp.id+" with "+socket.id);

            data=room.data
            temp.emit('start', data, rand);
            var data2=[data[0],data[1],1-data[2]];
            socket.emit('start', data2, rand);
            printlog(getTime()+rand+" start!");

            var curr = hyperDiffusion.adapter.rooms[rand];
            
            curr.first = temp.id;
            curr.second = socket.id;
            curr.board = [];

            return;
        }

        socket.join('waiting');
    }

    socket.on('join', function (id, data) { // data [xsize,ysize,playerId]
        if (id == 0) {
            wait(socket, data);
            return;
        }
        var room = hyperDiffusion.adapter.rooms[id];
        if (isset(room) && room.length >= 2) {
            // hyperDiffusion.in(socket.id).emit('error', '房间已满');
            printlog(getTime()+id+" visitor: "+socket.id);
            socket.join(id);
            hyperDiffusion.in(id).emit('msg', ["目前观战人数："+(room.length-2), 2]);
            data=room.data
            var data3=[data[0],data[1],-1];
            socket.emit('start', data3, id, room.board);
            return;
        }
        var first = null;
        if (isset(room) && room.length == 1) {
            first = hyperDiffusion.connected[Object.keys(room.sockets)[0]];
        }
        socket.join(id);
        if (!isset(room)){
            hyperDiffusion.adapter.rooms[id].data=data
        }
        printlog(getTime()+id+" player: "+socket.id);
        if (isset(first)) {
            room = hyperDiffusion.adapter.rooms[id];
            data=room.data
            first.emit('start', data, id);
            var data2=[data[0],data[1],1-data[2]];
            socket.emit('start', data2, id);
            printlog(getTime()+id+" start!");
            room.first = first.id;
            room.second = socket.id;
            room.board = [];
        }
    });

    socket.on('ready', function (id, data) { // data [seed]
        var room = hyperDiffusion.adapter.rooms[id];
        if (!isset(room)) {
            hyperDiffusion.in(id).emit('error', '未知错误');
            return;
        }
        if (!isset(room.count)) room.count = 0;
        room.count++;
        printlog(getTime()+id+" ready: "+JSON.stringify(data)+' '+socket.id);
        if (room.count == 2) {
            delete room.count;
            hyperDiffusion.in(id).emit('ready');
            room.board = [];
            hyperDiffusion.in(id).emit('board', room.board);
        }
    })

    socket.on('put', function (id, data) {
        printlog(getTime()+id+": "+data);
        hyperDiffusion.in(id).emit('put', data);

        var room = hyperDiffusion.adapter.rooms[id];
        if (!isset(room) || !isset(room.board)) return;
        room.board.push(data);
        hyperDiffusion.in(id).emit('board', room.board);
    })

    socket.on('msg', function (id, data) {
        printlog(getTime()+id+": "+data);
        hyperDiffusion.in(id).emit('msg', data);
    })

    socket.on('disconnecting', function () {
        Object.keys(socket.rooms).forEach(function (id) {
            // hyperDiffusion.in(id).emit('error', '对方断开了链接');
            var room = hyperDiffusion.adapter.rooms[id];
            if (id!=socket.id)
                printlog(getTime()+id+" disconnect: "+socket.id);
            if (isset(room) && isset(room.first) && isset(room.second)) {
                if (room.first==socket.id || room.second==socket.id) {
                    hyperDiffusion.in(id).emit('error', '对方断开了连接');
                    return;
                }
                hyperDiffusion.in(id).emit('msg', ["目前观战人数："+(hyperDiffusion.adapter.rooms[id].length-3), 2]);
                return;
            }
            hyperDiffusion.in(id).emit('error', '对方断开了连接');
        });
    })
});


