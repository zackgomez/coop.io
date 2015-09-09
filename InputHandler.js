var _ = require('lodash');
// This class swallows
// input from mouse and keyboard
class InputHandler {
  // @param map from eg. keyDown: function that processes an `event` argument
  constructor(handler_dict) {
    this._handlers = _.defaults(handler_dict, {
      keyDown: () =>{},
      keyUp: () =>{},
      mouseUp: () =>{},
      mouseDown: () =>{},
      mouseMove: () =>{}
    });
  }
  handleKeyUp(e) {
    this._callIfExists('keyUp', e);
  }
  handleKeyDown(e) {
    this._callIfExists('keyDown', e);
  }
  handleMouseUp(e) {
    this._callIfExists('mouseUp', e);
  }
  handleMouseDown(e) {
    this._callIfExists('mouseDown', e);
  }
  handleMouseMove(e) {
    this._callIfExists('mouseMove', e);
  }
  _callIfExists(methodname, e) {
    _.get(this._handlers, methodname)(e);
  }
}

module.exports = InputHandler;
