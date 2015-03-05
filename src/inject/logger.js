/**
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
 */
var Logger = (function () {
  "use strict";

  /**
   * Creates a new Logger object, which behind the scenes wraps
   * the logentries's own LE logging library.
   *
   * @param key Violette ID
   * @constructor
   */
  var Logger = function(key){
    this.key = key;
  };

  Logger.prototype.warn = function(hash){
     LE.warn('[' + this.key + '] ' + hash);
  };

  Logger.prototype.info = function(hash){
    LE.info('[' + this.key + '] ' + hash);
  };

  Logger.prototype.error = function(hash){
    LE.error('[' + this.key + '] ' + hash);
  };

  Logger.prototype.debug = function(hash){
    LE.log('[' + this.key + '] ' + hash);
  };

  return Logger;

})();