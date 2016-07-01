var child = require('child_process')

/* This module will check if the given link is a valid YouTube link. If so,
 * then it saves the title of the video into a variable and then downloads the
 * mp3 of the video and executes the callback -- a function that creates a song
 * object to be pushed into the queue of the booth in question. */
module.exports = {
  getName: function (obj, callback) {
    var name = child.spawn('youtube-dl', ['--get-title', obj.link]);
    var nameString = "";
    name.stdout.on('data', function (data) {
      nameString = data.toString().split("\n")[0].split(".ogg")[0];
    });
    name.stderr.on('data', function (data) {
      console.log("error with name: "+data.toString());
      callback("", "", false);
    });
    name.on('exit', function (code) {
      if (code == 0) {
        callback(nameString, "", true);
      }
    });
  },

  download: function (obj, callback) {
    var name = child.spawn('youtube-dl', ['--get-title', obj.link]);
    var nameString = "";
    name.stdout.on('data', function (data) {
      nameString = data.toString().split("\n")[0].split(".ogg")[0];
    });
    name.stderr.on('data', function (data) {
      console.log("error with name: "+data.toString());
      callback('', 'error');
    });
    name.on('exit', function (code) {
      if (code == 0) {
        var hasher = require('crypto').createHash('sha1');
        hasher.update(nameString+Date.now());
        var hash = hasher.digest('hex');
        var dl = child.spawn('youtube-dl', [
            '--no-playlist', '--extract-audio', '--audio-format', 'vorbis', '--audio-quality', '128k',
            obj.link, '-o', 'public/songs/'+obj.creator+'/'+nameString+hash+'.%(ext)s']);
        dl.stdout.on('data', function (data) {
          //console.log(data.toString());
        });
        dl.stderr.on('data', function (data) {
          console.log("error with downloading: "+data.tostring());
          callback('', 'error');
        });
        dl.on('exit', function (code) {
          callback(hash, null);
        });
      }
    });
  },

  getNameThenDownload: function (obj, callback) {
    var name = child.spawn('youtube-dl', ['--get-title', obj.link]);
    var nameString = "";
    name.stdout.on('data', function (data) {
      nameString = data.toString().split("\n")[0].split(".ogg")[0];
    });
    name.stderr.on('data', function (data) {
      console.log("error with name: "+data.toString());
      callback("", "", false);
    });
    name.on('exit', function (code) {
      if (code == 0) {
        var hasher = require('crypto').createHash('sha1');
        hasher.update(nameString+Date.now());
        var hash = hasher.digest('hex');
        var dl = child.spawn('youtube-dl', [
            '--no-playlist', '--extract-audio', '--audio-format', 'vorbis', '--audio-quality', '128k',
            obj.link, '-o', 'public/songs/'+obj.creator+'/'+nameString+hash+'.%(ext)s']);
        dl.stdout.on('data', function (data) {
          //console.log(data.toString());
        });
        dl.stderr.on('data', function (data) {
          console.log("error with downloading: "+data.tostring());
          callback("", "", false);
        });
        dl.on('exit', function (code) {
          callback(nameString, hash, true);
        });
      }
    });
  }
}
