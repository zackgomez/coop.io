var invariant = require('invariant');
var _ = require('lodash');

var PhysicsBodyComponent = require('./PhysicsBodyComponent');

class GameEntity {
  constructor(id, game, def) {
    this.id = id;
    this.game_ = game;
    this.components_ = [];
    this.componentByConstructor_ = {};

    def = def || {};
    if (def.components) {
      def.components.forEach((component) => {
        this.addComponent(component);
      });
    }
  }

  serialize() {
    var serialized = {};
    _.each(this.components_, (component) => {
      var cur = component.serialize();
      serialized = Object.assign(serialized, cur);
    });
    serialized = Object.assign(serialized, {
      id: this.id,
    });
    return serialized;
  }

  think(dt) {
    _.each(this.components_, (component) => component.think(dt));
  }

  onShot(shot_definition) {
    _.each(this.components_, (component) => {
      if (component.onShot(shot_definition) === true) {
        return false;
      }
    });
    return {
      ignore: false,
    };
  }

  onDestroy() {
    _.each(this.components_, (component) => component.onDestroy());
  }

  addComponent(component) {
    invariant(
      !this.componentByConstructor_[component.constructor],
      'cannot have two of the same components attached: %s',
      component.constructor.name
    );
    this.componentByConstructor_[component.constructor] = component;
    this.components_.push(component);
    component.setEntity(this);
  }

  getComponents() {
    return this.components_;
  }

  getComponent(component_constructor) {
    return this.componentByConstructor_[component_constructor];
  }

  getWorld() {
    return this.game_.getWorld();
  }

  getGame() {
    return this.game_;
  }

  getBody() {
    var component = this.getComponent(PhysicsBodyComponent);
    return component && component.getBody();
  }
}

module.exports = GameEntity;
