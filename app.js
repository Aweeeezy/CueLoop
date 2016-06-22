var express = require('express')
  , djApp = express()
  , server = djApp.listen(3001)
  , io = require('socket.io')(server)
  , mailer = require('nodemailer')
  , yt = require('./yt-audio-extractor')
  , fs = require('fs')
  , rimraf = require('rimraf')
  , hasher = require('crypto').createHash('sha1');

var clients = {};      // Stores the ID and request URL for each connecting client
var hashes = [];       // Stores unique identifiers for email invited DJs
var boothList = {};    // Stores the booth objects

function Booth(creator, openOrInvite, pool, queue) {
  this.creator = creator;
  this.openOrInvite = openOrInvite;
  this.pool = pool;
  this.queue = queue;
}

function Pool(creator) {
  return {'nextUser': creator, 'users': [creator]};
}

function Queue() {
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
  console.log('appending socket with url: |'+url+'| to the clients array');

  // Handler for validating a new booth creator's name.
  socket.on('checkCreator', function(obj) {
    if (obj.creator in boothList) {
      socket.emit('checkedBoothName', obj);
    } else {
      obj.valid = 'true';
      socket.emit('checkedBoothName', obj);
    }
  });

  // Handler for creating a new booth after its creator has been validated.
  socket.on('createEvent', function(obj) {
    var queue = new Queue();
    var creator = obj.creator;
    var pool = new Pool(creator);
    var booth = new Booth(creator, obj.openOrInvite, pool, queue);
    boothList[creator] = booth;
    socket.emit('boothCreated', {'booth':booth, 'openOrInvite':obj.openOrInvite});
  });

  /* WARNING! The invite feature is presently deactivated for developer privacy
   * reasons -- you must put in your own user and pass for an email you want to
   * use for this feature. */
  // Handler for sending emails to invite people to a booth.
  socket.on('emailEvent', function (obj) {
    hasher.update(obj.creator+Date.now());
    var str = hasher.digest('hex');
    hashes.push(str);
    var transporter = mailer.createTransport({
      service: 'Gmail',
      auth: {
        user: '',
        pass: ''
      }
    });

    var mailOptions = {
      from: 'no-reply@localhost:3001',
      to: obj.emails,
      subject: obj.creator+' invited you to DJ in their Queue Loop booth!',
      text: 'Click the link to join:\nhttp://localhost:3001/'+obj.creator+'/'+str
    };

    transporter.sendMail(mailOptions, function(error, info){
      if(error){
        console.log(error);
      }else{
        console.log('Message sent: ' + info.response);
      };
    });
  });

  // Handler for generating a list of booths when a user is searching for one.
  socket.on('findEvent', function(obj) {
    var booths = {};
    for (booth in boothList) {
      if (boothList[booth].openOrInvite) {
        if (boothList[booth].queue.list[boothList[booth].queue.index]) {
          booths[booth] = {'currentSong': boothList[booth].queue.list[boothList[booth].queue.index].song,
            'booth': boothList[booth]};
        } else {
          booths[booth] = {'currentSong': "Waiting for next song to be choosen...",
            'booth': boothList[booth]};
        }
      }
    }
    socket.emit('generateList', {'booths': booths});
  });

  /* This handler notifies all clients who are viewing the booth listing page
   * that a new booth has been created so they may request an updated view. */
  socket.on('triggerUpdateBoothListing', function () {
    socket.broadcast.emit('updateBoothListing', {})
  });

  /* This handler checks if the user being deleted is the last user in the
   * booth. If they are, then delete the booth and all songs downloaded that
   * are associated with it -- otherwise, just remove the user from their booth
   * pool and notify all clients that a user has been deleted. */
  socket.on('deleteUser', function (obj) {
    if (obj.booth.pool.users.length == 1) {
      delete boothList[obj.booth.creator];
      rimraf(__dirname+'/public/songs/'+obj.booth.creator, function(error){});
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

  /* This handler validates that the joining user's name is unique to that
   * booth and then notifies all clients that a new user has joined. */
  socket.on('poolUpdate', function (obj) {
    var lowerCase = [];
    for(var i=0; i<obj.booth.pool.users.length; i++) {
      lowerCase.push(obj.booth.pool.users[i].toLowerCase());
    }
    if (lowerCase.indexOf(obj.newUser.toLowerCase()) > -1) {
      socket.emit('userJoinError', {});
    } else {
      boothList[obj.booth.creator].pool.users.push(obj.newUser);
      socket.broadcast.emit('userJoined', {'booth': boothList[obj.booth.creator], 'firstTime': false, 'newUser': obj.newUser, 'buildPlayer': obj.buildPlayer});
      socket.emit('userJoined', {'booth': boothList[obj.booth.creator], 'firstTime': true, 'newUser': obj.newUser, 'buildPlayer': obj.buildPlayer});
    }
  });

  /* This handler downloads the mp3 of the YouTube video linked and creates a
   * song object to push into this booth's queue, then notifies all clients that
   * a new song was queued. If the context for this handler is the initialization
   * of a new booth, then put a default string into the queue. The `continueQueue`
   * event is used to tell clients to request the next song incase the audio tag
   * has already issued the `onended` event while there was no song to queue. */
  socket.on('queueEvent', function (obj) {
    if (obj.ytLink) {
      var id = obj.ytLink.split('&index')[0].split('&list')[0].split('=')[1];
      yt.downloader(id, boothList[obj.booth.creator], cleanUp);
    } else {
      cleanUp("No song choosen yet...", true);
    }

    function cleanUp(songName, valid) {
      if (valid) {
        var songObj = {'user': obj.user, 'song': songName, 'id':id};
        var nextUser = nextDj(boothList[obj.booth.creator].pool.users, obj.user);
        boothList[obj.booth.creator].pool.nextUser = nextUser;
        if (boothList[obj.booth.creator].queue.list[0] && boothList[obj.booth.creator].queue.list[0].song == "No song choosen yet...") {
          boothList[obj.booth.creator].queue.list.pop();
          boothList[obj.booth.creator].queue.list.push(songObj);
          io.emit('songQueued', {'booth':boothList[obj.booth.creator], 'song':songName, 'firstSong':true, 'nextUser':boothList[obj.booth.creator].pool.nextUser});
        } else {
          boothList[obj.booth.creator].queue.list.push(songObj);
          io.emit('songQueued', {'booth':boothList[obj.booth.creator], 'firstSong':false, 'nextUser':boothList[obj.booth.creator].pool.nextUser});
          io.emit('continueQueue', {});
        }
      } else {
        socket.emit('songError', obj.booth);
      }
    }
  });

  /* When a client's audio tag issues an `onended` event and if there is
   * another song in the queue, delete the mp3 of the previous song and signal
   * all the clients with the source path to the next song. */
  socket.on('getNextSong', function (obj) {
    var list = boothList[obj.boothName].queue.list;
    var index = boothList[obj.boothName].queue.index;
    if (list[index+1]) {
      boothList[obj.boothName].queue.index++;
      fs.unlink('public/'+obj.src, function () {});
      io.emit('gotNextSong', {'booth':boothList[obj.boothName], 'nextSong':list[index+1].song});
    }
  });

  /* This route redirects users who are invited to a booth so that they may
   * select their user name and then join that booth. */
  djApp.get('/:creator/:hash', function (req, res, next) {
    var path = req.params.creator.toLowerCase();
    for(booth in boothList) {
      if (path == boothList[booth].creator.toLowerCase()) {
        var hash = req.params.hash;
        if (hashes.indexOf(hash) > -1) {
          res.sendFile(__dirname+'/public/index.html', setTimeout(function () {
            for (c in clients) {
              console.log('path is ' + path + '\nclient url is ' + clients[c].url);
              if (clients[c].url && clients[c].url == path) {
                console.log('found the proper client socket...emitting redirectUser');
                clients[c].socket.emit('redirectUser', {'booth': boothList[booth]});
              }
            }
            hashes.splice(hashes.indexOf(hash), 1);
          }, 1000));
        } else {
          next();
        }
      } else {
        next();
      }
    }
  });
});

djApp.use('/', express.static(__dirname+'/public'));
