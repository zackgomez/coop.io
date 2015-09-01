var Box2D = require('box2dweb');
var b2Vec2 = Box2D.Common.Math.b2Vec2;

var EntityComponent = require('./EntityComponent');
var EntityTrackerComponent = require('./EntityTrackerComponent');
var EnemyMovementComponent = require('./EnemyMovementComponent');
var HealthComponent = require('./HealthComponent');
var PhysicsBodyComponent = require('./PhysicsBodyComponent');

class EnemySpawnerComponent extends EntityComponent {
  constructor(props) {
    super(props);

    this.respawnInterval = this.props.respawnInterval || 5;
    this.respawnCooldown = this.props.respawnCooldown || 0;

    this.spawnPositionFunc = this.props.spawnPositionFunc || ((entity) => new b2Vec2(0, 0));
  }

  think(dt) {
    var entity = this.getEntity();
    var body = entity.getBody();
    if (body) {
      body.SetLinearVelocity(new b2Vec2(0, 0));
    }

    this.respawnCooldown -= dt;

    if (this.respawnCooldown >= 0) { return; }

    this.respawnCooldown = this.respawnInterval;


    var position = this.spawnPositionFunc(entity);

    var game = this.getGame();
    var components = [
      new PhysicsBodyComponent({position}),
      new HealthComponent({team: 2, maxHP: 2}),
      new EnemyMovementComponent({speed: 15}),
      new EntityTrackerComponent({radius: 40}),
    ];
    var enemy = game.spawnEntity({components});
  }

  componentDidMount() {
  }
}

module.exports = EnemySpawnerComponent;
