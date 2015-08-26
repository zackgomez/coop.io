var _ = require('lodash');
var Immutable = require('immutable');
var invariant = require('invariant');

var GameEntity = require('./GameEntity');
var EntityComponent = require('./EntityComponent');
var HealthComponent = require('./HealthComponent');

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


class PlayerMovementComponent extends EntityComponent {
  constructor(options) {
    super(options);
    options = options || {};
    this.player = options.player || null;

    this.fireInterval = options.fireInterval || 1;
    this.nextFireTime = 0;
  }

  serialize() {
    if (!this.player) {
      return {};
    }
    var playerID = this.player.id;
    return {
      playerID,
    };
  }

  think(dt) {
    this.nextFireTime -= dt;

    var entity = this.getEntity();
    var body = entity && entity.getBody();
    var player = this.player;
    if (!player || !body) {
      return;
    }

    var input_state = player.inputState;

    var current_angle = body.GetAngle();
    var new_angle = input_state.mouse_angle || 0;

    if (new_angle != current_angle) {
      body.SetAngle(new_angle);
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

    body.SetLinearVelocity(new b2Vec2(xvel, yvel));

    if (input_state.fire && this.nextFireTime <= 0) {
      var world = body.GetWorld();

      var position = body.GetPosition();
      var angle = body.GetAngle();
      var length = 1000;
      var end = new b2Vec2(position.x + length * Math.cos(angle), position.y + length * Math.sin(angle));

      var callback = (fixture, point, normal, fraction) => {
        if (fixture.IsSensor()) { return fraction; }

        var body = fixture.GetBody();
        var entity = body.GetUserData();

        console.log('hit a body', point, 'pos', position);
        if (entity) {
          var shot_result = entity.onShot({
            from: this.getEntity(),
            point: point,
            normal: normal,
          });

          if (shot_result.ignore) {
            return fraction;
          }
        }

        return 0;
      };
      world.RayCast(callback, position, end);
    }
  }
};

class EnemyMovementComponent extends EntityComponent {
  constructor(options) {
    super(options);
  }
  serialize() {
    return {};
  }

  think(dt) {
    var entity = this.getEntity();
    if (!entity) { return; }

    var body = entity.getBody();
    body.SetLinearVelocity(new b2Vec2(10, 0));
  }

  onCollision(other) {
  }
}


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
  this.entityRemovalSet_ = {};

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

  var entity = this.spawnEntity();
  var playerComponent = new PlayerMovementComponent({player});
  entity.addComponent(new HealthComponent({team: 1}));
  entity.addComponent(playerComponent);

  var enemy = this.spawnEntity();
  var enemyComponent = new EnemyMovementComponent();
  enemy.addComponent(enemyComponent);
  enemy.addComponent(new HealthComponent({team: 2}));
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

  _.each(this.entityByID, function(entity, id) {
    entity.think(dt);
  });

  this.world_.Step(1/60, 3, 2);

  for (var contact = this.world_.GetContactList(); contact; contact = contact.GetNext()) {
    if (contact.IsTouching()) {
      var a = contact.GetFixtureA();
      var b = contact.GetFixtureB();
      var bodya = a.GetBody();
      var bodyb = b.GetBody();

      var entitya = bodya.GetUserData();
      var entityb = bodyb.GetUserData();

      if (entitya && entityb) {
        console.log('contact between', entitya && entitya.id, entityb && entityb.id);
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

    delete this.entityByID[id];

    entity.onDestroy();
  });
};

Game.prototype.getMapInfo = function() {
  return this.map;
};

Game.prototype.getWorld = function() {
  return this.world_;
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
