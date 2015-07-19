var fs = require('fs');
var path = require('path');

function plugin() {
  var fn = function(style) {
    style.define('file_exists', function(url) {
      return fs.existsSync(path.resolve(__dirname, url.string));
    });
  };

  return fn;
}

module.exports = plugin;
