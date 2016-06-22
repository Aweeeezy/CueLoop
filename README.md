Queue Loop
==============

A web app for conveniently distributing the blessing (or burden) of choosing the next song.
--------------

**Basic Usage**
* Click `Create booth` to show a window where you will choose a booth creator's
  name (must be unique) and whether or not you would like this booth to be
  publically visible via the `Find booth` button.
* As the creator, you will see a button `It's your turn to choose a song!`
  which will prompt you for a link to a YouTube video whose audio you'd like to
  queue into a playlist. As more DJ's join your booth, this button's visiblity
  will change after submitting a link and cycle through the other people using
  the playlist, giving each a turn to queue a song.
* As the creator, you will also see a button `Invite a DJ` which will prompt
  you to enter a space-delimited list of emails. The server will then send each
  user a link to your booth. Upon clicking this link, users will be prompted
  for their user name (must be unique to the DJ pool of this particular booth)
  and whether or not they want their device to play the audio of the queued
  songs.

*OR*

* Click `Find booth` to show a listing of all the active and publically visible
  booths that you may join.
* Click the row corresponding with the booth you want to join.
* You will be prompted for your user name (must be unique to the DJ pool of
  this particular booth) and whether or not you want your device to play the
  audio of the queued songs.
* When it is your turn to select a song (indicated to you by the presence of
  the `It's your turn to choose a song!` button and to all other users of the
  booth by your name being highlighted in the DJ pool), paste in a valid
  YouTube link and wait for your song to play in the queue.

*OR*

* Check your email for an invite link -- click it.
* The rest of your user flow will be like that of the previous use case after
  selecting a booth to join.

**Pending Fixes**
* Make current DJ/song be at the top of its container when scrollable.
* Hash song file names with a time-date stamp so that fs.unlink does not
  accidently delete a queued song file that is a duplicate of a song file already
  queued (would allow users to queue the same song multiple times).
* When user who wants to play audio locally joins a booth midway through a
  song, that user's audio tag should start with a start offset to match that of
  the booth creator's audio tag.
* Add logic so that songs are only downloaded when they are closely following
  the currently playing song (so that space usage is minimized on the server).
* Test for browser and device compatibility.

**Potential Implementation Changes**
* Swap the youtube-dl command-line tool usage for some kind of streaming
  alternative so songs are not actually downloaded -- this may also be
  necessary to resolve scalability issues.
