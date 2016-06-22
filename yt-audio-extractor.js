var child = require('child_process')

/* This module will check if the given link is a valid YouTube link. If so,
 * then it saves the title of the video into a variable and then downloads the
 * mp3 of the video and executes the callback -- a function that creates a song
 * object to be pushed into the queue of the booth in question. */
module.exports = {
  downloader: function(link, booth, onlyName, onlyDownload, name, callback) {
    if (!onlyDownload) {
      var name = child.spawn('youtube-dl', ['--get-title', link]);
      var nameString = "";
      name.stdout.on('data', function (data) {
        nameString = data.toString().split("\n")[0].split(".ogg")[0];
        if (onlyName) {
          console.log("returning just the name");
          return nameString;
        }
      });
      name.stderr.on('data', function (data) {
        callback("", "", false);
      });
      name.on('exit', function (code) {
        if (code == 0 && !onlyName) {
          var hasher = require('crypto').createHash('sha1');
          hasher.update(nameString+Date.now());
          var hash = hasher.digest('hex');
          var dl = child.spawn('youtube-dl', [
              '--no-playlist', '--extract-audio', '--audio-format', 'vorbis', '--audio-quality', '128k',
              link, '-o', 'public/songs/'+booth.creator+'/'+nameString+hash+'.%(ext)s']);
          dl.stdout.on('data', function (data) {
            console.log(data.toString()); });
          dl.stderr.on('data', function (data) {
            console.log(data.toString());
          });
          dl.on('exit', function (code) {
            callback(nameString, hash, true);
          });
        }
      });
    } else {
      var hasher = require('crypto').createHash('sha1');
      hasher.update(name+Date.now());
      var hash = hasher.digest('hex');
      var dl = child.spawn('youtube-dl', [
          '--no-playlist', '--extract-audio', '--audio-format', 'vorbis', '--audio-quality', '128k',
          link, '-o', 'public/songs/'+booth.creator+'/'+name+hash+'.%(ext)s']);
      dl.stdout.on('data', function (data) {
        console.log(data.toString()); });
      dl.stderr.on('data', function (data) {
        console.log(data.toString());
      });
      dl.on('exit', function (code) {
        callback(name, hash, true);
      });
    }
  }
}
