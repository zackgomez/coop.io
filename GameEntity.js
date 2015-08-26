var invariant = require('invariant');
var _ = require('lodash');

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

class GameEntity {
  constructor(id, game, def) {
    this.id = id;
    this.game_ = game;
    this.components_ = [];
    this.componentByConstructor_ = {};

    def = def || {};
    this.createBody_(def);
    if (def.components) {
      def.components.forEach((component) => {
        this.addComponent(component);
      });
    }
  }

  serialize() {
    var position = this.body_.GetPosition();

    var serialized = {};
    _.each(this.components_, (component) => {
      var cur = component.serialize();
      serialized = Object.assign(serialized, cur);
    });
    serialized = Object.assign(serialized, {
      id: this.id,
      x: position.x,
      y: position.y,
      r: this.shape_.GetRadius(),
      angle: this.body_.GetAngle(),
    });
    return serialized;
  }

  think(dt) {
    _.each(this.components_, (component) => component.think(dt));
  }

  onShot(shot_definition) {
    _.each(this.components_, (component) => {
      if (component.onShot(shot_definition) === true) {
        return false;
      }
    });
    return {
      ignore: false,
    };
  }

  onDestroy() {
    _.each(this.components_, (component) => component.onDestroy());
    if (this.body_) {
      this.getWorld().DestroyBody(this.body_);
    }
  }

  addComponent(component) {
    invariant(
      !this.componentByConstructor_[component.constructor],
      'cannot have two of the same components attached'
    );
    this.componentByConstructor_[component.constructor] = component;
    this.components_.push(component);
    component.setEntity(this);
  }

  getComponents() {
    return this.components_;
  }

  getComponent(component_constructor) {
    return this.componentByConstructor_[component_constructor];
  }

  getBody() {
    return this.body_;
  }

  getWorld() {
    return this.game_.getWorld();
  }

  getGame() {
    return this.game_;
  }

  createBody_(def) {
    var bodyDef = new b2BodyDef();
    bodyDef.type = b2Body.b2_dynamicBody;
    bodyDef.position = new b2Vec2(0, 0);
    bodyDef.userData = this;

    var body = this.getWorld().CreateBody( bodyDef );
    this.body_ = body;

    var radius = def.radius || 1;
    var circleShape = new b2CircleShape(radius);

    var fd = new b2FixtureDef();
    fd.shape = circleShape;
    body.CreateFixture(fd);

    this.shape_ = circleShape;
  }
}

module.exports = GameEntity;
