var EntityComponent = require('./EntityComponent');

class HealthComponent extends EntityComponent {
  constructor(options) {
    super(options);

    options = options || {};
    this.team = options.team || null;
  }
  serialize() {
    return {};
  }

  think(dt) {
  }

  onShot(shot_def) {
    var {from} = shot_def;
    var other_health = from.getComponent(HealthComponent);
    if (!other_health) { return false; }

    console.log(this.getEntity().id, 'team', this.team, 'shot by', other_health.team);
    // no friendly fire for now
    if (other_health.team === this.team) { return false; }

    var game = this.getGame();
    game.destroyEntity(this.getEntity());

    return false;
  }
}

module.exports = HealthComponent;
