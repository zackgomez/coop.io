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
var GameV0Component = require('./GameV0Component');

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

class Player {
  constructor(id) {
    this.id = id;
    this.inputState = {};
    this.entity = null;
  }
}

class Game {
  constructor() {
    this.map = {
      width: 200,
      height: 100,
    };

    this.startTime = Date.now();
    this.endTime = null;

    this.playerByID = {};
    this.entityByID = {};

    this.lastEntityID_ = 100;
    this.entityRemovalSet_ = {};
    this._events = [];

    this._setupPhysics();

    this._gameComponent = new GameV0Component();
    this.spawnEntity({
      components: [
        this._gameComponent,
      ],
    });
  }

  _setupPhysics() {
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

  spawnEntity(def) {
    var entity = new GameEntity(this.lastEntityID_++, this, def);
    this.entityByID[entity.id] = entity;
    return entity;
  }

  destroyEntityWithID(entity_id) {
    this.destroyEntity(this.entityByID[entity_id]);
  }

  destroyEntity(entity) {
    if (!entity) { return; }

    this.entityRemovalSet_[entity.id] = entity.id;
  }

  addPlayer(player_id) {
    var player = new Player(player_id);
    this.playerByID[player_id] = player;

    this._gameComponent.onPlayerAdded(player);
  }

  removePlayer(player_id) {
    this._gameComponent.onPlayerRemoved(player_id);
    delete this.playerByID[player_id];
  }

  addEvent(event) {
    this._events.push(event);
  }

  handleInputState(player_id, input_state) {
    var player = this.playerByID[player_id];
    if (!player) {
      console.log('set state for missing player id', player_id);
      return;
    }
    player.inputState = input_state;
  }

  update(dt) {
    var start = Date.now();

    this.commitEntityRemoval_();

    _.each(this.entityByID, (entity, id) => entity.think(dt));

    this.world_.Step(dt, 3, 2);

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

    var finished = Date.now();
    var elapsed = finished - start;

    if (this._gameComponent.isGameOver()) {
      this.endTime = finished;
    }
  }

  commitEntityRemoval_() {
    var removal_id_set = this.entityRemovalSet_;
    this.entityRemovalSet_ = {};
    _.each(removal_id_set, (id) => {
      var entity = this.entityByID[id];
      if (!entity) { return; }
      console.log('Destroying entity id', entity.id);

      entity.onDestroy();

      delete this.entityByID[id];
    });
  }

  getMapInfo() {
    return this.map;
  }

  getStartTime() {
    return this.startTime;
  }

  getWorld() {
    return this.world_;
  }

  getNetworkData() {
    var state = {
      entityByID: {},
    };
    _.each(this.entityByID, function(entity, id) {
      state.entityByID[id] = entity.serialize();
    });
    state.events = _.clone(this._events);
    this._events = [];

    return state;
  }

  isRunning() {
    return this.endTime === null;
  }
}

module.exports = Game;
