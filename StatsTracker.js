var _ = require('lodash');
var ss = require('simple-statistics');

class StatsTracker {
  constructor(limit) {
    this._limit = limit;
    this._samples = [];
  }

  recordSample(sample) {
    this._samples.push({
      t: Date.now(),
      data: sample,
    });
    while(this._samples.length > this._limit) {
      this._samples.shift();
    }
  }

  _getIntervals(it) {
    it = it || ((sample) => sample.t);
    return _.reduce(this._samples, (memo, sample) => {
      if (memo.last !== null) {
        memo.result.push(it(sample) - it(memo.last));
      }
      memo.last = sample;

      return memo;
    }, {last: null, result: []}).result;
  }

  getSamplesPerSecond() {
    return 1000 / ss.mean(this._getIntervals());
  }

  getSampleStdDevMillis() {
    return ss.standardDeviation(this._getIntervals());
  }

  getAverageForData(field) {
    return ss.mean(_.map(this._samples, (sample) => {
      return sample.data[field];
    }));
  }

  getFieldPerSecond(field) {
    if (this._samples.length === 0) { return 0; }

    let duration = _.last(this._samples).t - _.first(this._samples).t;
    return ss.sum(_.map(this._samples, (sample) => {
      return sample.data[field];
    })) / (duration / 1000);
  }
}

module.exports = StatsTracker;
