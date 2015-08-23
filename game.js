var _ = require('lodash');
var Immutable = require('immutable');
var clamp = require('./clamp');

var Box2D = require('box2dweb');
var b2Vec2 = Box2D.Common.Math.b2Vec2
  , b2BodyDef = Box2D.Dynamics.b2BodyDef
  , b2Body = Box2D.Dynamics.b2Body
  , b2FixtureDef = Box2D.Dynamics.b2FixtureDef
  , b2Fixture = Box2D.Dynamics.b2Fixture
  , b2World = Box2D.Dynamics.b2World
  , b2MassData = Box2D.Collision.Shapes.b2MassData
  , b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
  , b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
  , b2DebugDraw = Box2D.Dynamics.b2DebugDraw;

var GameEntity = function(id, world, def) {
  this.id = id;
  this.world_ = world;
  this.def_ = def || {};

  this.player = null;

  this.createBody_();
};

GameEntity.prototype.serialize = function() {
  var position = this.body_.GetPosition();
  return {
    id: this.id,
    x: position.x,
    y: position.y,
    r: this.shape_.GetRadius(),
    angle: this.body_.GetAngle(),
    playerID: this.player.id,
  };
};

GameEntity.prototype.createBody_ = function() {
  var bodyDef = new b2BodyDef();
  bodyDef.type = b2Body.b2_dynamicBody;
  bodyDef.position = new b2Vec2(0, 0);

  var body = this.world_.CreateBody( bodyDef );
  this.body_ = body;

  var radius = this.def_.radius || 1;
  var circleShape = new b2CircleShape(radius);

  var fd = new b2FixtureDef();
  fd.shape = circleShape;
  body.CreateFixture(fd);

  this.shape_ = circleShape;
};

GameEntity.prototype.think = function(dt) {
  if (this.player) {
    var input_state = this.player.inputState;

    var current_angle = this.body_.GetAngle();
    var new_angle = input_state.mouse_angle || 0;

    if (new_angle != current_angle) {
      this.body_.SetAngle(new_angle);
    }

    var xvel = 0;
    var yvel = 0;
    var speed = 12;
    if (input_state.left) {
      xvel += -speed;
    }
    if (input_state.right) {
      xvel += speed;
    }
    if (input_state.forward) {
      yvel += -speed;
    }
    if (input_state.backward) {
      yvel += speed;
    }

    this.body_.SetLinearVelocity(new b2Vec2(xvel, yvel));
  }
};

var Player = function(id) {
  this.id = id;
  this.inputState = {};
  this.entity = null;
};

var Game = function() {
  this.map = {
    width: 200,
    height: 100,
  };

  this.playerByID = {};

  this.lastEntityID_ = 100;
  this.entityByID = {};

  this._setupPhysics();
}

Game.prototype._setupPhysics = function() {
  var world = new b2World( new b2Vec2(0.0, -2.0) );
  this.world_ = world;

  var map = this.map;

  var groundDef = new b2BodyDef();
  var groundBody = world.CreateBody(groundDef);

  var fd = new b2FixtureDef();

  var shape = new b2PolygonShape();
  fd.shape = shape;
  shape.SetAsEdge(new b2Vec2(-map.width/2, -map.height/2), new b2Vec2(map.width/2, -map.height/2));
  groundBody.CreateFixture(fd);

  shape = new b2PolygonShape();
  fd.shape = shape;
  shape.SetAsEdge(new b2Vec2(map.width/2, -map.height/2), new b2Vec2(map.width/2, map.height/2));
  groundBody.CreateFixture(fd);

  shape = new b2PolygonShape();
  fd.shape = shape;
  shape.SetAsEdge(new b2Vec2(map.width/2, map.height/2), new b2Vec2(-map.width/2, map.height/2));
  groundBody.CreateFixture(fd);

  shape = new b2PolygonShape();
  fd.shape = shape;
  shape.SetAsEdge(new b2Vec2(-map.width/2, map.height/2), new b2Vec2(-map.width/2, -map.height/2));
  groundBody.CreateFixture(fd);
}

Game.prototype.spawnEntity = function() {
  var entity = new GameEntity(this.lastEntityID_++, this.world_);
  this.entityByID[entity.id] = entity;
  return entity;
}

Game.prototype.addPlayer = function(player_id) {
  var player = new Player(player_id);
  this.playerByID[player_id] = player;

  var entity = this.spawnEntity();
  entity.player = player;
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
  var start = Date.now();
  _.each(this.entityByID, function(entity, id) {
    entity.think(dt);
  });

  this.world_.Step(1/60, 3, 2);

  var elapsed = Date.now() - start;
  console.log('think time', elapsed / 1000);
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
