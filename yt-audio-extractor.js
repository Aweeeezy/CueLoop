var ytdl = require('youtube-dl');

/* This module will check if the given link is a valid YouTube link. If so,
 * then it saves the title of the video into a variable and then downloads the
 * mp3 of the video and executes the callback -- a function that creates a song
 * object to be pushed into the queue of the booth in question. */
module.exports = {
  getName: function (obj, callback) {
    var nameString = "";
    ytdl.getInfo(obj.link, function (err, info) {
      if (err) {
        console.log("App Log: There was an error getting info from the given link.");
        callback('', '', false);
      }
      nameString = info._filename.split('.webm')[0].split('-').slice(0, -1).join('-');
      callback(nameString, '', true);
    });
  },

  download: function (obj, callback) {
    var nameString = "";
    ytdl.getInfo(obj.link, function (err, info) {
      if (err) {
        console.log("App Log: There was an error getting info from the given link.");
        callback('', 'error');
      }
      nameString = info._filename.split('.webm')[0].split('-').slice(0, -1).join('-');

      var hasher = require('crypto').createHash('sha1');
      hasher.update(nameString+Date.now());
      var hash = hasher.digest('hex');

      ytdl.exec(obj.link,
        ['--no-playlist', '--extract-audio', '--audio-format', 'vorbis',
         '--audio-quality', '128k', '-o', __dirname+'/public/songs/'+obj.creator+
        '/'+nameString+hash+'.%(ext)s'], {}, function (err, output) {
        if (err) {
          console.log("App Log: There was an error downloading the song...");
          callback('', 'error');
        }
        console.log("App Log: Writing song file to "+__dirname+'/public/songs/'+obj.creator+'/'+nameString+hash+'.ogg');
        callback(hash, null);
      });
    });
  },

  getNameThenDownload: function (obj, callback) {
    var nameString = "";
    ytdl.getInfo(obj.link, function (err, info) {
      if (err) {
        console.log("App Log: There was an error getting info from the given link.");
        callback('', '', false);
      }
      nameString = info._filename.split('.webm')[0].split('-').slice(0, -1).join('-');

      var hasher = require('crypto').createHash('sha1');
      hasher.update(nameString+Date.now());
      var hash = hasher.digest('hex');

      ytdl.exec(obj.link,
        ['--no-playlist', '--extract-audio', '--audio-format', 'vorbis',
         '--audio-quality', '128k', '-o', __dirname+'/public/songs/'+obj.creator+
        '/'+nameString+hash+'.%(ext)s'], {}, function (err, output) {
        if (err) {
          console.log("App Log: There was an error downloading the song...\n"+err+"\n"+err.toString());
          callback('', '', false);
        }
        console.log("App Log: Writing song file to "+__dirname+'/public/songs/'+obj.creator+'/'+nameString+hash+'.ogg');
        callback(nameString, hash, true);
      });
    });
  }
}
