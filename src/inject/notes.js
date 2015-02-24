/**
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
 */
var Notes = (function () {
  "use strict";

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
   * @param chunk annotated chunk
   * @return {{text: *, range: *[]}}
   */
  Notes.buildNote = function(text, range, chunk){
    return {
      'text': text
      , 'range': range
      , 'marked': chunk
    };
  };


  function validRange(range){
    return range.from.line != -1 && range.from.col != -1
      && range.to.line != -1 && range.to.col != -1;
  }

  Notes.chunkContent = function(content, location){
    if("" === content || !content || !validRange(location)) {
      return "<NONE>";
    }

    var markedDoc = new Editor.Doc(content, 'text/x-java');
    var from = {'line':location.from.line, 'ch':location.from.col};
    var to   = {'line':location.to.line, 'ch':location.to.col};

    var marked    = getBetween(markedDoc, from, to);
    return marked.join("\n");
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

  function jumpToLine(editor, i) {
    var t = editor.charCoords({line: i, ch: 0}, "local").top;
    var middleHeight = editor.getScrollerElement().offsetHeight / 2;
    editor.scrollTo(null, t - middleHeight - 5);
  }

  Notes.nextNote = function(that){
    var next     = that.notes.next();
    if(!next) { return; }
    var text     = next.text;
    var location = next.range;

    var from = {'line':location.from.line, 'ch':location.from.col};
    var to   = {'line':location.to.line, 'ch':location.to.col};

    (function(f, t, c){
      var editor = c.codemirror;
      c.codemirror.operation(function() {
        editor.getDoc().setSelection(f, t);
        jumpToLine(editor, f.line);
      });
    })(from, to, that);

    text = text.substring(0, 1).toUpperCase() + text.substring(1);
    that.displayer.text(text);
    that.codemirror.focus();
  };


  function getBetween(doc, start, end) {
    var out = [], n = start.line;
    doc.iter(start.line, end.line + 1, function(line) {
      var text = line.text;
      if (n == end.line) text = text.slice(0, end.ch);
      if (n == start.line) text = text.slice(start.ch);
      out.push(text);
      ++n;
    });
    return out;
  }

  // http://en.wikibooks.org/wiki/Algorithm_Implementation/Strings/Dice's_coefficient
  function diceCoefficient(string1, string2) {
    var intersection = 0;
    var length1 = string1.length - 1;
    var length2 = string2.length - 1;
    if(length1 < 1 || length2 < 1) return 0;
    var bigrams = [];
    var i;
    for(i = 0; i < length2; i++) {
      bigrams.push(string2.substr(i,2));
    }

    for(i = 0; i < length1; i++) {
      var eachBigram = string1.substr(i, 2);
      for(var j = 0; j < length2; j++) {
        if(eachBigram == bigrams[j]) {
          intersection++;
          bigrams[j] = null;
          break;
        }
      }
    }

    return (2.0 * intersection) / (length1 + length2);
  }


  Notes.copyNotes = function(key, array){
    array = array || [];
    var notes  = new Notes(key);
    var len    = array.length;
    for(var n = 0; n < len; n++){
      var aNote = array[n];
      notes.addNote(aNote);
    }
    return notes;
  };

  function rebuildNote(content, expected, note, notes){
    var startOffset = content.indexOf(expected);
    if(startOffset != -1){
      var endOffset   = startOffset + expected.length;
      var newRange    = Utils.createLocation(content, startOffset, endOffset);
      if(validRange(newRange)){
        var newNote = note;
        newNote.range = newRange;
        notes.addNote(newNote);
      }
    }
  }


  Notes.transfer = function(v, notes/*Notes object*/){
    var newNotes = new Notes(v.primaryKey);
    var editor   = v.codemirror;
    var value    = editor.getValue() || "";

    var array    = notes.toRawArray();
    var len      = array.length;

    for(var idx = 0; idx < len; idx++){
      // from: {line, ch}, to: {line, ch}
      var range  = array[idx].range;
      var from   = {'line': range.from.line, 'ch': range.from.col};
      var to     = {'line': range.to.line, 'ch': range.to.col};
      var expected  = array[idx].marked;
      var select    = getBetween(editor.getDoc(), from, to);
      if(select && select.length > 0){
        var current   = select.join("\n");
        var similar   = diceCoefficient(expected, current);
        if(similar == 1){
          newNotes.addNote(array[idx])
        } else {
          rebuildNote(value, expected, array[idx], newNotes);
        }
      } else {
        rebuildNote(value, expected, array[idx], newNotes);
      }
    }

    return newNotes;
  };


  /**
   * Adds a note object.
   *
   * @param note a JSON object produced by calling Notes.buildNote(...)
   * @param callback callback of the form function({payload : {size: 1}})
   */
  Notes.prototype.addNote = function(note, callback){
     if(!Utils.contains(this.vault[this.owner], note)){
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

  Notes.prototype.empty = function(){
    return this.size() == 0;
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

  /**
   * Return a JSON representation of the Notes object.
   * @return {{notes: *}}
   */
  Notes.prototype.toJSON = function(){
    return {'notes': this.toRawArray() }
  };

  return Notes;
})();