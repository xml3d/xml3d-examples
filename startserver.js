#! /usr/bin/env node

if (process.argv.length > 2 && process.argv[2] == '--help') {
  console.log('Usage: node ' + process.argv[1] + ' [PORT]');
  console.log(' PORT is by default 8080');
  process.exit(0);
}

var port = 8080;
if (process.argv.length > 2) {
  port = +process.argv[2];
}

var express;
try {
  var express = require('express');
} catch (err) {
  console.error("Please install express first: npm install express");
  console.error(err);
  process.exit(1);
}
var http = require('http');

var server = express();

server.configure(function() {
  server.set('port', port);
  server.use(express.favicon());
  server.use(express.logger('dev'));

  // CORS support
  server.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
  });

  // Serve index.html when root is specified '/'
  server.get('/', function(req, res) {
    res.sendfile('index.html')
  });

  server.use(server.router);
  server.use(express.directory(__dirname)); // serve directories
  server.use(express.static(__dirname)); // static content
});

server.configure('development', function(){
  server.use(express.errorHandler());
});

// Run server

http.createServer(server).listen(server.get('port'), function() {
  console.log("Xml3d server listening on http://localhost:" + server.get('port'));
});

// Local Variables:
// tab-width:2
// c-basic-offset: 2
// espresso-indent-level: 2
// indent-tabs-mode: nil
// End:
// vim: set expandtab tabstop=2 shiftwidth=2:
