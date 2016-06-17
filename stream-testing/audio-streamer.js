//var throttle = require('throttle')
 // , fs = require('fs')
  //, probe = require('node-ffprobe')
var extractor = require('./yt-audio-extractor');

extractor.downloader('https://www.youtube.com/watch?v=4_iC0MyIykM', function () {
    console.log('finished downloading song...');
});

/*probe(track, function (err, probeDate) {
  var bitRate = probeData.format.bit_rate;
  var stream = fs.createReadStream('track.mp3');
  var unthrottle = throttle.(stream, (bitRate/10) * 1.4); // some variable multiplier
  stream.on('data', function (data) {
    decoder.write(data);
  });
});*/
