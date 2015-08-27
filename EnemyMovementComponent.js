var _ = require('lodash');

var Box2D = require('box2dweb');
var b2Vec2 = Box2D.Common.Math.b2Vec2;

var EntityComponent = require('./EntityComponent');
var EntityTrackerComponent = require('./EntityTrackerComponent');

class EnemyMovementComponent extends EntityComponent {
  constructor(options) {
    super(options);
  }
  serialize() {
    return {};
  }

  think(dt) {
    var entity = this.getEntity();
    var body = entity.getBody();
    if (!body) { return; }

    var tracker = entity.getComponent(EntityTrackerComponent);
    if (tracker) {
      var target = null;
      var bestDist = Infinity;
      _.each(tracker.trackedEntityByID, (entity, id) => {
        var body = entity.getBody();
        var delta = b2Vec2.Make(body.GetPosition().x, body.GetPosition.y);
        delta.Subtract(body.GetPosition());
        var dist = delta.Length();
        if (!target || dist < bestDist) {
          target = entity;
          bestDist = dist;
        }
      });
      if (target) {
        var direction = target.getBody().GetPosition();
        direction.Subtract(body.GetPosition());
        direction.Normalize();
        var speed = this.props.speed || 5;
        var velocity = new b2Vec2(direction.x * speed, direction.y * speed);
        body.SetLinearVelocity(velocity);
      } else {
        body.SetLinearVelocity(new b2Vec2(0, 0));
      }
    } else {
      body.SetLinearVelocity(new b2Vec2(10, 0));
    }
  }
}

module.exports = EnemyMovementComponent;
