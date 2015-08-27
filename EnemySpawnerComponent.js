var Box2D = require('box2dweb');
var b2Vec2 = Box2D.Common.Math.b2Vec2;

var EntityComponent = require('./EntityComponent');
var EnemyMovementComponent = require('./EnemyMovementComponent');
var HealthComponent = require('./HealthComponent');
var PhysicsBodyComponent = require('./PhysicsBodyComponent');

class EnemySpawnerComponent extends EntityComponent {
  constructor(options) {
    super(options);

    options = options || {};
    this.respawnInterval = options.respawnInterval || 5;
    this.respawnCooldown = options.respawnCooldown || 0;
  }

  think(dt) {
    this.respawnCooldown -= dt;

    if (this.respawnCooldown >= 0) { return; }

    this.respawnCooldown = this.respawnInterval;

    var entity = this.getEntity();
    if (!entity) { return; }

    var game = this.getGame();
    var components = [
      new PhysicsBodyComponent(),
      new EnemyMovementComponent(),
      new HealthComponent({team: 2}),
    ];
    var enemy = game.spawnEntity({components});
  }

  componentDidMount() {
  }
}

module.exports = EnemySpawnerComponent;
