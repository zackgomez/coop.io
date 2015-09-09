class ConvarController {
  // @param console_delegate an object with an execute method 
  constructor(console_delegate) {
    this._buffer = [];
    this._delegate = console_delegate;
  }
  handleKey(key_event) {
    if (key_event.keyCode == 13) {
      if (this._delegate) {
        this.drawString(this._delegate.execute(this._buffer));
      }
      this._buffer = "";
    }
    else {
      this._buffer += String.fromCharCode(key_event.keyCode);
    }
  }
  drawString(display_string) {
    // TODO: render to canvas with some history
  }
}

module.exports = ConvarController;

