var _ = require('lodash');
var Immutable = require('immutable');
var invariant = require('invariant');

var GameEntity = require('./GameEntity');
var EntityComponent = require('./EntityComponent');
var HealthComponent = require('./HealthComponent');
var PhysicsBodyComponent = require('./PhysicsBodyComponent');
var PlayerMovementComponent = require('./PlayerMovementComponent');
var EnemyMovementComponent = require('./EnemyMovementComponent');
var EnemySpawnerComponent = require('./EnemySpawnerComponent');

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
  this.entityByID = {};

  this.lastEntityID_ = 100;
  this.entityRemovalSet_ = {};
  this.events_ = [];

  this._setupPhysics();
}

Game.prototype._setupPhysics = function() {
  var world = new b2World( new b2Vec2(0.0, 0.0) );
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

Game.prototype.spawnEntity = function(def) {
  var entity = new GameEntity(this.lastEntityID_++, this, def);
  this.entityByID[entity.id] = entity;
  return entity;
};

Game.prototype.destroyEntity = function(entity) {
  if (!entity) { return; }

  this.entityRemovalSet_[entity.id] = entity.id;
};

Game.prototype.addPlayer = function(player_id) {
  var player = new Player(player_id);
  this.playerByID[player_id] = player;

  var components = [
    new PhysicsBodyComponent(),
    new PlayerMovementComponent({player, speed: 10}),
    new HealthComponent({team: 1}),
  ];
  var entity = this.spawnEntity({components});

  var position = new b2Vec2(
    _.random(-this.map.width / 2, this.map.width / 2),
    _.random(-this.map.height / 2, this.map.height / 2)
  );
  components = [
    new PhysicsBodyComponent({position, radius: 2}),
    new EnemySpawnerComponent({
      spawnPositionFunc: (entity) => {
        return entity.getBody().GetPosition();
      },
    }),
    new HealthComponent({maxHP: 10, team: 2}),
  ];
  var position = new b2Vec2(0, 10);
  var enemy = this.spawnEntity({components, position});
};

Game.prototype.removePlayer = function(player_id) {
  delete this.playerByID[player_id];
  _.each(this.entityByID, (entity, id) => {
    _.find(entity.getComponents(), (component) => {
      if (component instanceof PlayerMovementComponent) {
        this.destroyEntity(entity);
        return true;
      }
      return false;
    });
  }, this);
};

Game.prototype.addEvent = function(event) {
  this.events_.push(event);
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

  this.commitEntityRemoval_();

  _.each(this.entityByID, (entity, id) => entity.think(dt));

  this.world_.Step(1/60, 3, 2);

  _.each(this.entityByID, (entity, id) => entity.didStepPhysics());

  for (var contact = this.world_.GetContactList(); contact; contact = contact.GetNext()) {
    if (contact.IsTouching()) {
      var a = contact.GetFixtureA();
      var b = contact.GetFixtureB();
      var bodya = a.GetBody();
      var bodyb = b.GetBody();

      var entitya = bodya.GetUserData();
      var entityb = bodyb.GetUserData();

      if (entitya && entityb) {
        //console.log('contact between', entitya && entitya.id, entityb && entityb.id);
      }
    }
  }

  this.world_.ClearForces();

  this.commitEntityRemoval_();

  var elapsed = Date.now() - start;
};

Game.prototype.commitEntityRemoval_ = function() {
  var removal_id_set = this.entityRemovalSet_;
  this.entityRemovalSet_ = {};
  _.each(removal_id_set, (id) => {
    var entity = this.entityByID[id];
    if (!entity) { return; }
    console.log('Destroying entity id', entity.id);

    entity.onDestroy();

    delete this.entityByID[id];
  });
};

Game.prototype.getMapInfo = function() {
  return this.map;
};

Game.prototype.getWorld = function() {
  return this.world_;
};

Game.prototype.getNetworkData = function() {
  var state = {
    entityByID: {},
  };
  _.each(this.entityByID, function(entity, id) {
    state.entityByID[id] = entity.serialize();
  });
  state.events = _.clone(this.events_);
  this.events_ = [];

  return state;
};

module.exports = Game;
