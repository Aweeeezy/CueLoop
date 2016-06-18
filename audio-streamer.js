var yt = require('./yt-audio-extractor')
  , fs = require('fs');

var readStream = fs.createReadStream('songs/The\ Meters\ -\ Cissy\ Strut.mp3');
//var readStream = fs.createReadStream('test.txt');
var writeStream = fs.createWriteStream('receivingStreamFile.mp3');

readStream.on('open', function () {
  readStream.pipe(writeStream);
});

readStream.on('end', function () {
  console.log('The stream has ended.');
});
