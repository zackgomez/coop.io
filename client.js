var _ = require('lodash');
var WebSocket = require('ws');
var Immutable = require('immutable');
var WS_PORT = 3555;

var map = null;
var playerID = -1;
var entities = [];
var networkEvents = [];
var effects = [];

var tickrate = 64;
var millis_per_tick = 1000/tickrate;
setInterval(update, millis_per_tick);

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
        r: entity.r,
        angle: entity.angle,
        playerID: entity.playerID,
        team: entity.team,
      };
    });
    networkEvents = networkEvents.concat(message.payload.events);
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
var last_input_send_timestamp = 0;
var on_input_change = function() {
  var now = Date.now();
  if (now - last_input_send_timestamp  < millis_per_tick) {
    return;
  }
  last_input_send_timestamp = Date.now();
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
var onMouseDown = function(event) {
  input_state.fire = 1;
  on_input_change();
};
var onMouseUp = function(event) {
  input_state.fire = 0;
  on_input_change();
};
$(canvas).mousemove(onMouseMove);
$(canvas).mousedown(onMouseDown);
$(canvas).mouseup(onMouseUp);

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

var GRID_DIM = 10;

var last_camera_x = 0;
var last_camera_y = 0;
var get_camera_pos = function() {
  var cameraX = last_camera_x;
  var cameraY = last_camera_y;
  var owned_entity = _.find(entities, function(entity) {
    return entity.playerID === playerID;
  });
  if (owned_entity) {
    cameraX = owned_entity.x;
    cameraY = owned_entity.y;
  }

  last_camera_x = cameraX;
  last_camera_y = cameraY;

  return {
    x: cameraX,
    y: cameraY,
  };
};

var draw = function(dt) {
  var start = Date.now();

  _.each(networkEvents, (event) => {
    switch(event.type) {
      case 'shot':
        var duration = 0.125;
        var effect = (dt) => {
          var path = new Path2D();
          path.moveTo(event.start.x, event.start.y);
          path.lineTo(event.end.x, event.end.y);
          ctx.strokeStyle = 'rgb(20, 200, 200)';
          ctx.stroke(path);

          duration -= dt;
          return duration > 0;
        };
        effects.push(effect);

        break;
      default:
    }
  });
  networkEvents = [];

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
  var cameraBounds = {
    x: cameraPosition.x - screen_width / 2,
    y: cameraPosition.y - screen_height / 2,
    w: screen_width,
    h: screen_height,
  };

  var SCALE = 10;
  ctx.translate(screen_width/2, screen_height/2);
  ctx.scale(SCALE, SCALE);
  ctx.translate(-cameraX, -cameraY);

  // draw map
  if (map) {
    // draw grid
    var gridx = Math.ceil(cameraBounds.x / GRID_DIM) * GRID_DIM;
    var gridy = Math.ceil(cameraBounds.y / GRID_DIM) * GRID_DIM;
    ctx.beginPath();
    while (gridx < cameraBounds.x + cameraBounds.w && gridx < map.width/2) {
      ctx.moveTo(gridx, -map.height/2);
      ctx.lineTo(gridx, map.height/2);
      gridx += GRID_DIM;
    }
    while (gridy < cameraBounds.y + cameraBounds.h && gridy < map.height/2) {
      ctx.moveTo(-map.width/2, gridy);
      ctx.lineTo(map.width/2, gridy);
      gridy += GRID_DIM;
    }
    ctx.strokeStyle = 'rgb(100, 100, 100)';
    ctx.stroke();

    // draw outline
    ctx.strokeStyle = 'rgb(20, 20, 255)';
    ctx.strokeRect(-map.width/2, -map.height/2, map.width, map.height);
  }

  // draw entities
  _.each(entities, function(entity) {
    var x = entity.x;
    var y = entity.y;

    ctx.save();

    ctx.translate(x, y);

    if (entity.playerID && entity.angle) {
      ctx.rotate(-entity.angle || 0);
      var aim_line = new Path2D();
      aim_line.moveTo(0, 0);
      aim_line.lineTo(100000, 0);
      ctx.lineWidth = 0.25;
      ctx.strokeStyle = 'rgba(255, 20, 20, 128)';
      ctx.stroke(aim_line);
    }

    const defaultColor = 'rgb(200, 200, 200)';
    const selfColor = 'rgb(60, 120, 200)';
    const colorByTeam = {
      1: 'rgb(50, 200, 50)',
      2: 'rgb(200, 0, 0)',
    };
    var color = entity.playerID === playerID
     ? selfColor
     : colorByTeam[entity.team] || defaultColor;
    var path = new Path2D();
    path.arc(0, 0, entity.r, 0, 2 * Math.PI, /*anticlockwise*/ false);
    ctx.fillStyle = color;
    ctx.fill(path);

    ctx.restore();
  });

  effects = _.filter(effects, (effect) => {
    return effect(dt);
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

  requestAnimationFrame(() => {
    var end = Date.now();
    let newdt = (end - start) / 1000;
    draw(newdt);
  });

};
requestAnimationFrame(draw);

