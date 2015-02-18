/**
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
 */
var Notes = (function () {
  "use strict";

  function contains(array, target){
    var i = array.length;
    while (i--) {
      // see http://bit.ly/1hlDwmH for details on this fast and limited solution
      if (JSON.stringify(array[i]) === JSON.stringify(target)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Creates a new Notes object
   * @param owner Vesperize object
   * @constructor
   */
  var Notes = function (owner) {
    this.vault        = {};
    this.vault[owner] = [];
    this.owner        = owner;
    this.counter      = 0;
  };

  /**
   * Builds a note object.
   * @param text something the user wants to write about some selection.
   * @param range location of selection
   * @return {{text: *, range: *[]}}
   */
  Notes.buildNote = function(text, range){
    return {
      'text': text
      , 'range': range
    };
  };

  Notes.formatNote = function(note){
    var location = note.range;
    var text     = note.text;
    return {
      'from': (location.from.line + ';' + location.from.col + ';' + location.from.offset),
      'to': (location.to.line + ';' + location.to.col + ';' + location.to.offset),
      'text': text,
      'username': 'You'
    };
  };


  /**
   * Adds a note object.
   *
   * @param note a JSON object produced by calling Notes.buildNote(...)
   * @param callback callback of the form function({payload : {size: 1}})
   */
  Notes.prototype.addNote = function(note, callback){
     if(!contains(this.vault[this.owner], note)){
       this.vault[this.owner].push(note);
       var that = this;
       if(callback){
         callback({
           'payload': {
             'size': that.size()
           }
         });
       }
     }
  };

  /**
   * Clears all collected notes.
   */
  Notes.prototype.clear = function(){
    this.vault[this.owner] = [];
  };

  /**
   * Returns the currently positioned note.
   */
  Notes.prototype.current = function(){
    return this.vault[this.owner][this.counter];
  };

  /**
   * Gets the note at a given index.
   *
   * @param idx the location where a note is stored.
   * @return {*} the note object.
   */
  Notes.prototype.getNote = function(idx){
    if(idx < 0 || idx > this.size()) {
      return null;
    }

    return this.vault[this.owner][idx];
  };

  /**
   * Returns the note after the current one; then this will
   * become the current note.
   */
  Notes.prototype.next = function(){
    this.counter++;
    if(this.counter > this.size() - 1){
      this.counter = 0;
    }

    return this.current();
  };

  /**
   * Returns the note before the current one; then this will
   * become the current note.
   */
  Notes.prototype.previous = function(){
    this.counter--;
    if(this.counter < 0){
      this.counter = (this.size() - 1);
    }

    return this.current();
  };

  /**
   * Returns the number of comments contained in this object.
   */
  Notes.prototype.size = function(){
     return this.vault[this.owner].length;
  };

  /**
   * Returns the array representation of Notes.
   * @param formatter strategy that formats each entry in the Notes object.
   * @return {*} the array of notes
   */
  Notes.prototype.toArray = function(formatter){
    var result = [];
    var N      = this.size();

    var idx, note;

    if(!formatter){
      for(idx = 0; idx < N; idx++){
        note = this.getNote(idx);
        result.push(note);
      }
    } else {
      for(idx = 0; idx < N; idx++){
        note = this.getNote(idx);
        result.push(formatter(note));
      }
    }

    return result;
  };

  /**
   * Returns the array representation (no formatting) of Notes.
   * @return {*} the array of notes
   */
  Notes.prototype.toRawArray = function(){
    return this.toArray(null);
  };

  /**
   * Returns the array representation (with formatting) of Notes.
   * @return {*} the array of notes
   */
  Notes.prototype.toHashArray = function(){
    return this.toArray(Notes.formatNote);
  };

  return Notes;
})();