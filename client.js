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
        angle: entity.angle,
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

var DEBUG_MOUSE_POSITION = {x: 0, y: 0};
var DEBUG_MOUSE_WORLD_POSITION = {x: 0, y: 0};
var DEBUG_MOUSE_ANGLE = 0;
var onMouseMove = function(event) {
  var rect = canvas.getBoundingClientRect();
  var pos = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
  DEBUG_MOUSE_POSITION = pos;

  var center_offset = {
    x: pos.x - screen_width / 2,
    y: screen_height / 2 - pos.y,
  };
  var current_angle = Math.atan2(center_offset.y, center_offset.x);
  DEBUG_MOUSE_ANGLE = current_angle;

  var worldPos = screen_to_world_pos(pos.x, pos.y);
  DEBUG_MOUSE_WORLD_POSITION = worldPos;

  if (input_state.mouse_angle != current_angle) {
    input_state.mouse_angle = current_angle;
    on_input_change();
  }
};
$(canvas).mousemove(onMouseMove);

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
    var x = entity.x;
    var y = entity.y;

    ctx.save();

    ctx.translate(x, y);


    if (typeof entity.angle === 'number') {
      ctx.rotate(-entity.angle || 0);
      var aim_line = new Path2D();
      aim_line.moveTo(0, 0);
      aim_line.lineTo(100000, 0);
      ctx.strokeStyle = 'rgb(200, 0, 0)';
      ctx.stroke(aim_line);
    }

    ctx.fillStyle = 'rgb(50,200,50)';
    ctx.fillRect(-entity.w/2, -entity.h/2, entity.w, entity.h);

    ctx.restore();
  });

  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.font = '20px sans-serif';
  if (owned_entity) {
    ctx.fillStyle = 'white';
    ctx.fillText('position: ' + owned_entity.x + ' , ' + owned_entity.y, 10, 20);
  }
  var display_angle = DEBUG_MOUSE_ANGLE > 0 ? DEBUG_MOUSE_ANGLE : DEBUG_MOUSE_ANGLE + 2 * Math.PI;
  display_angle = display_angle * 180 / Math.PI;
  ctx.fillText('mouse: ' + DEBUG_MOUSE_WORLD_POSITION.x + ', ' + DEBUG_MOUSE_WORLD_POSITION.y + ' | angle: ' + display_angle, 10, 35);

  requestAnimationFrame(draw);
};
requestAnimationFrame(draw);

