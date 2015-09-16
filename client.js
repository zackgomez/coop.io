var _ = require('lodash');
var WebSocket = require('ws');
var Immutable = require('immutable');
var clamp = require('./clamp');
var StatsTracker = require('./StatsTracker');
var ConvarController = require('./ConvarController');
var InputHandler = require('./InputHandler');

const WS_PORT = 3555;

var map = null;
var playerID = -1;
var entities = [];
var networkEvents = [];
var effects = [];

var convar_console_active = false;

const tickrate = 64;
const millis_per_tick = 1000/tickrate;

var game_start_time = 0;
var game_data = null;

var packet_stats = new StatsTracker(100);
var convar = new ConvarController();
var key_handler = new InputHandler();

var ws = new WebSocket('ws://'+window.location.hostname+':'+WS_PORT+'/socket');
ws.onopen = function() {
  console.log('connected');
};
ws.onmessage = function(event) {
  packet_stats.recordSample({bytes: event.data.length});
  var message = JSON.parse(event.data);
  if (message.type === 'state') {
    entities = _.filter(_.map(message.payload.entityByID, function(entity, id) {
      if (id === '100') {
        game_data = entity;
        return null;
      }
      return {
        x: entity.x,
        y: entity.y,
        r: entity.r,
        angle: entity.angle,
        playerID: entity.playerID,
        team: entity.team,
        hp: entity.hp,
        maxHP: entity.maxHP,
      };
    }));
    networkEvents = networkEvents.concat(message.payload.events);
  } else if (message.type === 'player_info') {
    playerID = message.payload.playerID;
    console.log('server assigned playerID', playerID);
  } else if (message.type === 'start_time') {
    game_start_time = message.payload;
    console.log(`Received game start timestamp ${game_start_time}`);
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
var input_state_dirty = false;
var on_input_change = function() {
  input_state_dirty = true;
};

/** Input Handling  */
(function () {

  var convar_keycode = 27;

  var console_key_handler = new InputHandler({keyUp: function(event) {
    if (event.keyCode == convar_keycode) {
      set_input_handler(ingame_key_handler);
      convar_console_active = false;
    }
  }, keyDown: function(event) {
    convar.handleKey(event);
  }});

  var in_game_keydown_handler = function(event) {
    var input = keycode_to_input[event.keyCode];
    var target = true;
    if (input && input_state[input] != target) {
      input_state[input] = target;
      on_input_change();
    }
  };

  var in_game_keyup_handler = function(event) {
    var input = keycode_to_input[event.keyCode];
    var target = false;
    if (event.keyCode == convar_keycode) {
      convar_console_active = true;
      set_input_handler(console_key_handler);
    }
    if (input && input_state[input] != target) {
      input_state[input] = target;
      on_input_change();
    }
  };


  var get_input_handler = function() {
    return _input_handler;
  }

  var set_input_handler = function(keyhandler) {
    _input_handler = keyhandler;
  }

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

  var ingame_key_handler = new InputHandler({
    keyUp: in_game_keyup_handler,
    keyDown:in_game_keydown_handler,
    mouseUp: onMouseUp,
    mouseDown:onMouseDown,
    mouseMove:onMouseMove
  });
  var _input_handler = ingame_key_handler;

  $(canvas).mousemove((e) => get_input_handler().handleMouseMove(e));
  $(canvas).mousedown((e) => get_input_handler().handleMouseDown(e));
  $(canvas).mouseup((e) => get_input_handler().handleMouseUp(e));
  $(window).keydown((e) => {get_input_handler().handleKeyDown(e)});
  $(window).keyup((e) => {get_input_handler().handleKeyUp(e);});
})();

var screen_to_world_pos = function(x, y) {
  var cameraPosition = get_camera_pos();
  var worldPos = {
    x: x - screen_width / 2 + cameraPosition.x,
    y: y - screen_height / 2 + cameraPosition.y,
  };

  return worldPos;
};

var update = function() {
  if (input_state_dirty) {
    var msg = {
      type: 'input',
      payload: _.clone(input_state),
    };
    ws.send(JSON.stringify(msg));
  }
  input_state_dirty = false;
};
setInterval(update, millis_per_tick);

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

var printable_float = function(f, decimals = 1) {
  return parseFloat(f).toFixed(decimals);
}

var last_draw_call_time = Date.now();
var average_draw_interval = 0;
var draw = function(dt) {
  var start = Date.now();
  average_draw_interval = 0.9 * average_draw_interval + 0.1 * (start - last_draw_call_time);
  last_draw_call_time = start;

  _.each(networkEvents, (event) => {
    switch(event.type) {
      case 'shot':
        const trail_length = 5;
        const speed = 200;
        let xdir = event.end.x - event.start.x;
        let ydir = event.end.y - event.start.y;
        let total_length = Math.sqrt(xdir * xdir + ydir * ydir);
        xdir /= total_length;
        ydir /= total_length;

        let t = 0;
        let duration = (total_length - trail_length) / speed;

        let effect = (dt) => {
          let offset = speed * t;

          let startx = event.start.x + xdir * offset;
          let starty = event.start.y + ydir * offset;
          let endx = startx + xdir * trail_length;
          let endy = starty + ydir * trail_length;

          let path = new Path2D();
          path.moveTo(startx, starty);
          path.lineTo(endx, endy);
          ctx.lineWidth = 0.33;
          ctx.strokeStyle = 'rgb(200, 200, 20)';
          ctx.stroke(path);

          t += dt;
          return t < duration;
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
    ctx.lineWidth = 1;
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

    if (entity.hp) {
      ctx.save();
      ctx.translate(- 2*entity.r, 2 * entity.r);
      ctx.font = '2px sans-serif';
      ctx.fillStyle = 'white';
      ctx.fillText(entity.hp + '/' + entity.maxHP, 1, 1);
      ctx.restore();
    }

    if (entity.playerID && entity.angle) {
      ctx.rotate(-entity.angle || 0);
      var aim_line = new Path2D();
      aim_line.moveTo(0, 0);
      aim_line.lineTo(100000, 0);
      ctx.lineWidth = 0.25;
      ctx.strokeStyle = 'rgba(255, 20, 20, 0.5)';
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

  var cmd_rate_avg = packet_stats.getSamplesPerSecond();
  var cmd_rate_var = packet_stats.getSampleStdDevMillis();
  var cmd_size_avg = packet_stats.getFieldPerSecond('bytes') / 1024;

  ctx.font = '20px sans-serif';
  ctx.fillStyle = 'white';
  ctx.fillText(`cmdrate: ${printable_float(cmd_rate_avg)} var (ms): ${printable_float(cmd_rate_var)} size (KB/s): ${printable_float(cmd_size_avg)}`, 10, 20);
  ctx.fillText(`fps: ${printable_float(1000 / average_draw_interval)}`, 10, 35);
  ctx.fillText(`Entities: ${entities.length}`, 10, 50);
  ctx.font = '48px sans-serif';
  ctx.fillText(`Time: ${parseFloat((Date.now() - game_start_time) / 1000).toFixed(0)}`, screen_width / 2, 40);
  if (convar_console_active) {
    ctx.fillText('convar active (press ESC)', screen_width / 2, 100);
  }
  if (game_data) {
    var {endTime, respawnTimeByPlayerID} = game_data;
    if (endTime) {
      ctx.fillText(`Game Over`, screen_width / 2, screen_height / 2);
    } else if (respawnTimeByPlayerID && respawnTimeByPlayerID[playerID]) {
      ctx.fillText(
        `Respawn in ${printable_float(respawnTimeByPlayerID[playerID])}`,
        screen_width / 2,
        screen_height / 2);
    }
  }

  requestAnimationFrame(() => {
    var end = Date.now();
    let newdt = (end - start) / 1000;
    draw(newdt);
  });

};
requestAnimationFrame(draw);

