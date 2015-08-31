var _ = require('lodash');

var Box2D = require('box2dweb');
var b2Vec2 = Box2D.Common.Math.b2Vec2;

var EntityComponent = require('./EntityComponent');
var EntityTrackerComponent = require('./EntityTrackerComponent');
var HealthComponent = require('./HealthComponent');

class EnemyMovementComponent extends EntityComponent {
  constructor(props) {
    super(props);

    this.attackRange = this.props.attackRange || 3;
    this.attackInterval = this.props.attackInterval || 0.75;
    this.nextAttackTime = 0;
  }
  serialize() {
    return {};
  }

  think(dt) {
    if (this.nextAttackTime > 0) {
      this.nextAttackTime -= dt;
      return;
    }

    var entity = this.getEntity();
    var body = entity.getBody();
    if (!body) { return; }
    var world = body.GetWorld();

    var tracker = entity.getComponent(EntityTrackerComponent);
    var health = entity.getComponent(HealthComponent);
    if (!tracker || !health) {
      body.SetLinearVelocity(new b2Vec2(0, 0));
    }

    var target = null;
    var bestDist = Infinity;
    _.each(tracker.trackedEntityByID, (entity, id) => {
      var otherHealth = entity.getComponent(HealthComponent);
      if (!otherHealth) { return; }
      if (health.team === otherHealth.team) { return; }

      var body = entity.getBody();
      var delta = b2Vec2.Make(body.GetPosition().x, body.GetPosition.y);
      delta.Subtract(body.GetPosition());
      var dist = delta.Length();
      if (!target || dist < bestDist) {
        target = entity;
        bestDist = dist;
      }
    });

    if (!target) {
      body.SetLinearVelocity(new b2Vec2(0, 0));
      return;
    }

    var targetPosition = target.getBody().GetPosition();

    var start = body.GetPosition();
    var end = targetPosition.Copy();
    end.Subtract(start);
    end.Normalize();
    end.Multiply(this.attackRange);
    end.Add(start);
    var hitFixture = world.RayCastOne(start, end)
    var hitBody = hitFixture && hitFixture.GetBody();
    var hitEntity = hitBody && hitBody.GetUserData();

    if (hitEntity === target) {
      body.SetLinearVelocity(new b2Vec2(0, 0));

      target.onShot({
        from: this.getEntity(),
      });
      this.nextAttackTime = this.attackInterval;
      return;
    }
    var direction = new b2Vec2(targetPosition.x, targetPosition.y);
    direction.Subtract(body.GetPosition());
    direction.Normalize();
    var speed = this.props.speed || 5;
    var velocity = new b2Vec2(direction.x * speed, direction.y * speed);
    body.SetLinearVelocity(velocity);
  }
}

module.exports = EnemyMovementComponent;
