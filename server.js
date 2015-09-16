var _ = require('lodash');
var path = require('path');
var express = require('express');
var browserify = require('connect-browserify');
var WebSocketServer = require('ws').Server;
var Immutable = require('immutable');

var Game = require('./Game');
var StatsTracker = require('./StatsTracker');

var app = express();

var HTTP_PORT = 3500;
var WS_PORT = 3555;

var game = null;
var game_loop_interval = null;

app.get('/assets/bundle.js', browserify('./client', {
  debug: true,
  watch: true,
}));
app
  .use('/assets', express.static(path.join(__dirname, 'assets')))
  .use('/', express.static(path.join(__dirname, '/')))
  .listen(HTTP_PORT, function() {
    console.log('Point your browser at http://localhost:'+HTTP_PORT);
  });

var wss = new WebSocketServer({ port: WS_PORT, path: '/socket'});
var next_connection_id = 1;
wss.on('connection', function(ws) {
  var connection_id = next_connection_id++;
  console.log('got connection', connection_id);
  ws.send(JSON.stringify({
    type: 'player_info',
    payload: {
      playerID: connection_id,
    },
  }));

  start_game_if_necessary();

  ws.send(JSON.stringify({
    type: 'map_info',
    payload: game.getMapInfo(),
  }));
  ws.send(JSON.stringify({
    type: 'start_time',
    payload: game.startTime,
  }));

  game.addPlayer(connection_id);

  ws.on('close', function() {
    console.log('closed connection', connection_id);
    game.removePlayer(connection_id);

    if (_.size(game.playerByID) === 0) {
      destroy_game();
    }
  });

  ws.on('message', function(data, flags) {
    var parsed_data = JSON.parse(data);
    if (parsed_data.type === 'input') {
      game && game.handleInputState(connection_id, parsed_data.payload);
    };
  });
});

function start_game_if_necessary() {
  if (game) { return; }

  console.log('starting new game');

  game = new Game();

  var TICK_RATE = 50;

  var stats_tracker = new StatsTracker(100);

  var lastUpdateTime = Date.now();
  var lastStatsPrintTime = 0;
  game_loop_interval = setInterval(function () {
    let now = Date.now();
    lastUpdateTime = now;
    game.update(1 / TICK_RATE);

    var state = game.getNetworkData();
    var message = {
      type: 'state',
      payload: state,
    };
    var encoded_message = JSON.stringify(message);

    _.each(wss.clients, function(ws) {
      ws.send(encoded_message, function(err) {
        if (err) {
          console.log('error sending message', err);
        }
      });
    });
    stats_tracker.recordSample({bytes: encoded_message.length / 1024});
    if (now - lastStatsPrintTime > 1000) {
      console.log(`rate: ${stats_tracker.getSamplesPerSecond()} KB/s: ${stats_tracker.getFieldPerSecond('bytes')}`);
      lastStatsPrintTime = now;
    }

    if (!game.isRunning()) {
      console.log('Game over');
      destroy_game();
    }
  }, 1000 / TICK_RATE);
}

function destroy_game() {
  if (!game) { return; }

  console.log('destroying game');

  clearInterval(game_loop_interval);
  game = null;
  game_loop_interval = null;
}
