var EntityComponent = require('./EntityComponent');

class HealthComponent extends EntityComponent {
  constructor(options) {
    super(options);

    this.team = this.props.team || null;
    this.maxHP = this.props.maxHP || 1;
    this.hp = this.maxHP;
    this.invulnTime = this.props.invulnTime || 0;
  }
  serialize() {
    return {
      team: this.team || undefined,
      hp: this.hp,
      maxHP: this.maxHP,
      invulnTime: this.invulnTime > 0 ? this.invulnTime : undefined,
    };
  }

  think(dt) {
    this.invulnTime -= dt;
  }

  onShot(shot_def) {
    if (this.invulnTime > 0) { return; }

    var {from} = shot_def;
    var other_health = from.getComponent(HealthComponent);
    if (!other_health) { return; }

    // no friendly fire for now
    if (other_health.team === this.team) { return; }

    this.hp -= 1;
    if (this.hp <= 0) {
      var game = this.getGame();
      game.destroyEntity(this.getEntity());
    }
  }
}

module.exports = HealthComponent;
