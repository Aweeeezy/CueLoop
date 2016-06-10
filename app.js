var express = require('express')
  , djApp = express()
  , server = djApp.listen(3001)
  , io = require('socket.io')(server)
  , bars = require('handlebars')
  , mailer = require('nodemailer')
  , yt = require('./yt-audio-extractor')
  , fs = require('fs')
  , child = require('child_process');

var boothList = {};                                  // Map of all the booths in runtime
function Booth(creator, openOrInvite, pool, cue) {   // Creates a new booth obj
    this.creator = creator;                          // Person who created this booth
    this.openOrInvite = openOrInvite;                // Settings for listing the booth
    this.pool = pool;                                // List of people DJing this booth
    this.cue = cue;                                  // Cue of songObj: {user, songName}
}
function Pool(creator) {                             // Creates a new pool
    return {'nextUser': creator, 'users': [creator]};
}
function Cue() {                                     // Creates a new cue for audio player
    return [];
}

io.on('connection', function(socket) {
    // Handler for validating a new booth creator's name
    socket.on('checkCreator', function(obj) {
        if (obj.creator in boothList) {
            socket.emit('nameTaken', obj);
        } else {
            socket.emit('nameValid', obj);
        }
    });

    // Handler for creating a new booth after its creator has been validated
    socket.on('createEvent', function(obj) {
        var cue = new Cue();
        var creator = obj.creator;
        var pool = new Pool(creator);
        var booth = new Booth(creator, obj.openOrInvite, pool, cue);
        boothList[creator] = booth;
        socket.emit('boothCreated', {'booth':booth});
    });

    // Handler for generating a list of booths when user is finding a booth
    socket.on('findEvent', function(obj) {
        var booths = {};
        for (booth in boothList) {
            var cueEnd = boothList[booth].cue.length-1;
            if (boothList[booth].openOrInvite) {
                booths[booth] = {'currentSong': boothList[booth].cue[cueEnd].song,
                                 'booth': boothList[booth]};
            }
        }
        socket.emit('generateList', {'booths': booths});
    });

    socket.on('emailEvent', inviteDjs);
    socket.on('poolUpdate', function (obj) {
        var lowerCase = [];
        for(var i=0; i<obj.booth.pool.users.length; i++) {
            lowerCase.push(obj.booth.pool.users[i].toLowerCase());
        }
        if (lowerCase.indexOf(obj.newUser.toLowerCase()) >= 0) {
            socket.emit('userJoinError', {});
        } else {
            boothList[obj.booth.creator].pool.users.push(obj.newUser);
            socket.broadcast.emit('userJoined', {'booth':boothList[obj.booth.creator], 'firstTime':false, 'newUser': obj.newUser});
            socket.emit('userJoined', {'booth':boothList[obj.booth.creator], 'firstTime':true, 'newUser': obj.newUser});
        }
    });

    socket.on('cueEvent', function (obj) {
        if (obj.ytLink) {
            var link = obj.ytLink.split('&index')[0].split('&list')[0]; // Maybe not necessary
            var id = link.split('=')[1];
            yt.downloader(link, cleanUp);
        } else {
            cleanUp("No song choosen yet...", true);
        }


        function cleanUp(songName, valid) {
            if (valid) {
                var songObj = {'user': obj.user, 'song': songName};
                var nextUser = nextDj(boothList[obj.booth.creator].pool.users, obj.user);
                boothList[obj.booth.creator].pool.nextUser = nextUser;
                if (boothList[obj.booth.creator].cue[0] && boothList[obj.booth.creator].cue[0].song == "No song choosen yet...") {
                    boothList[obj.booth.creator].cue.pop();
                    boothList[obj.booth.creator].cue.unshift(songObj);
                    io.emit('songCued', {'booth':boothList[obj.booth.creator], 'replace':true, 'nextUser':boothList[obj.booth.creator].pool.nextUser, 'YouTubeID':id});
                } else {
                    boothList[obj.booth.creator].cue.unshift(songObj);
                    io.emit('songCued', {'booth':boothList[obj.booth.creator], 'replace':false, 'nextUser':boothList[obj.booth.creator].pool.nextUser, 'YouTubeID':id});
                }
            } else {
                socket.emit('songError', {});
            }
        }

        function nextDj (pool, currentDj) {
            for (var i=0; i<pool.length; i++) {
                if (pool[i] == currentDj && i+1 < pool.length) {
                    return pool[i+1];
                } else if (pool[i] == currentDj && i+1 >= pool.length) {
                    return pool[0];
                }
            }
        }
    });
});

function inviteDjs(obj) {
    var transporter = mailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'alex.richards006@gmail.com',
            pass: '1;e|vS@Jq,'
        }
    });

    var mailOptions = {
        from: 'no-reply@localhost:3001',
        to: '5714396289@txt.att.net',
        subject: 'Test Email',
        text: 'Pretty uh, prettttty cool.'
    };

    transporter.sendMail(mailOptions, function(error, info){
        if(error){
            console.log(error);
        }else{
            console.log('Message sent: ' + info.response);
        };
    });
}

djApp.use('/', express.static(__dirname+'/public'));
