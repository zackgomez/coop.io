var clamp = function(a, v, b) {
  return Math.max(a, Math.min(v, b));
};
module.exports = clamp;
