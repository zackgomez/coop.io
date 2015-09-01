var _ = require('lodash');

var Box2D = require('box2dweb');
var b2Vec2 = Box2D.Common.Math.b2Vec2;

var EntityComponent = require('./EntityComponent');
var EntityTrackerComponent = require('./EntityTrackerComponent');
var EnemyMovementComponent = require('./EnemyMovementComponent');
var HealthComponent = require('./HealthComponent');
var PlayerMovementComponent = require('./PlayerMovementComponent');
var PhysicsBodyComponent = require('./PhysicsBodyComponent');
var EnemySpawnerComponent = require('./EnemySpawnerComponent');
var DestructionListenerComponent = require('./DestructionListenerComponent');

var initial_queen_spawn_rate = 15; // in seconds

class GameV0Component extends EntityComponent {
  constructor(props) {
    super(props);

    this._playerByID = {};
    this._ownedEntityIDsByPlayerID = {};
    this._nextQueenSpawnTime = 0;
    this._queenSpawnRate = 0;

    this._timers = [];
  }

  think(dt) {

    if (_.size(this._playerByID)) {
      this._nextQueenSpawnTime -= dt;
      if (this._nextQueenSpawnTime <= 0) {
        this._spawnQueen();
        this._queenSpawnRate /= 1.05; // progressively spawn faster
        this._nextQueenSpawnTime = this._queenSpawnRate;
      }
    }

    this._timers = _.filter(this._timers, (timer) => {
      return timer(dt);
    });

  }

  componentDidMount() {
  }

  onPlayerAdded(player) {
    this._playerByID[player.id] = player;
    this._ownedEntityIDsByPlayerID[player.id] = [];

    this._spawnPlayerEntity(player);
    this._spawnQueen();

    if (_.size(this._playerByID) == 1) {
      this._queenSpawnRate = initial_queen_spawn_rate / _.size(this._playerByID);
      this._nextQueenSpawnTime = this._queenSpawnRate;
    }
  }

  onPlayerRemoved(player_id) {
    var game = this.getGame();
    _.each(this._ownedEntityIDsByPlayerID[player_id], (entity_id) => {
      game.destroyEntityWithID(entity_id);
    });

    delete this._playerByID[player_id];
    delete this._ownedEntityIDsByPlayerID[player_id];

    if (_.size(this._playerByID) == 0) {
      this._nextQueenSpawnTime = 0;
    }

  }

  _spawnPlayerEntity(player) {
    var player_id = player.id;
    var game = this.getGame();
    var components = [
      new PhysicsBodyComponent({radius: 1}),
      new PlayerMovementComponent({player, speed: 13, range: 100}),
      new HealthComponent({team: 1, maxHP: 3, invulnTime: 1}),
      new DestructionListenerComponent({
        callback: () => {
          if (!this._playerByID[player_id]) { return; }

          console.log('player entity for player', player.id, 'destroyed');
          var duration = 3;
          this._timers.push((dt) => {
            duration -= dt;
            if (duration <= 0) {
              this._spawnPlayerEntity(player);
            }
            return duration > 0;
          });
        },
      }),
    ];
    var entity = game.spawnEntity({components});
    this._ownedEntityIDsByPlayerID[player.id].push(
      entity.getID()
    );
  }

  _spawnQueen() {
    var game = this.getGame();
    var map = game.getMapInfo();

    var position = new b2Vec2(
      _.random(-map.width / 2, map.width / 2),
      _.random(-map.height / 2, map.height / 2)
    );
    console.log(`Queen created at ${position.x}, ${position.y}`);
    var components = [
      new PhysicsBodyComponent({position, radius: 2}),
      new EnemySpawnerComponent({
        spawnPositionFunc: (entity) => {
          var position = entity.getBody().GetPosition();

          var direction = position.GetNegative();
          direction.Normalize();
          direction.Multiply(5);

          position.Add(direction);
          return position;
        },
      }),
      new HealthComponent({maxHP: 10, team: 2}),
    ];
    var position = new b2Vec2(0, 10);
    var enemy = game.spawnEntity({components, position});
  }
}

module.exports = GameV0Component;

