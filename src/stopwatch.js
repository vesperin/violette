/**
 * @author Huascar A. Sanchez
 */
var Stopwatch = (function () {
  "use strict";

  // thx to https://github.com/scarlac/js-stopwatch
  function Stopwatch (listener, resolution){
    this.startTime      = 0;
    this.stopTime       = 0;
    this.totalElapsed   = 0; // * elapsed number of ms in total
    this.started        = false;
    // * function to receive onTick events
    this.listener       = (listener != undefined ? listener : null);
    // * how long between each tick in milliseconds
    this.tickResolution = (resolution != undefined ? resolution : 500);
    this.tickInterval   = null;

    // * pretty static vars
    this.onehour = 1000 * 60 * 60;
    this.onemin  = 1000 * 60;
    this.onesec  = 1000;

    // automatically start stopwatch
    this.start();
  }


  Stopwatch.prototype.start = function() {
    var delegate = function(that, method) { return function() { return method.call(that) } };
    if(!this.started) {
      this.startTime = new Date().getTime();
      this.stopTime = 0;
      this.started = true;
      this.tickInterval = setInterval(delegate(this, this.onTick), this.tickResolution);
    }
  };

  Stopwatch.prototype.stop = function() {
    if(this.started) {
      this.stopTime       = new Date().getTime();
      this.started        = false;
      this.totalElapsed  += this.stopTime - this.startTime;

      if(this.tickInterval != null){
        clearInterval(this.tickInterval);
      }
    }

    return this.getElapsed();
  };

  Stopwatch.prototype.reset = function() {
    this.totalElapsed = 0;
    // * if watch is running, reset it to current time
    this.startTime = new Date().getTime();
    this.stopTime = this.startTime;
  };

  Stopwatch.prototype.restart = function() {
    this.stop();
    this.reset();
    this.start();
  };

  Stopwatch.prototype.getElapsed = function() {
    // * if watch is stopped, use that date, else use now
    var elapsed = 0;
    if(this.started)
      elapsed = new Date().getTime() - this.startTime;
    elapsed += this.totalElapsed;

    var hours = parseInt(elapsed / this.onehour);
    elapsed %= this.onehour;
    var mins = parseInt(elapsed / this.onemin);
    elapsed %= this.onemin;
    var secs = parseInt(elapsed / this.onesec);
    var ms = elapsed % this.onesec;

    return {
      hours: hours,
      minutes: mins,
      seconds: secs,
      milliseconds: ms
    };
  };


  Stopwatch.prototype.toString = function() {
    var massage = function(no, digits) {
      no = no.toString();
      while(no.length < digits)
        no = '0' + no;
      return no;
    };

    var e = this.getElapsed();
    return massage(e.hours,2) + ":" + massage(e.minutes,2) + ":" + massage(e.seconds,2);
  };

  Stopwatch.prototype.setListener = function(listener) {
    this.listener = listener;
  };

  // * triggered every <resolution> ms
  Stopwatch.prototype.onTick = function() {
    if(this.listener != null) {
      this.listener(this);
    }
  };

  return Stopwatch;

}());