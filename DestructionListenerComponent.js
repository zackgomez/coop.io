var EntityComponent = require('./EntityComponent');

class DestructionListenerComponent extends EntityComponent {
  constructor(props) {
    super(props);

    this.callback = this.props.callback || (() => {});
  }
  onDestroy() {
    this.callback();
  }
}

module.exports = DestructionListenerComponent;
