window.onload = function () {
  var booth = null;           // Obj: booth this client belongs to.
  var user = null;            // String: user name of this client.
  var joining = null;         // Boolean: if this client is in the process of joining a booth.
  var audioPlayer = null;     // Boolean: if this client is to play audio locally.
  var playerEnded = null;     // Boolean: used for logic in queueing another song.
  var socket = io();

  var mobileUser = function() {
    var check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check = true})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
  }

  alert("mobileUser is "+mobileUser());

  socket.connect("http://localhost:3001/socket.io.js");

  /* Receives message from the server notifying this client whether or not the
   * booth name chosen is unique -- if it is, then create the booth. */
  socket.on('checkedBoothName', function (obj) {
    if (obj.valid) {
      user = obj.creator;
      socket.emit('createEvent', obj);
      document.getElementById('home-container').style.display = "none";
      document.getElementById('create-booth-options').style.display = "none";
      document.getElementById('filter').style.display = "none";
      document.getElementById('booth-container').style.display = 'inline';
      document.getElementsByTagName('h2')[0].innerHTML = obj.creator+"'s Booth";
      var inviteButtonHTML = "<td class='button-cell'><button id='invite-button' type='button'>Invite a DJ</button></td>";
      document.getElementById('invite-button-row').innerHTML = inviteButtonHTML;
      document.getElementById('invite-button').onclick = function () {
        document.getElementById('invite-container').style.display = "inline";
      }
    } else {
      alert("that name is already taken -- try a different one.");
    }
  });

  /* When the server creates a booth for this client, initialize the various
   * variables for this client and the view for the booth. */
  socket.on('boothCreated', function (obj) {
    booth = obj.booth;
    audioPlayer = true;
    socket.emit('queueEvent', {'ytLink':null, 'user':user, 'creator':booth.creator});
    if (obj.openOrInvite) {
      socket.emit('triggerUpdateBoothListing', {});
    }
    generatePool(true);
  });

  /* When a booth is created on the server and if this client is viewing the
   * booth listing, send a message to the server to get an updated listing. */
  socket.on('updateBoothListing', function (obj) {
    if (document.getElementById('booth-list-container').style.display == "inline") {
      document.getElementById('no-booths').style.display = "none";
      document.getElementById('booth-list').style.display = "inline";
      document.getElementById('booths').style.display = "inline";
      submitFind();
    }
  });

  /* Once the server responds to the request for an updated booth listing, this
   * handler generates it. If there are not any active booths, notify the user.
   * If there are booths, attach an onclick listener for each row which will
   * prompt the user for their desired name and whether or not they want to play
   * audio locally on their device -- then take them to the booth. */
  socket.on('generateList', function (obj) {
    var empty = Object.keys(obj.booths).length === 0 && obj.booths.constructor === Object;
    if (empty) {
      document.getElementById('booth-list').style.display = "none";
      document.getElementById('booths').style.display = "none";
      document.getElementById('no-booths').style.display = "inline";
    } else {
      var html = "";
      for (booth in obj.booths) {
        var creator = obj.booths[booth].booth.creator;
        html += "<tr id='creator-"+creator+"' class='boothLink' ><td class='left-cell'>"+creator+"</td><td class='right-cell'>"+obj.booths[booth].currentSong+"</td></tr>";
      }
      document.getElementById('list2').innerHTML = html;

      var liveBooths = document.getElementsByClassName('boothLink');
      for (var i=0; i<liveBooths.length; i++) {
        document.getElementById(liveBooths[i].id).onclick = function () {
          var id = this.id.split('-')[1];
          document.getElementById('filter').style.display = "inline";
          document.getElementById('new-user-prompt').style.display = "inline";
          document.getElementById('submit-new-user').onclick = function () {
            submitNewUser({'booth': obj.booths[id].booth});
          }
          document.getElementById('new-user-prompt').onkeydown = function (e) {
            if (e.keyCode === 13) { submitNewUser({'booth': obj.booths[id].booth}); }
          }
        }
      }
    }
  });

  /* This handler also prompts the user for their name and player setting, but
   * does so when a client invited by email is routed here from the server. */
  socket.on('redirectUser', function (obj) {
    document.getElementById('home-container').style.display = "none";
    document.getElementById('filter').style.display = "inline";
    document.getElementById('new-user-prompt').style.display = "inline";
    document.getElementById('booth-list-container').style.display = 'inline';
    document.getElementById('submit-new-user').onclick = function () {
      submitNewUser(obj);
    }
    document.getElementById('new-user-prompt').onkeydown = function (e) {
      if (e.keyCode === 13) { submitNewUser(obj); }
    }
  });

  // Test phase
  socket.on('queryCreatorOffset', function () {
    if (user == booth.creator) {
      var player = document.getElementsByTagName('audio')[0];
    }
  });

  /* When the server validates the joining user's name, initialize variables
   * for that new user -- also notify all other users of that booth so that
   * their view of the DJ pool can be regenerated. */
  socket.on('userJoined', function (obj) {
    if (!user && joining) {
      joining = false;
      booth = obj.booth;
      user = obj.newUser;
      if (obj.buildPlayer) {
        audioPlayer = true;
        document.getElementsByTagName('audio')[0].src =
          'songs/'+booth.creator+'/'+obj.song+obj.hash+'.ogg';
        document.getElementsByTagName('audio')[0].play();
      }
      document.getElementById('new-user-prompt').style.display = "none";
      document.getElementById('filter').style.display = "none";
    }
    if (obj.booth.creator == booth.creator) {
      booth = obj.booth;
      generatePool(obj.firstTime);
      if (obj.firstTime) {
        cycleDJHighlight();
        generateQueue(obj.firstTime, false);
      }
      document.getElementById('booth-list-container').style.display = "none";
      document.getElementById('booth-container').style.display = 'inline';
      document.getElementsByTagName('h2')[0].innerHTML = booth.creator+"'s Booth";
    }
  });

  /* Notify this client that the user name they desire has already been chosen
   * by another user in the same booth. */
  socket.on('userJoinError', function (obj) {
    alert("A user with that name has already joined this booth -- try a different name.");
  });

  /* When a user in this client's booth leaves, update their view of the DJ
   * booth to reflect this change. */
  socket.on('userDeleted', function (obj) {
    if (booth.creator == obj.booth.creator) {
      booth = obj.booth;
      generatePool(true);
      cycleDJHighlight();
      generateQueueButton();
    }
  });

  /* When the server successfully downloads a song for this client's booth,
   * update their view of the song queue to reflect this change. */
  socket.on('songQueued', function (obj) {
    if (obj.booth.creator == booth.creator) {
      booth = obj.booth;
      cycleDJHighlight();
      generateQueue(false, obj.firstSong);
      generateQueueButton();

      if (document.getElementById('pool2container').scrollHeight > document.getElementById('pool2container').clientHeight) {
        var djTop = document.getElementById('pool-'+booth.pool.nextUser).getBoundingClientRect().top;
        if (djTop > 700 || djTop < 198) {
          document.getElementById('pool2container').scrollTop = (53*(booth.pool.users.indexOf(booth.pool.nextUser)-3)).toString();
        }
      }

      if (obj.firstSong) {
        document.getElementById('song-1').style.backgroundColor = "#66ff66";
        if (audioPlayer) {
          document.getElementsByTagName('audio')[0].src =
            'songs/'+booth.creator+'/'+obj.song+obj.hash+'.ogg';
          document.getElementsByTagName('audio')[0].play();
        }
        if (booth.openOrInvite) {
          socket.emit('triggerUpdateBoothListing', {});
        }
      }
    }
  });

  /* Notify this client that the link they submitted for queueing is not a valid
   * YouTube link. */
  socket.on('songError', function () {
    alert("There was an error loading the song you chose -- make sure it is a working YouTube link.");
    generateQueueButton();
  });

  /* When the server has verified that the previous song has been deleted and
   * the next song has successfully downloaded, highlight the appropriate song
   * in the queue and, if this client has chosen to play audio locally, set this
   * client's audio tag source to the next song. */
  socket.on('gotNextSong', function (obj) {
    if (obj.booth.creator == booth.creator) {
      booth = obj.booth;
      document.getElementById('song-'+(booth.queue.index)).style.backgroundColor = "rgb(200,200,200)";
      document.getElementById('song-'+(booth.queue.index+1)).style.backgroundColor = "#66ff66";
      if (audioPlayer) {
        document.getElementsByTagName('audio')[0].src =
          'songs/'+booth.creator+'/'+obj.nextSong+obj.hash+'.ogg';
        document.getElementsByTagName('audio')[0].play();
        playerEnded = false;
      }
      if (booth.openOrInvite) {
        socket.emit('triggerUpdateBoothListing', {});
      }
      if (document.getElementById('queue2container').scrollHeight > document.getElementById('queue2container').clientHeight) {
        var song = document.getElementById('song-'+(booth.queue.index+1)).getBoundingClientRect().top;
        if (song > 700 || song < 198) {
          document.getElementById('queue2container').scrollTop = (53*(booth.queue.index-3)).toString();
        }
      }
    }
  });

  /* If the server's attempt to queue the next song when the previous song ended
   * failed (because there was no next song to play), this handler will
   * issue a reattempt signal to the server. */
  socket.on('continueQueue', function (obj) {
    if (audioPlayer && playerEnded) {
      playerEnded = false;
      obj.src = decodeURI(document.getElementsByTagName('audio')[0].src.split('/').slice(3).join('/'));
      obj.boothName = booth.creator;
      socket.emit('getNextSong', obj);
    }
  });

  /* This function checks if the user supplied a booth name before issuing a
   * signal to the server to validate the creator's chosen name. */
  function submitCreate() {
    var openOrInvite = document.querySelector('input[name="invite"]:checked').value;
    var creator = document.getElementById('booth-creator').value;
    if (creator) {
      socket.emit('checkCreator', {'creator': creator,
        'openOrInvite': openOrInvite});
    } else {
      alert("You must enter a name for the booth creator.");
    }
  }

  // Tells the server to generate a list of the active public booths.
  function submitFind() {
    socket.emit('findEvent', {});
    document.getElementById('home-container').style.display = "none";
    document.getElementById('filter').style.display = "none";
    document.getElementById('booth-list-container').style.display = 'inline';
  }

  /* This function sends a signal to the server for it to check if the joining
   * user has chosen a valid name. */
  function submitNewUser(obj) {
    var newUser = document.getElementById('new-user').value;
    var buildPlayer = document.querySelector('input[name="player"]:checked').value;
    if (newUser) {
      joining = true;
      socket.emit('poolUpdate', {'booth': obj.booth, 'newUser': newUser, 'buildPlayer': buildPlayer});
    } else {
      alert("You must enter a username.");
    }
  }

  /* This function grabs the list of space-delimited emails from the invite DJs
   * prompt and emails each of them a link to join this clients booth. */
  function submitInvite() {
    document.getElementById('invite-container').style.display = "none";
    var emails = document.getElementById('emailList').value.split(' ');
    socket.emit('emailEvent', {'emails':emails, 'creator':booth.creator});
  }

  /* This function grabs the submitted link and signals the server to validate
   * it and, if successful, download the associated ogg file. */
  function submitQueue() {
    var link = document.getElementById('linkInput').value;
    if (link) {
      socket.emit('queueEvent', {'ytLink':link, 'user':user, 'creator':booth.creator});
      document.getElementById('queue-button-row').innerHTML = "";
      document.getElementById('link-container').style.display = 'none';
    } else {
      alert("First paste a YouTube link to the song you want to queue.");
    }
  }

  /* Highlights the row of the DJ pool that corresponds with user whose turn it is
   * to select the next song. */
  function cycleDJHighlight() {
    var indexPrev = booth.pool.users.indexOf(booth.pool.nextUser)-1;
    if (indexPrev >= 0) {
      var prevUser = booth.pool.users[indexPrev];
    } else {
      var prevUser = booth.pool.users[booth.pool.users.length-1];
    }
    document.getElementById('pool-'+prevUser).style.backgroundColor = "rgb(200,200,200)";
    document.getElementById('pool-'+booth.pool.nextUser).style.backgroundColor = "#66ff66";
  }

  /* If this function is called in the context of generating the view of the
   * queue for a newly joined user, then create entire queue listing -- otherwise,
   * just append the most recently queued song to the listing. */
  function generateQueue(firstTime, replace) {
    var queueEnd = booth.queue.list.length-1;
    if (firstTime) {
      var html = "";
      for (var i=0; i<=queueEnd; i++) {
        html += "<tr><td class='left-cell'>"+booth.queue.list[i].user+"</td><td id='song-"+(i+1)+"' class='right-cell'>"+booth.queue.list[i].song+"</td></tr>";
      }
      document.getElementById('queue2').insertAdjacentHTML('beforeend', html);
      if (booth.queue.list[0].song != "No song choosen yet...") {
        document.getElementById('song-'+(booth.queue.index+1)).style.backgroundColor = "#66ff66";
      }
    } else {
      if (replace) {
        document.getElementById('queue2').innerHTML = "";
      }
      var html = "<tr><td class='left-cell' class='track-listing'>"+booth.queue.list[queueEnd].user+"</td><td id='song-"+booth.queue.list.length+"' class='right-cell' class='track-listing'>"+booth.queue.list[queueEnd].song+"</td></tr>";
      document.getElementById('queue2').insertAdjacentHTML('beforeend', html);
    }
  }

  /* If it is this client's turn to queue a song, then generate the queue button. */
  function generateQueueButton() {
    if (user == booth.pool.nextUser) {
      var html = "<td class='button-cell'><button id='queue-button' type='button'>It's your turn to choose a song!</button></td>";
      document.getElementById('queue-button-row').innerHTML = html;
      document.getElementById('queue-button').onclick = function () {
        document.getElementById('link-container').style.display = 'inline';
        document.getElementById('linkInput').value = "";
      }
    }
  }

  /* If this function is called in the context of generating the view of the
   * DJ pool for a newly joined user, then create entire DJ poool -- otherwise,
   * just append the most recently joined DJ to the pool. */
  function generatePool(firstTime) {
    if (firstTime) {
      document.getElementById('pool2').innerHTML = "";
      var html = "";
      for (var i=0; i<booth.pool.users.length; i++) {
        html += "<tr><td id='pool-"+booth.pool.users[i]+"' class='pool-dj'>"+booth.pool.users[i]+"</td></tr>";
      }
      document.getElementById('pool2').insertAdjacentHTML('beforeend', html);
    } else {
      var html = "<tr><td id='pool-"+booth.pool.users[booth.pool.users.length-1]+"' class='pool-dj'>"+booth.pool.users[booth.pool.users.length-1]+"</td></tr>";
      document.getElementById('pool2').insertAdjacentHTML('beforeend', html);
    }
  }

  /* When the currently playing song ends, signal the server to fetch the next
   * song in the queue. */
  document.getElementsByTagName('audio')[0].onended = function () {
    playerEnded = true;
    var src = document.getElementsByTagName('audio')[0].src;
    var srcString = decodeURI(src.split('/').slice(3).join('/'));
    socket.emit('getNextSong', {'src':srcString, 'boothName':booth.creator});
  }

  /* Triggers the submitFind function which signals the server to generate a
   * listing of the active public booths. */
  document.getElementById('find-booth').onclick = function() { submitFind(); }

  // Exposes to the client the options for creating a new booth.
  document.getElementById('create-booth').onclick = function () {
    document.getElementById('create-booth-options').style.display = "inline-block";
    document.getElementById('filter').style.display = "inline";
  }

  // Maps closing operation to all windows with close buttons.
  var closeButtons = document.getElementsByClassName('close-button');
  for (var i=0; i<closeButtons.length; i++) {
    closeButtons[i].onclick = function () {
      var radioButtons = document.getElementsByTagName('input');
      for (var j=0; j<radioButtons.length; j++)
        radioButtons[j].checked = false;
      document.getElementById('create-booth-options').style.display = "none";
      document.getElementById('invite-container').style.display = "none";
      document.getElementById('link-container').style.display = "none";
      document.getElementById('new-user-prompt').style.display = "none";
      document.getElementById('filter').style.display = "none";
    }
  }

  /* Triggers the submitCreate function which signals the server to create a new
   * booth. */
  document.getElementById('submit-create').onclick = function() { submitCreate(); }
  document.getElementById('create-booth-options').onkeydown = function (e) {
    if (e.keyCode === 13) { submitCreate(); }
  }

  /* Triggers the submitQueue function which signals the server download the
   * song to be queued. */
  document.getElementById('submit-queue').onclick = function () { submitQueue(); }
  document.getElementById('link-container').onkeydown = function (e) {
    if (e.keyCode === 13) { submitQueue(); }
  }

  /* Triggers the submitInvite function which invites people to this client's
   * DJ booth via email. */
  document.getElementById('submit-invite').onclick = function () { submitInvite(); }
  document.getElementById('invite-container').onkeydown = function (e) {
    if (e.keyCode === 13) { submitInvite(); }
  }
}
