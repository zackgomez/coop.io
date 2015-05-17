var _ = require('underscore');
var path = require('path');
var express = require('express');
var browserify = require('connect-browserify');
var WebSocketServer = require('ws').Server;

var app = express();

var HTTP_PORT = 3500;
var WS_PORT = 3555;

var player_by_id = {};

app.get('/assets/bundle.js', browserify('./client', {
  debug: true,
  watch: true
}));
app
  .use('/assets', express.static(path.join(__dirname, 'assets')))
  .use('/', express.static(path.join(__dirname, '/')))
  .listen(HTTP_PORT, function() {
    console.log('Point your browser at http://localhost:'+HTTP_PORT);
  });

var wss = new WebSocketServer({ port: WS_PORT, path: '/game_state_socket'});
wss.on('connection', function(ws) {
  player_by_id
  ws.on('message', function(data, flags) {
    console.log('got data from socket:', data);
  });
});
