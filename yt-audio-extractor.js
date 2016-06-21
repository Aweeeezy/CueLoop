var child = require('child_process');

/* This module will check if the given link is a valid YouTube link. If so,
 * then it saves the title of the video into a variable and then downloads the
 * mp3 of the video and executes the callback -- a function that creates a song
 * object to be pushed into the cue of the booth in question. */
module.exports = {
    downloader: function(link, booth, callback) {
        var name = child.spawn('youtube-dl', ['--get-title', link]);
        var nameString = "";
        name.stdout.on('data', function (data) {
            nameString = data.toString().split("\n")[0].split(".mp3")[0];
        });
        name.stderr.on('data', function (data) {
            callback("", false);
        });
        name.on('exit', function (code) {
            if (code == 0) {
                var dl = child.spawn('youtube-dl', ['--no-playlist','--extract-audio',
                                                    '--audio-format', 'mp3',
                                                    '--audio-quality', '128k',
                                                    link, '-o', 'public/songs/' +
                                                    booth.creator
                                                    + '/%(title)s.%(ext)s']);
                dl.stdout.on('data', function (data) {
                    console.log(data.toString()); });
                dl.stderr.on('data', function (data) {
                    console.log(data.toString());
                });
                dl.on('exit', function (code) {
                    callback(nameString, true);
                });
            }
        });
    }
}
