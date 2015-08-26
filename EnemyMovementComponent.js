var Box2D = require('box2dweb');
var b2Vec2 = Box2D.Common.Math.b2Vec2;

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
}

module.exports = EnemyMovementComponent;
