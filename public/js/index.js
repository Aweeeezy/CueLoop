window.onload = function () {
    var user = null;
    var booth = null;
    var findBooths = null;

    // Shows FIND-BOOTH options before displaying BOOTH-LIST-CONTAINER
    document.getElementById('find-booth').onclick = function () {
        document.getElementById('options-container').style.display = "inline-block";
        document.getElementById('find-booth-options').style.display = "inline-block";
        document.getElementById('filter').style.display = "inline";
    }
    // Shows CREATE-BOOTH options before displaying BOOTH-CONTAINER
    document.getElementById('create-booth').onclick = function () {
        document.getElementById('options-container').style.display = "inline-block";
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
            document.getElementById('options-container').style.display = "none";
            document.getElementById('find-booth-options').style.display = "none";
            document.getElementById('create-booth-options').style.display = "none";
            document.getElementById('invite-container').style.display = "none";
            document.getElementById('link-container').style.display = "none";
            document.getElementById('filter').style.display = "none";
        }
    }

    var socket = io();
    socket.connect("http://localhost:3001/socket.io.js");
    socket.on('boothCreated', function (obj) {
        booth = obj.booth;
        socket.emit('cueEvent', {'ytLink':null, 'user':user, 'booth':booth});
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
            generateCue(false, obj.replace);
            if (!user) {
                user = obj.nextUser;
            }
            generateCueButton();
        }
    });

    socket.on('userJoined', function (obj) {
        if (obj.booth.creator == booth.creator) {
            booth = obj.booth;
            generatePool(obj.firstTime);
            if (obj.firstTime) {
                generateCue(obj.firstTime, false);
            }
        }
    });

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
                html += "<tr><td class='pool-dj'>"+booth.pool.users[i]+"</td></tr>";
            }
            document.getElementById('pool1').insertAdjacentHTML('beforeend', html);
        } else {
            var html = "<tr><td class='pool-dj'>"+booth.pool.users[booth.pool.users.length-1]+"</td></tr>";
            document.getElementById('pool1').insertAdjacentHTML('beforeend', html);
        }
    }

    function validatedSubmitCreate(isValid, obj) {
        if (isValid) {
            user = obj.creator;
            socket.emit('createEvent', obj);

            document.getElementById('home-container').style.display = "none";
            document.getElementById('options-container').style.display = "none";
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

    // On CREATE-BOOTH submission, sends user selections to server via socket,
    // hides OPTIONS-CONTAINER and displays BOOTH-CONTAINER
    document.getElementById('submit-create').onclick = function() {
        var listenMode = document.querySelector('input[name="listen"]:checked').value;
        var openOrInvite = document.querySelector('input[name="invite"]:checked').value;
        var creator = document.getElementById('booth-creator').value;

        function creatorIsValid(creator, callback) {
            if (creator == "") {
                alert("You must enter a name for the booth creator.");
                callback(false);
            } else {
                socket.emit('checkCreator', {'creator': creator,
                                             'options': {'listenMode': listenMode,
                                                         'openOrInvite': openOrInvite}});
            }
        }

        creatorIsValid(creator, validatedSubmitCreate);
    }

    // On FIND-BOOTH submission, sends user selection to server via socket,
    // hides OPTIONS-CONTAINER and displays BOOTH-LIST-CONTAINER
    document.getElementById('submit-find').onclick = function() {
        var activity = document.querySelector('input[name="active"]:checked').value;
        if (activity) {
            socket.emit('findEvent', {'activity': activity});

            socket.on('generateList', function (obj) {
                var html = "";
                for (booth in obj.booths) {
                    var creator = obj.booths[booth].booth.creator;
                    html += "<tr id="+creator+" class='boothLink' ><td class='left-cell'>"+creator+"</td><td class='right-cell'>"+obj.booths[booth].currentSong+"</td></tr>";
                }
                document.getElementById('list2').insertAdjacentHTML('beforeend', html);

                var liveBooths = document.getElementsByClassName('boothLink');
                for (var i=0; i<liveBooths.length; i++) {
                    document.getElementById(liveBooths[i].id).onclick = function () {
                        booth = obj.booths[this.id].booth;
                        var newUser = prompt("Choose a name:","Anonymous");
                        socket.emit('poolUpdate', {'booth': booth, 'newUser': newUser});
                        document.getElementById('booth-list-container').style.display = "none";
                        document.getElementById('booth-container').style.display = 'inline';
                        document.getElementsByTagName('h2')[0].innerHTML = booth.creator+"'s Booth";
                    }
                }
            });

            document.getElementById('home-container').style.display = "none";
            document.getElementById('options-container').style.display = "none";
            document.getElementById('filter').style.display = "none";
            document.getElementById('booth-list-container').style.display = 'inline';
        }
    }

    document.getElementById('submit-cue').onclick = function () {
        var link = document.getElementById('linkInput').value;
        if (link) {
            socket.emit('cueEvent', {'ytLink':link, 'user':user, 'booth':booth});
        } else {
            alert("First paste a YouTube link to the song you want to cue.");
        }

        document.getElementById('link-container').style.display = 'none';
        document.getElementById('cue-button-row').innerHTML = "";

    }

    document.getElementById('submit-invite').onclick = function () {
        socket.emit('emailEvent', {});
    }
}
