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
   * Marks a new draft.
   * @param v Vesperize object
   * @param value the updated code
   * @param callback some function to be called if a new draft is marked.
   */
  Drafts.mark = function(v, value, callback){
    if(v.drafts.empty()){ // let's create the NULL draft (aka the origin)
      var b   = "";
      var a   = v.codemirror.getValue();
      v.notes = Notes.transfer(v, v.notes);
      v.drafts.newDraft(
        'No changes', b, a, v.notes.toJSON()
      );

      v.log.info("Creating draft ZERO (aka `NULL draft`)");
    }


    // retrieved saved content
    var last = v.drafts.last();
    var lastContent = last.after;

    if(lastContent !== value){
      var before = lastContent;
      var after  = value;
      var name   = v.lastaction;

      // if the `lastaction` is a refactoring, then the v.lastaction should
      // not be null. If it is null when marking a draft, then it means we are
      // manually editing the example
      name       = name == null ? 'Manual Edit' : name;
      // transfer only the notes whose selections are still valid
      v.notes    = Notes.transfer(v, v.notes);
      v.drafts.newDraft(
        name,
        before,
        after,
        v.notes.toJSON()
      );

      v.lastaction = null;

      v.log.info("A new draft has been marked!");
      callback('info', v, 'A new draft has been marked!');
    }
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
  Drafts.prototype.last = function(){
    return this.getDraft(this.size() - 1);
  };


  /**
   * Gets the draft at a given index.
   *
   * @param idx the location where a note is stored.
   * @return {*} the note object or undefined.
   */
  Drafts.prototype.getDraft = function(idx){
    if(idx < 0 || idx > this.size()) {
      return null;
    }

    return this.drafts[this.owner][idx];
  };


  Drafts.prototype.contains = function(idx){
     return this.drafts[this.owner][idx] !== undefined;
  };

  Drafts.prototype.empty = function(){
    return this.size() == 0;
  };


  /**
   * Adds a new draft object.
   *
   * @param name the name of draft
   * @param before code before draft
   * @param after code after draft
   * @param notes current notes
   */
  Drafts.prototype.newDraft = function(name, before, after, notes){
    this.addDraft(Drafts.buildDraft(name, before, after, notes));
  };


  Drafts.prototype.update = function(idx, notes){
    if(this.contains(idx)){
      this.drafts[this.owner][idx].notes = notes;
    }
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