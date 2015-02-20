/**
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
 */
var Drafts = (function () {
  "use strict";


  /**
   * Creates a new Drafts object
   * @param owner Vesperize object
   * @constructor
   */
  var Drafts = function (owner) {
    this.drafts         = {};
    this.drafts[owner]  = [];
    this.owner          = owner;
    this.at             = 0;
  };


  /**
   * Builds a draft object.
   * @param name the name of the change
   * @param before content before changes
   * @param after  content after changes
   * @param notes  notes object
   * @return {{name: name, before: before, after: after}}
   */
  Drafts.buildDraft = function(name, before, after, notes){
    return {
      'name': name
      , 'before': before
      , 'after':  after
      , 'notes':  notes
    };
  };


  /**
   * Adds a draft object.
   *
   * @param draft a JSON object produced by calling Drafts.buildDraft(...)
   */
  Drafts.prototype.addDraft = function(draft){
    if(!Utils.contains(this.drafts[this.owner], draft)){
      this.drafts[this.owner].push(draft);
    }
  };

  /**
   * Clears all collected drafts.
   */
  Drafts.prototype.clear = function(){
    this.drafts[this.owner] = [];
  };

  /**
   * Returns the last positioned draft.
   */
  Drafts.prototype.current = function(){
    return this.getDraft(this.at);
  };

  /**
   * Gets the draft at a given index.
   *
   * @param idx the location where a note is stored.
   * @return {*} the note object.
   */
  Drafts.prototype.getDraft = function(idx){
    if(idx < 0 || idx > this.size()) {
      return null;
    }

    this.at = idx;

    return this.drafts[this.owner][idx];
  };


  Drafts.prototype.backward = function(idx){
    return this.at > idx;
  };

  Drafts.prototype.forward = function(idx){
    return !this.backward(idx);
  };


  /**
   * Returns the number of drafts contained in this object.
   */
  Drafts.prototype.size = function(){
    return this.drafts[this.owner].length;
  };

  /**
   * Returns the array representation of Drafts.
   * @return {*} the array of drafts
   */
  Drafts.prototype.toArray = function(){
    var result = [];
    var N      = this.size();

    var idx, note;

    for(idx = 0; idx < N; idx++){
      note = this.getDraft(idx);
      result.push(note);
    }

    return result;
  };

  /**
   * Returns the JSON representation of the drafts
   */
  Drafts.prototype.toJSON = function(){
    return {'drafts': this.toArray()};
  };


  return Drafts;
})();