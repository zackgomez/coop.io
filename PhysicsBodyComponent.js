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

var EntityComponent = require('./EntityComponent');

class PhysicsBodyComponent extends EntityComponent {
  constructor(options) {
    super(options);

    this.options_ = null;
    this.body_ = null;
  }

  getBody() {
    return this.body_;
  }

  getWorld() {
    var entity = this.getEntity();
    return entity && entity.getWorld();
  }

  componentDidMount() {
    var def = this.options_ || {};
    var entity = this.getEntity();

    var bodyDef = new b2BodyDef();
    bodyDef.type = b2Body.b2_dynamicBody;
    bodyDef.position = def.position || new b2Vec2(0, 0);
    bodyDef.userData = entity;

    var body = entity.getWorld().CreateBody( bodyDef );
    this.body_ = body;

    var radius = def.radius || 1;
    var circleShape = new b2CircleShape(radius);

    var fd = new b2FixtureDef();
    fd.shape = circleShape;
    body.CreateFixture(fd);

    this.shape_ = circleShape;
  }

  serialize() {
    var position = this.body_.GetPosition();
    return {
      x: position.x,
      y: position.y,
      r: this.shape_.GetRadius(),
      angle: this.body_.GetAngle(),
    };
  }

  think(dt) {
    var entity = this.getEntity();
    if (!entity) { return; }

    var body = entity.getBody();
    if (!body) { return; }
    body.SetLinearVelocity(new b2Vec2(10, 0));
  }

  onDestroy() {
    console.log('destroying physics body');
    if (this.body_) {
      this.getWorld().DestroyBody(this.body_);
    }
  }
}

module.exports = PhysicsBodyComponent;

