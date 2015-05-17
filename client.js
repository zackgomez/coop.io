var _ = require('underscore');
var WebSocket = require('ws');
var WS_PORT = 3555;

var ws = new WebSocket('ws://localhost:'+WS_PORT);
ws.onopen = function() {
  console.log('connected');
};
ws.onmessage = function(data, flags) {
  conole.log('onmessage', data, flags);
};
ws.onerror = function(error) {
  console.log('socket error', error);
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

var input_state = {};
var on_input_change = function() {
  var msg = {
    type: 'input',
    payload: _.clone(input_state),
  };
  ws.send(msg);
};

var keycode_to_input = {
  65: 'left',
  68: 'right',
  83: 'backward',
  87: 'forward',
};

$(window).keydown(function(event) {
  var input = keycode_to_input[event.keyCode];
  if (input) {
    input_state[input] = true;
  }
});
$(window).keyup(function(event) {
  var input = keycode_to_input[event.keyCode];
  if (input) {
    input_state[input] = false;
  }
});


var world_width = 10000;
var world_height = 10000;

var x = 100;
var y = 100;
var w = 50;
var h = 50;

var speed = 5;

var update = function() {
  var vx = 0, vy = 0;
  if (input_state.left) {
    vx += -speed;
  }
  if (input_state.right) {
    vx += speed;
  }
  if (input_state.forward) {
    vy += -speed;
  }
  if (input_state.backward) {
    vy += speed;
  }

  x += vx;
  y += vy;
};

var tickrate = 64;
setInterval(update, 1000 / tickrate);

var draw = function() {
  ctx.fillStyle = "rgb(0,0,0)";
  ctx.fillRect(0, 0, screen_width, screen_height);

  ctx.fillStyle = "rgb(200,0,0)";
  ctx.fillRect(x + w/2, y + h/2, w, h);

  requestAnimationFrame(draw);
};
requestAnimationFrame(draw);

