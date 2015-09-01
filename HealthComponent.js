var EntityComponent = require('./EntityComponent');

class HealthComponent extends EntityComponent {
  constructor(options) {
    super(options);

    this.team = this.props.team || null;
    this.maxHP = this.props.maxHP || 1;
    this.hp = this.maxHP;
  }
  serialize() {
    return {
      team: this.team,
      hp: this.hp,
      maxHP: this.maxHP,
    };
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

    this.hp -= 1;
    if (this.hp <= 0) {
      var game = this.getGame();
      game.destroyEntity(this.getEntity());
    }
  }
}

module.exports = HealthComponent;
