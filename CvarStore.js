var fs = require('fs');
var _ = require('lodash');
var invariant = require('invariant');

class CvarStore {
  // @param value_dict has a key 'default'
  register(cvar_name, value_dict) {
    this._cvars[cvar_name] = value_dict;
  }
  constructor(filename) {
    this._cvars = {};
    var data = fs.readFileSync(filename);
    _.forIn(JSON.parse(data), (value, key) => {
      this.register(key, value);
    });
  }
  // Set a value for a cvar. This overrides the server value for subsequent reads
  set(cvar_name, new_value) {
    this._cvars[cvar_name]['value'] = new_value;
  }
  // Return cvar named @param cvar_name to its server value
  reset(cvar_name) {
    var cvar = this._cvars[cvar_name];
    cvar[value] = cvar[default_value];
  }
  // Return the current value associated with a cvar
  lookup(cvar_name) {
    var cvar = this._cvars[cvar_name];
    if (_.has(cvar, 'value')) {
      return cvar['value'];
    }
    invariant(_.has(cvar, 'default_value'), 'Must register cvars before use');
    return cvar['default_value'];
  }
}

module.exports = new CvarStore('cvar_defaults.json');

