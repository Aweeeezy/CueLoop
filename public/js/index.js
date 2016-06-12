window.onload = function () {
  window.booth = null;
  var user = null;
  var findBooths = null;
  var joining = null;
  var socket = io();

  window.onbeforeunload = function (event) {
    var index = booth.pool.users.indexOf(user);
    if (user) {
      socket.emit('deleteUser', {'booth':booth, 'user':user});
    }
  }

  socket.connect("http://localhost:3001/socket.io.js");

  socket.on('nameValid', function (obj) {
    validatedSubmitCreate(true, obj);
  });

  socket.on('nameTaken', function (obj) {
    alert("that name is already taken -- try a different one.");
  });

  socket.on('boothCreated', function (obj) {
    booth = obj.booth;
    socket.emit('cueEvent', {'ytLink':null, 'user':user, 'booth':booth});
    if (obj.openOrInvite) {
      socket.emit('triggerUpdateBoothListing', {});
    }
    generatePool(true);

    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  });

  socket.on('updateBoothListing', function (obj) {
    if (document.getElementById('booth-list-container').style.display == "inline") {
      document.getElementById('no-booths').style.display = "none";
      document.getElementById('booth-list').style.display = "inline";
      document.getElementById('booths').style.display = "inline";
      submitFind();
    }
  });

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

  socket.on('userJoined', function (obj) {
    if (!user && joining) {
      joining = false;
      booth = obj.booth;
      user = obj.newUser;
      if (obj.buildPlayer) {
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
      document.getElementById('new-user-prompt').style.display = "none";
      document.getElementById('filter').style.display = "none";
    }
    if (obj.booth.creator == booth.creator) {
      booth = obj.booth;
      generatePool(obj.firstTime);
      if (obj.firstTime) {
        cycleDJHighlight();
        generateCue(obj.firstTime, false);
      }
      document.getElementById('booth-list-container').style.display = "none";
      document.getElementById('booth-container').style.display = 'inline';
      document.getElementsByTagName('h2')[0].innerHTML = booth.creator+"'s Booth";
    }
  });

  socket.on('userJoinError', function (obj) {
    alert("A user with that name has already joined this booth -- try a different name.");
  });

  socket.on('userDeleted', function (obj) {
    if (booth.creator == obj.booth.creator) {
      booth = obj.booth;
      generatePool(true);
      cycleDJHighlight();
      generateCueButton();
    }
  });

  socket.on('songCued', function (obj) {
    if (obj.booth.creator == booth.creator) {
      booth = obj.booth;
      cycleDJHighlight();
      generateCue(false, obj.replace);
      generateCueButton();

      if (obj.replace) {
        player.loadVideoById(booth.cue.list[0].id);
      }
    }
  });

  socket.on('songError', function (obj) {
    alert("There was an error loading the song you chose -- make sure it is a working YouTube link.");
    generateCueButton();
  });

  function submitCreate() {
    var openOrInvite = document.querySelector('input[name="invite"]:checked').value;
    var creator = document.getElementById('booth-creator').value;

    function creatorIsValid(creator, callback) {
      if (creator == "") {
        alert("You must enter a name for the booth creator.");
        callback(false);
      } else {
        socket.emit('checkCreator', {'creator': creator,
          'openOrInvite': openOrInvite});
      }
    }
    creatorIsValid(creator, validatedSubmitCreate);
  }

  function validatedSubmitCreate(isValid, obj) {
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
  }

  function submitFind() {
    socket.emit('findEvent', {});

    document.getElementById('home-container').style.display = "none";
    document.getElementById('filter').style.display = "none";
    document.getElementById('booth-list-container').style.display = 'inline';
  }

  function submitNewUser(obj) {
    var newUser = document.getElementById('new-user').value;
    var buildPlayer = document.querySelector('input[name="player"]:checked').value;
    if (newUser) {
      joining = true;
      socket.emit('poolUpdate', {'booth': obj.booth, 'newUser': newUser, 'buildPlayer': buildPlayer});
    } else {
      alert("You must enter a username.");
      document.getElementById('submit-new-user').removeAttribute("onclick");
      document.getElementById('new-user-prompt').removeAttribute("onkeydown");
    }
  }

  function submitInvite() {
    document.getElementById('invite-container').style.display = "none";
    var emails = document.getElementById('emailList').value.split(' ');
    socket.emit('emailEvent', {'emails':emails, 'creator':booth.creator});
  }

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

  function generateCue(firstTime, replace) {
    var cueEnd = booth.cue.list.length-1;
    if (firstTime) {
      var html = "";
      for (var i=0; i<=cueEnd; i++) {
        html += "<tr><td class='left-cell'>"+booth.cue.list[i].user+"</td><td class='right-cell'>"+booth.cue.list[i].song+"</td></tr>";
      }
      document.getElementById('cue2').insertAdjacentHTML('beforeend', html);
    } else {
      if (replace) {
        document.getElementById('cue2').innerHTML = "";
      }
      var html = "";
      var html = "<tr><td class='left-cell' class='track-listing'>"+booth.cue.list[cueEnd].user+"</td><td class='right-cell' class='track-listing'>"+booth.cue.list[cueEnd].song+"</td></tr>";
      document.getElementById('cue2').insertAdjacentHTML('beforeend', html);
    }
  }

  function generateCueButton() {
    if (user == booth.pool.nextUser) {
      var html = "<td class='button-cell'><button id='cue-button' type='button'>It's your turn to choose a song!</button></td>";
      document.getElementById('cue-button-row').innerHTML = html;
      document.getElementById('cue-button').onclick = function () {
        document.getElementById('link-container').style.display = 'inline';
        document.getElementById('linkInput').value = "";
      }
    }
  }

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

  function submitCue() {
    var link = document.getElementById('linkInput').value;
    if (link) {
      socket.emit('cueEvent', {'ytLink':link, 'user':user, 'booth':booth});
      document.getElementById('cue-button-row').innerHTML = "";
    } else {
      alert("First paste a YouTube link to the song you want to cue.");
    }
    document.getElementById('link-container').style.display = 'none';
  }

  // On FIND-BOOTH submission, sends user selection to server via socket,
  // hides OPTIONS-CONTAINER and displays BOOTH-LIST-CONTAINER
  document.getElementById('find-booth').onclick = function() { submitFind(); }


  // Shows CREATE-BOOTH options before displaying BOOTH-CONTAINER
  document.getElementById('create-booth').onclick = function () {
    document.getElementById('create-booth-options').style.display = "inline-block";
    document.getElementById('filter').style.display = "inline";
  }

  // Maps an `onclick` event to a close button in each *-BOOTH options
  // to uncheck all options that may have been checked
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

  // On CREATE-BOOTH submission, sends user selections to server via socket,
  // hides OPTIONS-CONTAINER and displays BOOTH-CONTAINER
  document.getElementById('submit-create').onclick = function() { submitCreate(); }
  document.getElementById('create-booth-options').onkeydown = function (e) {
    if (e.keyCode === 13) { submitCreate(); }
  }

  document.getElementById('submit-cue').onclick = function () { submitCue(); }
  document.getElementById('link-container').onkeydown = function (e) {
    if (e.keyCode === 13) { submitCue(); }
  }

  document.getElementById('submit-invite').onclick = function () { submitInvite(); }
  document.getElementById('invite-container').onkeydown = function (e) {
    if (e.keyCode === 13) { submitInvite(); }
  }
}
