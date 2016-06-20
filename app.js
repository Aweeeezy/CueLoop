var express = require('express')
  , djApp = express()
  , server = djApp.listen(3001)
  , io = require('socket.io')(server)
  , mailer = require('nodemailer')
  , yt = require('./yt-audio-extractor')
  , fs = require('fs');

var clients = {};
var boothList = {};

function Booth(creator, openOrInvite, pool, cue) {
  this.creator = creator;
  this.openOrInvite = openOrInvite;
  this.pool = pool;
  this.cue = cue;
}

function Pool(creator) {
  return {'nextUser': creator, 'users': [creator]};
}

function Cue() {
  return {'list':[], 'index':0};
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

io.on('connection', function(socket) {
  var url = socket.request.headers.referer.split('/')[3].toLowerCase();
  clients[socket.id] = {'socket': socket, 'url': url};

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
    socket.emit('boothCreated', {'booth':booth, 'openOrInvite':obj.openOrInvite});
  });

  socket.on('emailEvent', function (obj) {
    var transporter = mailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'cueloopinvite@gmail.com',
        pass: 'e0X{sXIe)eeVfs,'
      }
    });

    var mailOptions = {
      from: 'no-reply@localhost:3001',
      to: obj.emails,
      subject: obj.creator+' invited you to DJ in their CueLoop booth!',
      text: 'Click the link to join:\nhttp://localhost:3001/'+obj.creator
    };

    transporter.sendMail(mailOptions, function(error, info){
      if(error){
        console.log(error);
      }else{
        console.log('Message sent: ' + info.response);
      };
    });
  });

  // Handler for generating a list of booths when user is finding a booth
  socket.on('findEvent', function(obj) {
    var booths = {};
    for (booth in boothList) {
      if (boothList[booth].openOrInvite) {
        if (boothList[booth].cue.list[boothList[booth].cue.index]) {
          booths[booth] = {'currentSong': boothList[booth].cue.list[boothList[booth].cue.index].song,
            'booth': boothList[booth]};
        } else {
          booths[booth] = {'currentSong': "Waiting for next song to be choosen...",
            'booth': boothList[booth]};
        }
      }
    }
    socket.emit('generateList', {'booths': booths});
  });

  socket.on('triggerUpdateBoothListing', function () {
    socket.broadcast.emit('updateBoothListing', {})
  });

  socket.on('deleteUser', function (obj) {
    if (obj.booth.pool.users.length == 1) {
      delete boothList[obj.booth.creator];
      socket.broadcast.emit('updateBoothListing', {})
      return;
    } else if (boothList[obj.booth.creator]) {
      var index = obj.booth.pool.users.indexOf(obj.user);
      if (index > -1) {
        boothList[obj.booth.creator].pool.users.splice(index, 1);
      } else {
        console.log("That user does not exit in this pool.");
      }
      if (obj.user == obj.booth.pool.nextUser) {
        var nextUser = nextDj(obj.booth.pool.users, obj.user);
        boothList[obj.booth.creator].pool.nextUser = nextUser;
      }
      socket.broadcast.emit('userDeleted', {'booth':boothList[obj.booth.creator]});
    }
  });

  socket.on('poolUpdate', function (obj) {
    var lowerCase = [];
    for(var i=0; i<obj.booth.pool.users.length; i++) {
      lowerCase.push(obj.booth.pool.users[i].toLowerCase());
    }
    if (lowerCase.indexOf(obj.newUser.toLowerCase()) >= 0) {
      socket.emit('userJoinError', {});
    } else {
      boothList[obj.booth.creator].pool.users.push(obj.newUser);
      socket.broadcast.emit('userJoined', {'booth': boothList[obj.booth.creator], 'firstTime': false, 'newUser': obj.newUser, 'buildPlayer': obj.buildPlayer});
      socket.emit('userJoined', {'booth': boothList[obj.booth.creator], 'firstTime': true, 'newUser': obj.newUser, 'buildPlayer': obj.buildPlayer});
    }
  });

  socket.on('cueEvent', function (obj) {
    if (obj.ytLink) {
      var id = obj.ytLink.split('&index')[0].split('&list')[0].split('=')[1];
      yt.downloader(id, cleanUp);
    } else {
      cleanUp("No song choosen yet...", true);
    }


    function cleanUp(songName, valid) {
      if (valid) {
        var songObj = {'user': obj.user, 'song': songName, 'id':id};
        var nextUser = nextDj(boothList[obj.booth.creator].pool.users, obj.user);
        boothList[obj.booth.creator].pool.nextUser = nextUser;
        if (boothList[obj.booth.creator].cue.list[0] && boothList[obj.booth.creator].cue.list[0].song == "No song choosen yet...") {
          boothList[obj.booth.creator].cue.list.pop();
          boothList[obj.booth.creator].cue.list.push(songObj);
          io.emit('songCued', {'booth':boothList[obj.booth.creator], 'song':songName, 'firstSong':true, 'nextUser':boothList[obj.booth.creator].pool.nextUser});
        } else {
          boothList[obj.booth.creator].cue.list.push(songObj);
          io.emit('songCued', {'booth':boothList[obj.booth.creator], 'firstSong':false, 'nextUser':boothList[obj.booth.creator].pool.nextUser});
          io.emit('continueCue', {});
        }
      } else {
        socket.emit('songError', obj.booth);
      }
    }
  });

  socket.on('getNextSong', function (obj) {
    var list = boothList[obj.boothName].cue.list;
    var index = boothList[obj.boothName].cue.index;
    if (list[index+1]) {
      boothList[obj.boothName].cue.index++;
      fs.unlink('public/'+obj.src, function () {});
      socket.emit('gotNextSong', {'booth':boothList[obj.boothName], 'nextSong':list[index+1].song});
    }
  });

  djApp.get('/*', function (req, res) {
    var path = req.path.split('/')[1].toLowerCase();
    for(booth in boothList) {
      var boothID = boothList[booth].creator.toLowerCase();
      if (path == boothID) {
        res.sendFile(__dirname+'/public/index.html', setTimeout(function () {
          for (c in clients) {
            if (clients[c].url && clients[c].url == path) {
              clients[c].socket.emit('redirectUser', {'booth': boothList[booth]});
            }
          }
        }, 500));
      }
    }
  });
});

djApp.use('/', express.static(__dirname+'/public'));
