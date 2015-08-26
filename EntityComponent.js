class EntityComponent {
  constructor(options) {
    options = options || {};
    this._entity = options.entity || null;
  }

  setEntity(entity) {
    this._entity = entity;
  }
  getEntity() {
    return this._entity;
  }

  getGame() {
    return this._entity && this._entity.getGame();
  }

  serialize() {
    return {};
  }

  think(dt) {
  }

  // other is null if it's a collision with the world
  onCollision(other) {
  }

  // return true to stop further components from receiving the shot
  onShot(shot_def) {
    return false;
  }

  onDestroy() {
  }
}

module.exports = EntityComponent;
