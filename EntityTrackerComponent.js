var _ = require('lodash');

var Box2D = require('box2dweb');
var b2Vec2 = Box2D.Common.Math.b2Vec2
  , b2FixtureDef = Box2D.Dynamics.b2FixtureDef
  , b2Fixture = Box2D.Dynamics.b2Fixture
  , b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
  , b2CircleShape = Box2D.Collision.Shapes.b2CircleShape

var EntityComponent = require('./EntityComponent');

class EntityTrackerComponent extends EntityComponent {
  constructor(options) {
    super(options);

    this.fixture_ = null;
    this.trackedEntityByID = {};
  }
  serialize() {
    return {};
  }

  think(dt) {
  }

  didStepPhysics() {
    var body = this.getEntity().getBody();
    if (!body) { return; }

    var contactedEntityByID = {};
    for (var edge = body.GetContactList(); edge; edge = edge.next) {
      var {contact, other} = edge;

      var fixtureA = contact.GetFixtureA();
      var fixtureB = contact.GetFixtureB();
      var otherFixture;
      if (this.fixture_ === fixtureA) {
        otherFixture = fixtureB;
      } else if (this.fixture_ === fixtureB) {
        otherFixture = fixtureA;
      } else {
        continue;
      }

      if (otherFixture.IsSensor()) {
        continue;
      }

      var otherEntity = other.GetUserData();
      if (!otherEntity) { continue; }

      contactedEntityByID[otherEntity.id] = otherEntity;
    }

    this.trackedEntityByID = contactedEntityByID;
  }

  componentDidMount() {
    var body = this.getEntity().getBody();
    if (!body) { return; }

    var radius = this.props.radius || 1;

    var shape = new b2CircleShape(radius);

    var fd = new b2FixtureDef();
    fd.shape = shape;
    fd.isSensor = true;
    this.fixture_ = body.CreateFixture(fd);
  }
}

module.exports = EntityTrackerComponent;

