window.onload = function () {
    var user = null;
    var booth = null;
    var findBooths = null;
    var socket = io();

    socket.connect("http://localhost:3001/socket.io.js");
    socket.on('boothCreated', function (obj) {
        booth = obj.booth;
        socket.emit('cueEvent', {'ytLink':null, 'user':user, 'booth':booth});
        document.getElementById('player-div').innerHTML = "<iframe id='player' width='200' height='200' frameborder='0' fs='0' modestbranding='0'></iframe>";
        generatePool(true);
    });

    socket.on('nameValid', function (obj) {
        validatedSubmitCreate(true, obj);
    });

    socket.on('nameTaken', function (obj) {
        alert("that name is already taken -- try a different one.");
        validatedSubmitCreate(false, obj);
    });

    socket.on('songCued', function (obj) {
        if (obj.booth.creator == booth.creator) {
            booth = obj.booth;
            if (!user) {
                user = booth.pool.nextUser;
            }
            if (user == booth.creator) {
                document.getElementById('player').src = "https://www.youtube.com/embed/"+obj.YouTubeID+"?rel=0&amp;autoplay=1";
            }
            cycleDJHighlight();
            generateCue(false, obj.replace);
            generateCueButton();
        }
    });

    socket.on('songError', function (obj) {
        alert("There was an error loading the song you chose -- make sure it is a working YouTube link.");
        generateCueButton();
    });

    socket.on('userJoined', function (obj) {
        if (obj.booth.creator == booth.creator) {
            document.getElementById('booth-list-container').style.display = "none";
            document.getElementById('booth-container').style.display = 'inline';
            document.getElementsByTagName('h2')[0].innerHTML = booth.creator+"'s Booth";
            booth = obj.booth;
            generatePool(obj.firstTime);
            if (obj.firstTime) {
                cycleDJHighlight();
                generateCue(obj.firstTime, false);
            }
        }
    });

    socket.on('userJoinError', function (obj) {
        alert("A user with that name has already joined this booth -- try a different name.");
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
        if (isValid) {
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
    }

    function submitFind() {
        socket.emit('findEvent', {});

        socket.on('generateList', function (obj) {
            var html = "";
            for (booth in obj.booths) {
                var creator = obj.booths[booth].booth.creator;
                html += "<tr id='creator-"+creator+"' class='boothLink' ><td class='left-cell'>"+creator+"</td><td class='right-cell'>"+obj.booths[booth].currentSong+"</td></tr>";
            }
            document.getElementById('list2').insertAdjacentHTML('beforeend', html);

            var liveBooths = document.getElementsByClassName('boothLink');
            for (var i=0; i<liveBooths.length; i++) {
                document.getElementById(liveBooths[i].id).onclick = function () {
                    booth = obj.booths[this.id.split('-')[1]].booth;
                    var newUser = prompt("Choose a name:","Anonymous");
                    socket.emit('poolUpdate', {'booth': booth, 'newUser': newUser});
                }
            }
        });

        document.getElementById('home-container').style.display = "none";
        document.getElementById('filter').style.display = "none";
        document.getElementById('booth-list-container').style.display = 'inline';
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
        if (firstTime) {
            var html = "";
            for (var i=booth.cue.length-1; i>=0; i--) {
                html += "<tr><td class='left-cell'>"+booth.cue[i].user+"</td><td class='right-cell'>"+booth.cue[i].song+"</td></tr>";
            }
            document.getElementById('cue2').insertAdjacentHTML('beforeend', html);
        } else {
            if (replace) {
                document.getElementById('cue2').innerHTML = "";
            }
            var html = "";
            var html = "<tr><td class='left-cell' class='track-listing'>"+booth.cue[0].user+"</td><td class='right-cell' class='track-listing'>"+booth.cue[0].song+"</td></tr>";
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
            document.getElementById('filter').style.display = "none";
        }
    }

    // On CREATE-BOOTH submission, sends user selections to server via socket,
    // hides OPTIONS-CONTAINER and displays BOOTH-CONTAINER
    document.getElementById('submit-create').onclick = function() { submitCreate(); return false; }
    document.getElementById('create-booth-options').addEventListener('keydown', function (e) {
        if (e.keyCode === 13) { submitCreate(); return false; }
    });

    document.getElementById('submit-cue').onclick = function () { submitCue(); }
    document.getElementById('link-container').addEventListener('keydown', function (e) {
        if (e.keyCode === 13) { submitCue(); return false; }
    });

    document.getElementById('submit-invite').onclick = function () {
        socket.emit('emailEvent', {});
    }
}
