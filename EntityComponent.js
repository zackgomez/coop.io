class EntityComponent {
  constructor(props) {
    this.props = props;
  }

  setEntity(entity) {
    this.componentWillMount(entity);
    this._entity = entity;
    this.componentDidMount();
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

  // called before the component mounts into the passed entity
  componentWillMount(entity) {
  }

  // called after the component becomes part of the entity
  componentDidMount() {
  }

  onDestroy() {
  }
}

module.exports = EntityComponent;
