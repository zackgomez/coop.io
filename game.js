var _ = require('underscore');
var Immutable = require('immutable');

var GameEntity = function(id, player) {
  this.id = id;

  this.x = 0;
  this.y = 0;

  this.xvel = 0;
  this.yvel = 0;

  this.w = 20;
  this.h = 20;

  this.player = player;
};
GameEntity.prototype.serialize = function() {
  return {
    id: this.id,
    x: this.x,
    y: this.y,
    w: this.w,
    h: this.h,
    playerID: this.player.id,
  };
};

GameEntity.prototype.getInputState = function() {
  return this.player.inputState;
};


var Player = function(id) {
  this.id = id;
  this.inputState = {};
  this.entity = null;
};

var Game = function() {
  this.map = {
    width: 1000,
    height: 1000,
  };

  this.playerByID = {};

  this.lastEntityID_ = 100;
  this.entityByID = {};
}

Game.prototype.addPlayer = function(player_id) {
  var player = new Player(player_id);
  this.playerByID[player_id] = player;

  var entity = new GameEntity(this.lastEntityID_++, player);
  entity.x = this.map.width / 2;
  entity.y = this.map.height / 2;
  player.entity = entity;
  this.entityByID[entity.id] = entity;
};

Game.prototype.removePlayer = function(player_id) {
  delete this.playerByID[player_id];
  _.each(this.entityByID, function(entity, id) {
    if (entity.player.id === player_id) {
      delete this.entityByID[id];
    }
  }, this);
};

Game.prototype.handleInputState = function(player_id, input_state) {
  var player = this.playerByID[player_id];
  if (!player) {
    console.log('set state for missing player id', player_id);
    return;
  }
  player.inputState = input_state;
};

Game.prototype.update = function(dt) {
  var speed = 100;
  _.each(this.entityByID, function(entity, id) {
    var input_state = entity.getInputState();

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

    entity.x += vx * dt;
    entity.y += vy * dt;
  }, this);
};

Game.prototype.getMapInfo = function() {
  return this.map;
};

Game.prototype.getGameState = function() {
  var state = {
    entityByID: {},
  };
  _.each(this.entityByID, function(entity, id) {
    state.entityByID[id] = entity.serialize();
  });

  return state;
};

module.exports = Game;
