var _ = require('underscore');
var WebSocket = require('ws');
var Immutable = require('immutable');
var WS_PORT = 3555;

var map = null;
var playerID = -1;
var entities = [];

var ws = new WebSocket('ws://'+window.location.hostname+':'+WS_PORT+'/socket');
ws.onopen = function() {
  console.log('connected');
};
ws.onmessage = function(event) {
  var message = JSON.parse(event.data);
  if (message.type === 'state') {
    entities = _.map(message.payload.entityByID, function(entity, id) {
      return {
        x: entity.x,
        y: entity.y,
        w: entity.w,
        h: entity.h,
        playerID: entity.playerID,
      };
    });
  } else if (message.type === 'player_info') {
    playerID = message.payload.playerID;
    console.log('server assigned playerID', playerID);
  } else if (message.type === 'map_info') {
    map = message.payload;
    console.log('server sent map info', map);
  }
};
ws.onerror = function(error) {
  console.log('socket error', error);
};
ws.onclose = function() {
  console.log('socket closed');
};


var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

var screen_width = 0;
var screen_height = 0;

var on_resize = function(event) {
  screen_width = $(window).width()
  screen_height = $(window).height();

  canvas.width = screen_width;
  canvas.height = screen_height;
};
$(window).resize(on_resize);
on_resize();

var keycode_to_input = {
  65: 'left',
  68: 'right',
  83: 'backward',
  87: 'forward',
};

var input_state = {};
var on_input_change = function() {
  var msg = {
    type: 'input',
    payload: _.clone(input_state),
  };
  ws.send(JSON.stringify(msg));
};


$(window).keydown(function(event) {
  var input = keycode_to_input[event.keyCode];
  var target = true;
  if (input && input_state[input] != target) {
    input_state[input] = target;
    on_input_change();
  }
});
$(window).keyup(function(event) {
  var input = keycode_to_input[event.keyCode];
  var target = false;
  if (input && input_state[input] != target) {
    input_state[input] = target;
    on_input_change();
  }
});

var DEBUG_MOUSE_WORLD_POSITION = {x: 0, y: 0};
$(canvas).mousemove(function(event) {
  var rect = canvas.getBoundingClientRect();
  var pos = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
  var worldPos = screen_to_world_pos(pos.x, pos.y);
  DEBUG_MOUSE_WORLD_POSITION = worldPos;
});

var screen_to_world_pos = function(x, y) {
  var cameraPosition = get_camera_pos();
  var worldPos = {
    x: x - screen_width / 2 + cameraPosition.x,
    y: y - screen_height / 2 + cameraPosition.y,
  };

  return worldPos;
};


var update = function() {
};

var tickrate = 64;
setInterval(update, 1000 / tickrate);

var GRID_DIM = 100;

var get_camera_pos = function() {
  var cameraX = map ? map.width / 2 : 0;
  var cameraY = map ? map.height / 2 : 0;
  var owned_entity = _.find(entities, function(entity) {
    return entity.playerID === playerID;
  });
  if (owned_entity) {
    cameraX = owned_entity.x;
    cameraY = owned_entity.y;
  }

  return {
    x: cameraX,
    y: cameraY,
  };
};

var draw = function() {
  var start = Date.now();

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "rgb(0,0,0)";
  ctx.fillRect(0, 0, screen_width, screen_height);

  // first set viewport to entity we own
  var owned_entity = _.find(entities, function(entity) {
    return entity.playerID === playerID;
  });
  var cameraPosition = get_camera_pos();
  var cameraX = cameraPosition.x;
  var cameraY = cameraPosition.y;

  if (map) {
    // draw grid
    var gridx = (map.width - cameraX) % GRID_DIM;
    var gridy = (map.height - cameraY) % GRID_DIM;
    ctx.beginPath();
    while (gridx < screen_width) {
      ctx.moveTo(gridx, 0);
      ctx.lineTo(gridx, screen_height);
      gridx += GRID_DIM;
    }
    while (gridy < screen_height) {
      ctx.moveTo(0, gridy);
      ctx.lineTo(screen_width, gridy);
      gridy += GRID_DIM;
    }
    ctx.strokeStyle = 'rgb(100, 100, 100)';
    ctx.stroke();
  }

  ctx.translate(screen_width/2, screen_height/2);
  ctx.translate(-cameraX, -cameraY);

  _.each(entities, function(entity) {
    var x = (entity.x - entity.w/2);
    var y = (entity.y - entity.h/2);
    ctx.fillStyle = 'rgb(200,0,0)';
    ctx.fillRect(x, y, entity.w, entity.h);
  });

  ctx.fillStyle = 'rgb(0, 0, 220)';
  ctx.fillRect(0, 0, 4, 4);

  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.fillStyle = 'rgb(0, 220, 0)';
  ctx.fillRect(screen_width / 2 - 5, screen_height / 2 - 5, 10, 10);

  ctx.font = '20px sans-serif';
  if (owned_entity) {
    ctx.fillText('position: ' + owned_entity.x + ' , ' + owned_entity.y, 10, 20);
  }
  ctx.fillText('mouse: ' + DEBUG_MOUSE_WORLD_POSITION.x + ', ' + DEBUG_MOUSE_WORLD_POSITION.y, 10, 35);

  requestAnimationFrame(draw);
};
requestAnimationFrame(draw);

