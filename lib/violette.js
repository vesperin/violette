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

})();;/**
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
 */
var Utils = (function ($, module) {
  "use strict";

  function deleteButtonHandler(v, name){
    var handlerIndex = v.handler.indexOf(name);
    if(handlerIndex > -1){
      delete v.handler[handlerIndex];
      delete v.callback[handlerIndex];
      v.log.debug(name + " handler was deleted");
    }
  }

  function isStringEmpty(text){
    return text == null || text.length == 0;
  }

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

  function getContent(v, container){
    var currentContent = null;
    if (!container.is('textarea')) { // it must be a `pre` element
      var rawContent = (v.content != null
        ? v.content
        : container.text()
      );

      currentContent = $.trim(rawContent);

      if (container.is('div')) {
        currentContent = currentContent
          .replace(/(<([^>]+)>)/ig, "") // strip html tags
          .replace(/ +(?= )/g, '')      // strip numerous whitespaces
          .replace(/^ +/gm, '');       // trim each line
      }

    }

    return currentContent;
  }

  /**
   * thx to https://github.com/peterflynn/simple-sloc-counter
   * Counts lines of code in given text.
   * Throws 'Unsupported' exception in cases where it's not possible to give an accurate count.
   * @return {{total: number, sloc: number}}
   */
  function countSloc(text) {

    var lines = text.split(/\r\n|\r|\n/);

    var codeLines = 0;
    var inBlockComment = false;
    var inString = false;
    var stringDelim;
    lines.forEach(function (line, lineNum) {

      var i;
      var sawCode = false;
      for (i = 0; i < line.length; i++) {
        var c = line[i];
        if (inBlockComment) {
          if (c === "/" && line[i - 1] === "*") {
            inBlockComment = false;
          }
        } else if (inString) {
          sawCode = true;
          if (c === stringDelim) {
            inString = false;
          } else if (c === "\\") {
            i++;  // skip next char (escaped char)
          }
        } else {
          // ignore all whitespace
          if (c !== " " && c !== "\t") {
            // opening of string
            if (c === "\"" || c === "'") {
              sawCode = true;
              inString = true;
              stringDelim = c;
            } else if (c === "/") {
              // opening of comment - MAYBE
              if (line[i + 1] === "*") {
                inBlockComment = true;
                i++;  // (no point in looking at the "*" again)
              } else if (line[i + 1] === "/") {
                break;  // rest of line is a line comment
              } else {
                sawCode = true;

                // A "/" also might be the start of a regexp literal. Detecting regexps is INSANELY difficult in JS
                // and basically requires fully parsing the code. We care because, like a string literal, the regexp
                // could contain strings like /* or " that we'd misinterpret. (Detecting where a regexp ENDS is no
                // mean feat either, btw).
                // So, we cheat: we only care about the rest of the line if it might contain something that affects
                // how we count LATER lines. All other cases are unambiguous without us knowing whether a regexp is
                // present or not.
                if (line.indexOf("/*", i + 1) !== -1) {
                  throw ("Potential block comment start following potential regular expression on same line" + lineNum);
                } else if (line.indexOf("\"", i + 1) !== -1 || line.indexOf("'", i + 1) !== -1) {
                  var trimmed = line.trim();
                  if (trimmed[trimmed.length - 1] === "\\") {
                    throw ("Potential multi-line string literal following potential regular expression on same line" + lineNum);
                  }
                }
                break;  // ignore rest of line since we're not sure if it's a regexp and if so, where it ends
              }
            } else {
              sawCode = true;

              // mainly as a self-check, error out if we see a block-comment close when we think we're not in a block comment
              if (c === "*" && line[i + 1] === "/") {
                throw ("Unexpected */ when not in a block comment" + lineNum);
              }
            }
          }
        }
      }

      if (sawCode) {
        codeLines++;
      }
      if (inString && line[line.length - 1] !== "\\") {
        throw ("Unclosed string at end of line" + lineNum);
      }
    });

    if (inBlockComment) {
      throw ("Unclosed block comment at end of file");
    } else if (inString) {
      throw ("Unclosed string at end of file");
    }

    return { total: lines.length, sloc: codeLines };
  }



  /**
   * Generates a number between two numbers.
   *
   * @param min left bound
   * @param max right bound
   * @return {*} a random number in between two two numbers.
   */
  function random(min, max) {
    return min + uniform(max - min);
  }

  /**
   * Gets an integer uniformly between 0 (inclusive) and N (exclusive).
   *
   * @param N upper bound
   * @return {number} integer uniformly generated between 0 and N.
   */
  function uniform(N) {
    return Math.floor(Math.random() * N);
  }


  /**
   * (Branding) Generate a unique id
   *
   * @param tag element's tag or label (non null)
   */
  function brand(tag) {
    return tag + '-' + random(1, 10000);
  }

  /**
   * Ensures a given task doesn't fire so often that it bricks browser performance.
   *
   * @param func function to be fired.
   * @param wait fire rate limit in milliseconds
   * @param immediate true if we should fire the task immediately.
   * @return {Function}
   */
  function debounce(func, wait, immediate) {
    var timeout;
    return function () {
      var context = this, args = arguments;
      var later = function () {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }

  /**
   * Creates the range of text to select and selects it
   */
  module.selectText = function(element) {
    var range, selection;

    if (document.body.createTextRange) {
      range = document.body.createTextRange();
      range.moveToElementText(element);
      range.select();
    } else if (window.getSelection) {
      selection = window.getSelection();
      range = document.createRange();
      range.selectNodeContents(element);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  /**
   * Creates a location object (range of a selection)
   *
   * @param contents code example content
   * @param startOffset start offset
   * @param endOffset   end offset
   * @return {*} location object.
   */
  module.createLocation = function (contents, startOffset, endOffset) {

    if (!(startOffset < 0 || endOffset < startOffset)) {

      if (!contents) {
        return {
          'from': {'line': -1, 'col': -1, 'offset': startOffset},
          'to': {'line': -1, 'col': -1, 'offset': endOffset}
        }
      }

      var size = contents.length;
      endOffset = Math.min(endOffset, size);
      startOffset = Math.min(startOffset, endOffset);

      var line = 0;
      var lineOffset = 0;
      var prev = 0;


      var start;
      for (var offset = 0; offset <= size; offset++) {
        if (offset == startOffset) {
          start = {'line': line, 'col': offset - lineOffset, 'offset': offset};
        }

        if (offset == endOffset) {
          var end = {
            'line': line,
            'col': offset - lineOffset,
            'offset': offset
          };
          return {
            'from': start,
            'to': end
          };
        }

        var c = contents.charAt(offset);
        if (c == '\n') {
          lineOffset = offset + 1;
          if (prev !== '\r') {
            line++;
          }
        } else if (c == '\r') {
          line++;
          lineOffset = offset + 1;
        }

        prev = c;
      }
    }

    // faulty location
    return {
      'from': {'line': -1, 'col': -1, 'offset': startOffset},
      'to': {'line': -1, 'col': -1, 'offset': endOffset}
    }
  };

  /**
   * generates the location of a code selection.
   *
   * @param cm codemirror
   * @param content code example's content
   * @param selection user selection
   * @return location object
   */
  module.selectionLocation = function(cm, content, selection){
    var from = cm.getCursor("from");

    var lines = content.split('\n');
    var targetLine = from.line;

    var count = 0;
    var location;
    for (var i = 0; i < lines.length; i++) {
      if (targetLine == i) {
        var offsetStart = count + from.line + from.ch;
        var offsetEnd = offsetStart + selection.length;

        location = module.createLocation(content, offsetStart, offsetEnd);

        break;
      } else {
        count += lines[i].length;
      }
    }

    location = location || null;

    return location;
  };

  /**
   * calculates the offsets of a code selection.
   *
   * @param cm codemirror
   * @param content code example's content
   * @param selection user selection
   * @return {{start: number, end: number}}
   */
  module.selectionOffsets = function (cm, content, selection) {
    var location = module.selectionLocation(cm, content, selection);

    var start = 0;
    var end = 0;

    if (location) {
      start = location.from.offset;
      end = location.to.offset;
    }

    return {
      'start': start,
      'end': end
    };
  };


  module.createCode = function (name, description,
                                content, tags, datastructures,
                                algorithms, refactorings,
                                confidence, comments, elapsedtime, id) {
    tags = tags || [];
    datastructures = datastructures || [];
    algorithms = algorithms || [];
    refactorings = refactorings || [];
    confidence = confidence || 0;
    comments = comments || [];
    elapsedtime = elapsedtime || "";
    id          = id || "new";

    var url = document.location.href;
    var birthday = Date.now();

    description = description || 'Java: *scratched* code snippet';
    return {
      'id': id,
      'name': name,
      'description': description,
      'content': content,
      'elapsedtime': elapsedtime,
      'tags': tags,
      'datastructures': datastructures,
      'algorithms': algorithms,
      'refactorings': refactorings,
      'confidence': confidence,
      'comments': comments,
      'url': url,
      'birthday': birthday
    }
  };


  module.brand      = brand;
  module.debounce   = debounce;
  module.count      = countSloc;
  module.getContent = getContent;
  module.contains   = contains;

  module.deleteButtonHandler  = deleteButtonHandler;
  module.isStringEmpty        = isStringEmpty;

  return module;

})(window.jQuery, Utils || {});;/**
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
 */
var Matcher = (function ($, module) {
  "use strict";

  /**
   * Checks whether a given text matches a regular expression (pattern).
   *
   * @param text the text to be checked.
   * @param pattern the regular expression
   * @return {boolean} true if we have a match; false otherwise.
   */
  function matches(text, pattern) {
    var matches = [];
    text.replace(pattern, function () {
      //arguments[length - 1] is the entire match

      if (arguments && arguments.length > 0) {
        for (var idx = 0; idx < arguments.length; idx++) {
          var match = arguments[idx];
          if (text === match) {
            matches.push(match);
          }
        }
      }
    });

    return matches.length > 0; // found at least one 'FULL' match
  }

  /**
   * Checks whether a given text is a Java comment.
   *
   * @param text the text to be inspected.
   * @return {boolean} true if it is; false otherwise.
   */
  function isComment(text) {
    var commentMatch = /(\/\*[\w'\s\r\n\*]*\*\/)|(\/\/[\w\s']*)/gm;
    return matches(text, commentMatch);
  }

  /**
   * Checks whether a given text is a Java import.
   *
   * @param text the text to be inspected.
   * @return {boolean} true if it is; false otherwise.
   */
  function isImport(text){
    var pattern = /import[^;=\n]*\s[\S\s]*?(?=;)/;
    return matches(text, pattern);
  }

  /**
   * Checks whether a given text is a Java class.
   *
   * @param text the text to be inspected.
   * @return {boolean} true if it is; false otherwise.
   */
  function isClass(text){
    var pattern = /class[^;=\n]*\s[\S\s]*?(?={)/;
    return matches(text, pattern);
  }

  /**
   * Checks whether a given text is a Java method.
   *
   * @param text text the text to be inspected.
   * @return {boolean} true if it is; false otherwise.
   */
  function isMethod(text) {
    var methodMatch = /^\s*?(((public|private|protected|static|final|native|synchronized|abstract|threadsafe|transient)\s+?)*)\s*?(\w+?)\s+?(\w+?)\s*?\(([^)]*)\)[\w\s,]*?(?={)?\s*?/;
    return matches(text, methodMatch);
  }

  /**
   * Extracts a class name (if any) from some code example content.
   * @param text code example's content
   * @param defaultName if none is found, then use the default class name.
   * @return {*} class name (string)
   */
  function matchClassName(text, defaultName) {
    var findClass = /class[^;=\n]*\s[\S\s]*?(?={)/g;
    var matches = [];
    text.replace(findClass, function () {
      //arguments[0] is the entire match
      var first = arguments[0];
      if (first && first.length > 0) {
        matches.push(first.replace('\n', ' ').split(' ')[1]);
      }
    });

    // we are interested in the first hit
    var result = matches[0];

    return result ? result : defaultName;
  }

  module.matches        = matches;
  module.isComment      = isComment;
  module.isMethod       = isMethod;
  module.matchClassName = matchClassName;
  module.isImport       = isImport;
  module.isClass        = isClass;


  return module;
})(window.jQuery, Matcher || {});;/**
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
        'Origin', b, a, v.notes.toJSON()
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
})();;/**
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
    $.scrollLock();
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
    $.scrollLock();
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
})();;/**
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
 */
var Html = (function ($, module) {
  "use strict";

  // rating bar template
  var template =
    '<select id="example-c" name="rating">' +
    '   <option value=""></option>'   +
    '   <option value="1">1</option>' +
    '   <option value="2">2</option>' +
    '   <option value="3">3</option>' +
    '   <option value="4">4</option>' +
    '   <option value="5">5</option>' +
    '</select>';

  /**
   * Builds an HTML element.
   *
   * @param tag element we are interested in building.
   * @param html the content inside the element
   * @param attrs a JSON object containing attributes of the element.
   * @return {*|HTMLElement} the built HTML element.
   */
  module.buildHtml = function(tag, html, attrs){
    // you can skip html param
    if (typeof(html) != 'string') {
      attrs = html;
      html = null;
    }

    var h = '<' + tag;
    for (var attr in attrs) {
      if (attrs.hasOwnProperty(attr)) {
        if(attrs[attr] === false) continue;
        h += ' ' + attr + '="' + attrs[attr] + '"';
      }
    }

    h += html ? ">" + html + "</" + tag + ">" : "/>";

    return $(h);
  };


  /**
   * Generates the top section of Vesperize (the header).
   *
   * @param v Vesperize object
   * @return {*|HTMLElement}
   */
  module.buildHeader = function(v) {
    var top = module.buildHtml('div', {
      'class': 'violette-header  btn-toolbar'
    }, {});

    top = buildBoxHeader(v, top);

    return top;
  };

  /**
   * Generates the bottom section of Vesperize (the footer).
   *
   * @param v Vesperize object
   * @return {HTMLElement} => [T] [C] [R] [C] _more options_  [Finish]
   */
  module.buildFooter = function(v){
    var bottom = module.buildHtml('div', {
      'class': 'violette-footer'
    }, {});

    var toolbar = module.buildHtml('div', {
      'class': 'btn-toolbar'
      , 'style': 'margin-top: 5px;'
    }, {});

    toolbar = buildLeftBox(v, toolbar, v.options.modes);
    toolbar = buildRightBox(v, toolbar, v.options.social);

    v.staging = module.buildHtml('div', {'class': 'violette-multistage btn-toolbar'}, {});
    bottom.append(v.staging);
    bottom.append(toolbar);

    v.staging.hide();

    return bottom;
  };

  function buildLeftBox(v, container, actions){
    var leftBox   = module.buildHtml('span', {'class': 'tabnav-left'}, {});
    container = buildBoxFooter(v, container, leftBox, actions, true);
    return container;
  }

  function buildRightBox(v, container, actions){
    var rightBox  = module.buildHtml('span', {'class': 'tabnav-right'}, {});
    container = buildBoxFooter(v, container, rightBox, actions);
    return container;
  }

  function buildBoxFooter(v, container, box, actions, linked) {
    linked      = linked || false;
    var len     = actions.length;

    for(var i = 0; i < len; i++){
      // octicon-button
      var group   = module.buildHtml('div', { 'class': 'btn-group'}, {});
      var action  = actions[i];

      var name  = action.name;
      var title = action.title;
      var icon  = action.icon;
      var cb    = action.callback;

      var hasLabel = typeof(action.label) !== 'undefined';

      var iconStr = (!hasLabel
        ? '<span class="' + icon + '"></span>'
        : '<span class="' + icon + '"></span>&nbsp;&nbsp;' + action.label
      );


      var handler = v.namespace + '-' + name;


      var buttonHtml = (hasLabel
        ? buildOcticonFooterButton(name, title, v, handler, iconStr, linked)
        : buildOcticonButton(name, title, v, handler, iconStr)
      );

      buttonHtml.tooltipster({
          position: 'top',
          hideOnClick: true,
          theme: 'tooltip-custom-theme'
        }
      );

      v.handler.push(handler);
      v.callback.push(cb);

      box.append(buttonHtml);

    }

    container.append(box);

    return container;  // DOM container including a nice-looking button group
  }

  function buildDivider(){
    return module.buildHtml('span', {'class':'meta-divider'}, {});
  }

  function buildExtraInfo(text){
    return module.buildHtml('span', ' ' + text + ' ', {'class': 'extra'});
  }

  function buildInfoSection(v, infocontainer){
    v.status    = module.buildHtml('span', 'NOT SAVED ', {'class': 'status'});
    var cured   = v.content.replace(/\r\n|\r/g, '\n');
    var result  = Utils.count(cured);
    var lines   = result.total + ' lines (' + result.sloc + ' sloc)';
    v.sloc      = buildExtraInfo(lines);

    infocontainer.append(v.status);
    infocontainer.append(buildDivider());
    infocontainer.append(v.sloc);

    return infocontainer;
  }

  function buildOcticonButton(name, title, v, handler, iconStr){
    var isTrash = name == 'delete';
    return module.buildHtml('button', iconStr, {
      'type': 'button'
      , 'class': !isTrash ? 'violette-button octicon-button btn-dark-link' : 'violette-button octicon-button danger btn-dark-link'
      , 'title': title
      , 'data-provider': v.namespace
      , 'data-handler': handler
    });
  }

  function buildOcticonFooterButton(name, title, v, handler, iconStr, linked){
    var darkTheme = name === 'document';
    var addon     = (linked
      ? 'violette-button octicon-button btn-dark-link'
      : (darkTheme
      ? 'violette-button minibutton dark'
      : 'violette-button minibutton'
    )
    );

    var buttonHtml = module.buildHtml('button', iconStr, {
      'type': 'button'
      , 'class': addon
      , 'title': title
      , 'data-provider': v.namespace
      , 'data-handler': handler
    });

    if(linked){ // only for actions in the modes array
      buttonHtml.css({
        'font-size': '13px'
        , 'color': '#666'
        , 'margin-top': '2px'
        , 'text-decoration': 'none'
      });

      buttonHtml.hover(function(){
        buttonHtml.css({
          'font-size': '13px'
          , 'color': '#4183c4'
          , 'margin-top': '2px'
          , 'text-decoration': 'none'
        });
      }, function(){
        buttonHtml.css({
          'font-size': '13px'
          , 'color': '#666'
          , 'margin-top': '2px'
          , 'text-decoration': 'none'
        });
      });
    }

    return buttonHtml;
  }


  function buildMiniButton(title, v, handler, iconStr){
    return module.buildHtml('button', iconStr, {
      'type': 'button'
      , 'class': 'violette-button minibutton'
      , 'title': title
      , 'data-provider': v.namespace
      , 'data-handler': handler
    });
  }

  function buildClosingButton(v){
    return module.buildHtml('button', '<span class="octicon octicon-x" aria-hidden="true"></span>', {
      'class': 'close'
      , 'aria-label': 'Close'
      , 'data-provider': v.namespace
      , 'data-handler': v.namespace + '-' + 'close'
    });
  }


  function buildNextButton(v){
    return module.buildHtml('button', '<span class="octicon octicon-arrow-right" aria-hidden="true"></span>', {
      'class': 'next'
      , 'aria-label': 'Next'
      , 'data-provider': v.namespace
      , 'data-handler': v.namespace + '-' + 'next'
      , 'title': 'Next note'
    });
  }


  function buildNoteSection(v){
    v.staging.removeClass('violette-history');
    v.staging.attr('class', 'violette-multistage');
    v.staging.css({
      'height': '25px'
    });

    var left  = Html.buildHtml('span', {'class': 'tabnav-left'}, {});

    v.displayer = Html.buildHtml('span', '', {'class': 'note'});
    var bookmarked = Html.buildHtml('span', '', {'class': 'octicon octicon-light-bulb'});
    left.append(bookmarked);
    left.append(Html.buildHtml('span', {'class':'divider'}, {}));
    left.append(v.displayer);

    var right = Html.buildHtml('span', {'class': 'tabnav-right'}, {});
    right.append(Html.buildNextButton(v));
    right.append(Html.buildHtml('span', {'class':'break'}, {}));
    right.append(Html.buildClosingButton(v));

    v.staging.append(left);
    v.staging.append(right);

    return v.staging;
  }


  function buildStars(d, container){
    var starbox = Html.buildHtml('div', {
      'id': Utils.brand("starbox")
      , 'class': 'input select rating-c'
      , 'for': 'example-c'
      , 'style': 'padding: 15px;margin-bottom:-20px;'
    }, {});

    var heading = '<span class="octicon octicon-bookmark"></span> ';
    heading     = heading + 'How much confident are you on whether this code is reusable?';

    var title = Html.buildHtml('div', {
      'id': Utils.brand("intent-title")
      , 'class': 'titlearea'
    });

    var q = Html.buildHtml('label', heading, {});
    var qHelpText  = 'Click on a bar to vote. Bar 1 is for ' +
      'no confident at all and bar 5 is for totally confident.';
    var qHelp = Html.buildHtml('p', qHelpText, {
      'class': 'help-block'
      , 'style': 'font-weight: normal;'
    });

    title.append(q);
    title.append(qHelp);

    var select = $(template);

    starbox.append(title);
    starbox.append(select);

    var bigD = d;
    select.barrating('show', {
      initialRating:bigD.getConfidence(),
      showValues:true,
      showSelectedRating:false,
      onSelect:function(value, text) {
        bigD.log.info("New rating set (value=" + value + "; text=" + text + ")");
        bigD.setConfidence(parseInt(value));
      }
    });

    container.append(starbox);


    return container;
  }

  function buildLinks(options, text){
    var tweet  = text;
    var hyperlinkTarget     = (options.hyperlinkTarget != '') ? 'target="_' + options.hyperlinkTarget + '"' : '';
    var mentionTarget       = (options.mentionTarget != '') ? 'target="_' + options.mentionTarget + '"' : '';
    var hashtagTarget       = (options.hashtagTarget != '') ? 'target="_' + options.hashtagTarget + '"' : '';
    var hyperlinkClass      = (options.hyperlinkClass != '') ? 'class="' + options.hyperlinkClass + '"' : '';
    var mentionClass        = (options.mentionClass != '') ? 'class="' + options.mentionClass + '"' : '';
    var hashtagClass        = (options.hashtagClass != '') ? 'class="' + options.hashtagClass + '"' : '';
    var hyperlinkRel        = (options.hyperlinkRel != '') ? 'rel="' + options.hyperlinkRel + '"' : '';
    var mentionRel          = (options.mentionRel != '') ? 'rel="' + options.mentionRel + '"' : '';
    var hashtagRel          = (options.hashtagRel != '') ? 'rel="' + options.hashtagRel + '"' : '';

    if (options.excludeHyperlinks != true) {
      tweet = tweet.replace(/(https\:\/\/|http:\/\/)([www\.]?)([^\s|<]+)/gi, '<a href="$1$2$3" ' + hyperlinkTarget + ' ' + hyperlinkClass + ' ' + hyperlinkRel + '>$1$2$3</a>');
      tweet = tweet.replace(/([^https\:\/\/]|[^http:\/\/]|^)(www)\.([^\s|<]+)/gi, '$1<a href="http://$2.$3" ' + hyperlinkTarget + ' ' + hyperlinkClass + ' ' + hyperlinkRel + '>$2.$3</a>');
      tweet = tweet.replace(/<([^a]|^\/a])([^<>]+)>/g, "&lt;$1$2&gt;").replace(/&lt;\/a&gt;/g, "</a>").replace(/<(.)>/g, "&lt;$1&gt;").replace(/\n/g, '<br />');
    }

    if (options.excludeMentions != true) {
      if (options.mentionIntent == false) {
        tweet = tweet.replace(/(@)([a-zA-Z0-9_]{1,20})/g, '<a href="http://twitter.com/$2" '
        + mentionTarget + ' '
        + mentionClass + ' '
        + mentionRel + '>$1$2</a>');
      } else {
        tweet = tweet.replace(/(@)([a-zA-Z0-9_]{1,20})/g, '<a href="http://twitter.com/intent/user?screen_name=$2">$1$2</a>');
      }
    }

    if (options.excludeHashtags != true) {
      tweet = tweet.replace(/(#)(\w+)/g, '<a href="https://twitter.com/search/?src=hash&q=%23$2" '
      + hashtagTarget + ' '
      + hashtagClass + ' '
      + hashtagRel
      + '>$1$2</a>');
    }

    return tweet;
  }


  function buildIntentArea(d, container){

    // intent container
    var intentbox = Html.buildHtml('div', {
      'id': Utils.brand("intentbox")
      , 'style': 'padding: 15px;'
    });


    var heading = '<span class="octicon octicon-light-bulb"></span> ';
    heading     = heading + 'What is the intent behind this code example?';

    var title = Html.buildHtml('div', {
      'id': Utils.brand("intent-title")
      , 'class': 'titlearea'
    });


    var question = Html.buildHtml('label', heading, {});
    var questionHelpText  = 'Provide a description of the goal behind this code and the reason for using it.';
    var questionHelp = Html.buildHtml('p', questionHelpText, {
      'class': 'help-block'
      , 'style': 'font-weight: normal;'
    });


    title.append(question);
    title.append(questionHelp);

    var intent = Html.buildHtml('form', {
      'id': Utils.brand("intent")
      , 'name': 'intent'
    });

    var composer = Html.buildHtml('div', {
      'id': Utils.brand('composer')
      , 'placeholder': 'Intent of code example?'
      , 'class': 'intent-composer'
      , 'contenteditable': true
    }, {});

    if(Utils.isStringEmpty(composer.text()) || composer.text().length > 80){
      container.saveButton.attr('disabled', 'disabled');
    }

    var fieldSet  = Html.buildHtml('fieldset', {'class': 'tabnav-right'}, {});
    var charCount = Html.buildHtml('span', {'id': Utils.brand('char-count'),'class': 'char-count'}, {});
    var inputObj  = module.buildHtml('div', {}, {});

    inputObj.prepend('You have ');
    inputObj.append(charCount);
    inputObj.append(' characters left');

    fieldSet.append(inputObj);

    intent.append(composer);
    intent.append(fieldSet);


    charCount.text(parseFloat(d.options.textLength - d.getDescription().length));
    var bigD = d;
    composer.on('click', function(){
      $(this).text(bigD.getDescription());
      bigD.moveCursorToEnd($(this)[0]);
      $(this).focus();
    });

    composer.on('blur', function(){
      var $this = $(this);
      if(Utils.isStringEmpty($this.text())
        && Utils.isStringEmpty(bigD.getDescription())){

        $this.removeClass("focus");

      } else {
        if($this.hasClass('focus')){
          $this.removeClass('focus');
        }

        $this.html(buildLinks(bigD.options, bigD.getDescription()));
      }

    });

    composer.on('keyup', function(){
      var tweetCount      = $(this).text().length;
      var remainingChars  = parseFloat(d.options.textLength - tweetCount);

      if(remainingChars <= 20){
        charCount.addClass('warning');
      } else {
        charCount.removeClass('warning');
      }

      charCount.text(remainingChars);
      bigD.setDescription($(this).text());

      if(tweetCount >= 80 || tweetCount <= 11/*min-max text range*/){
        inputObj.attr('disabled', 'disabled');
        container.saveButton.attr('disabled', 'disabled');
      } else {
        inputObj.removeAttr('disabled');
        container.saveButton.removeAttr('disabled');
      }
    });

    if(!Utils.isStringEmpty(d.getDescription())){
      composer.html(buildLinks(bigD.options, bigD.getDescription()));
      composer.focus();
    }

    intentbox.append(title);
    intentbox.append(intent);

    container.append(intentbox);

    return container;
  }


  function buildTagsArea(d, container){

    var heading = '<span class="octicon octicon-tag"></span> ';
    heading     = heading + 'Tags';

    // 1
    var title = Html.buildHtml('label', heading, {
      'id': Utils.brand("tags-title")
      , 'for': 'tag'
      , 'class': 'control-label'
      , 'style': 'margin-bottom: 10px;'
    });



    // 2
    var tags = Html.buildHtml('div', {
      'class': 'tagging'
      , 'data-tags-input-name': 'taggone'
    }, {});

    // 3
    var helpText  = 'Press Enter, Comma or Spacebar to create a new tag, ' +
      'Backspace or Delete to remove the last one. You could either write @ (topic), ' +
      '# (datastructure), or ~ (algorithm) along with a text.';
    var help = Html.buildHtml('p', helpText, {
      'class': 'help-block'
      , 'style': 'font-size: 14px;'
    });

    // tags container
    var tagbox = Html.buildHtml('div', {
      'id': Utils.brand("tags")
      , 'class': 'tags'
      , 'placeholder': 'Enter new Tag'
    });

    tagbox.append(title);
    tagbox.append(tags);
    tagbox.append(help);

    container.append(tagbox);

    var bigD = d;
    d.options.tagging.subscriber = function(array){
      if(array && array.length > 0){
        bigD.setTags(array);
      }
    };

    // provide our own options to the tagging plugin
    tags.tagging(d.options.tagging);
    tags.tagging( "add", d.getTags());

    return container;
  }

  function bindCodeEvents(code){
    var flag;
    code.on('mousedown', function() {
      flag = 0;
    });

    code.on('mousemove', function(){
      flag = 1;
    });

    code.on('mouseup', function(){
      if(flag === 0){
        Utils.selectText($(this)[0]);
      }
    });
  }

  function buildCodeArea(d, container){

    // code container
    var codebox = Html.buildHtml('div', {
      'id': Utils.brand("codebox")
      , 'style': 'padding: 15px;'
    });


    var heading = '<span class="octicon octicon-code"></span> ';
    heading     = heading + 'Your <strong>modified code fragment</strong> is below. ' +
    'You can easily select it with just <strong>one click</strong>!';

    var title = Html.buildHtml('div', {
      'id': Utils.brand("code-title")
      , 'class': 'titlearea-light'
    });


    var codeLabel = Html.buildHtml('label', heading, {
      'style': 'font-weight: normal;'
    });
    title.append(codeLabel);

    var codecontainer = Html.buildHtml('div', {
      'id': Utils.brand("codecontainer")
    });

    var pre = Html.buildHtml('pre', {
      'style':'display: block; padding: 6px 4px; background: #fff; border: 0; margin-top:10px;'
    }, {});

    var codeid = Utils.brand('code');

    var code = Html.buildHtml('code', {
      'id': codeid
      , 'class': 'java'
      , 'style': 'font-size: 12px;'
    }, {});

    bindCodeEvents(code);

    code.html(d.getContent());
    pre.append(code);

    codecontainer.append(pre);

    codebox.append(title);
    codebox.append(codecontainer);

    container.append(codebox);

    container.codeElement =  code;

    return container;

  }

  function buildCollectedNotes(d, container){
    var notes = d.getNotes().toHashArray();
    var len   = notes.length;

    var prefix = '<span class="octicon octicon-comment-discussion" style="color: #888;"></span> ';
    var text   = prefix + len + (len > 1 ? ' Comments' : ' Comment');

    var title = Html.buildHtml('div', text, {
      'id': Utils.brand("notes-title")
      , 'class': 'notes-title'
    });

    container.append(title);

    for(var idx = 0; idx < len; idx++){
      var note = notes[idx];
      if(note){

        var from = parseInt(note.from.split(';')[0]) + 1;
        var to   = parseInt(note.to.split(';')[0]) + 1;

        var rangeText = ' [' + from + '-' + to + ']';

        var noteHtml = Html.buildHtml('blockquote', note.text, {
          'id':Utils.brand("note")
          , 'style': 'margin-left: 4px; margin-right: 10px;color: #2c3e50; font-size: 13px; margin-top:5px;'
        });

        var userHtml  = Html.buildHtml('footer', note.username + ' annotated section ' + rangeText, {});

        noteHtml.append(userHtml);
        container.append(noteHtml);
      }
    }

    return container;

  }


  /**
   * Creates Vesperize's thin header.
   *
   * @param v Vesperize object
   * @param container DOM editor
   * @return {*}   STATUS | [+]            [T] [C] [R] [C]
   */
  function buildBoxHeader(v, container) {

    var rightContainer  = module.buildHtml('span', {'class': 'tabnav-right'}, {});
    var leftContainer   = module.buildHtml('div', {'class': 'info'}, {});

    // build left container
    leftContainer = buildInfoSection(v, leftContainer);


    container.append(leftContainer);

    // build right container
    var actions = v.options.actions;
    var len     = actions.length;

    var hasButtonGroup = false;
    var group   = module.buildHtml('div', { 'class': 'button-group'}, {});
    for(var i = 0; i < len; i++){
      // octicon-button
      var action  = actions[i];

      var name  = action.name;
      var title = action.title;
      var icon  = action.icon;
      var cb    = action.callback;

      var hasLabel = typeof(action.label) !== 'undefined';

      var iconStr = (!hasLabel
        ? '<span class="' + icon + '"></span>'
        : action.label
      );

      var handler = v.namespace + '-' + name;

      var buttonHtml = (hasLabel
        ? buildMiniButton(title, v, handler, iconStr)
        : buildOcticonButton(name, title, v, handler, iconStr)
      );

      buttonHtml.tooltipster({
          position: 'bottom',
          hideOnClick: true,
          theme: 'tooltip-custom-theme'
        }
      );

      v.handler.push(handler);
      v.callback.push(cb);


      if(hasLabel){
        group.append(buttonHtml);
        hasButtonGroup = true;
      } else {
        if('plus' === name){
          leftContainer.append(buttonHtml);
        } else {
          rightContainer.append(buttonHtml);
        }
      }

    }

    if(hasButtonGroup){
      rightContainer.append(group);
    }
    container.append(rightContainer);
    container.append(leftContainer);

    return container;  // DOM container including a nice-looking button group
  }

  /**
   * Create Vesperize's thin footer
   * @param v Vesperize object
   * @param textarea text area object
   * @return {*}
   */
  function buildTextarea(v, textarea) {
    if(v.content != null){
      textarea = module.buildHtml('textarea', v.content, {
        'class': 'file-editor-textarea violette-input'
      });
    }

    v.textarea = textarea;

    return textarea;
  }

  /**
   * Generates the body section of Vesperize.
   * @param v v Vesperize object
   * @param textarea textarea element
   * @return {*|HTMLElement}
   */
  module.buildBody = function(v, textarea) {
    var body = module.buildHtml('div', {
      'id': Utils.brand('editing')
      , 'class': 'editing'
    }, {});

    body.append(buildTextarea(v,  textarea));

    return body;
  };

  /**
   * Builds the Edit tracker HTML element
   *
   * @return {*|HTMLElement}
   */
  module.buildEditTracker = function() {
    var tracker = module.buildHtml('div', {
      'id': Utils.brand('tracker')
      , 'class': 'violette-slider'
    }, {});


    return tracker;
  };

  module.buildInput = function(placeholder){
    placeholder = placeholder || "New Note?";
    var shell = module.buildHtml('div', {
      'class': 'col-md-12'
    }, {});

    var inside = '<i class="octicon octicon-pencil"></i>' +
      '<input type="text" class="form-control" style="border-color: #d6dbdf;box-shadow: none;" ' +
      'placeholder="' + placeholder + '" />';

    var entry = module.buildHtml('div', inside, {
      'class': 'right-inner-addon'
      , 'style': 'margin-left: 5px;'
    });

    shell.append(entry);

    return shell;
  };

  module.buildNextButton    = buildNextButton;
  module.buildClosingButton = buildClosingButton;
  module.buildNoteSection   = buildNoteSection;
  module.buildOcticonButton = buildOcticonButton;
  module.buildStars         = buildStars;
  module.buildIntentArea    = buildIntentArea;
  module.buildTagsArea      = buildTagsArea;
  module.buildCodeArea      = buildCodeArea;

  module.buildCollectedNotes  = buildCollectedNotes;
  return module;

})(window.jQuery, Html || {});;/**
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
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

}());;/**
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
 */
var Document = (function ($, hljs) {
  "use strict";

  var defaultDescription = 'Java: *scratched* code snippet';
  var nothing            = "";
  var editNamespace      = 'violette-scratchspace' + '-' + 'edit';
  var uploadNamespace    = 'violette-scratchspace' + '-' + 'upload';


  //From: http://www.w3.org/TR/html-markup/syntax.html#syntax-elements
  var voidNodeTags = ['AREA', 'BASE', 'BR', 'COL', 'EMBED', 'HR', 'IMG',
    'INPUT', 'KEYGEN', 'LINK', 'MENUITEM', 'META', 'PARAM', 'SOURCE',
    'TRACK', 'WBR', 'BASEFONT', 'BGSOUND', 'FRAME', 'ISINDEX'
  ];

  //From: http://stackoverflow.com/questions/237104/array-containsobj-in-javascript
  Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
      if (this[i] === obj) {
        return true;
      }
    }
    return false;
  };

  //Basic idea from: http://stackoverflow.com/questions/19790442/test-if-an-element-can-contain-text
  function canContainText(node) {
    if(node.nodeType == 1) { //is an element node
      return !voidNodeTags.contains(node.nodeName);
    } else { //is not an element node
      return false;
    }
  }

  function getLastChildElement(el){
    var lc = el.lastChild;
    if(!lc) return null;

    while(lc.nodeType != 1) {
      if(lc.previousSibling)
        lc = lc.previousSibling;
      else
        break;
    }
    return lc;
  }

  // thanks to http://stackoverflow.com/questions/1125292/how-to-move-cursor-to-end-of-contenteditable-entity
  function moveCursorToEnd(contentEditableElement) {
    while(getLastChildElement(contentEditableElement) &&
    canContainText(getLastChildElement(contentEditableElement))) {
      contentEditableElement = getLastChildElement(contentEditableElement);
    }

    var range,selection;
    if(document.createRange){ //Firefox, Chrome, Opera, Safari, IE 9+
      range = document.createRange();//Create a range (a range is a like the selection but invisible)
      range.selectNodeContents(contentEditableElement);//Select the entire contents of the element with the range
      range.collapse(false);//collapse the range to the end point. false means collapse to end rather than the start
      selection = window.getSelection();//get the selection object (allows you to change selection)
      selection.removeAllRanges();//remove any selections already made
      selection.addRange(range);//make the range you have just created the visible selection
    }
  }


  var options = {
    autofocus:  true
    , textLength: 80
    , excludeHyperlinks:  false
    , excludeMentions:    false
    , excludeHashtags:    false
    , hyperlinkTarget:    'blank'
    , mentionTarget:      'blank'
    , mentionIntent:      false
    , hashtagTarget:      'blank'
    , hyperlinkClass:     ''
    , mentionClass:       ''
    , hashtagClass:       ''
    , hyperlinkRel:       ''
    , mentionRel:         ''
    , hashtagRel:         ''
    , actions: [
      {
        name: 'edit'
        , title: 'Switch to editing mode'
        , label: 'Edit'
        , icon: 'octicon octicon-sign-in'
        , callback: function(v){
          v.log.info('Exiting documentation mode');
          // go back to scratchspace
          editCodeSnippet(v);
        }
      }
      , {
        name: 'upload'
        , title: 'Save code example '
        , label: 'Save'
        , icon: 'octicon octicon-cloud-upload'
        , callback: function(v){
          // Todo(Huascar) Why are we saving broken code? Here is the reason:
          // in Violette 1.0 we were making sure that saved code examples
          // were syntactically correct (no compiler errors)
          // in Violette 2.0 we don't do that :(
          // maybe I should send a ``broken'' flag in the source which indicates
          // the code example is broken containing the value returned by
          // Refactoring.detectPartialSnippet() method.
          v.log.info('Saving code example.');
          saveCodeExample(v);
        }
      }
    ]
    , tagging: {
      "subscriber": function(tags){},
      "case-sensitive": false,                        // True to allow differences between lowercase and uppercase
      "close-char": "&times;",                        // Single Tag close char
      "close-class": "tag-i",                         // Single Tag close class
      "edit-on-delete": true,                         // True to edit tag that has just been removed from tag box
      "forbidden-chars": [ ".", "_", "?" ],           // Array of forbidden characters
      "forbidden-chars-callback": window.alert,       // Function to call when there is a forbidden chars
      "forbidden-chars-text": "Forbidden character:", // Basic text passed to forbidden-chars callback
      "forbidden-words": [],                          // Array of forbidden words
      "forbidden-words-callback": window.alert,       // Function to call when there is a forbidden words
      "forbidden-words-text": "Forbidden word:",      // Basic text passed to forbidden-words callback
      "no-backspace": false,                          // Backspace key remove last tag, true to avoid that
      "no-comma": false,                              // Comma "," key add a new tag, true to avoid that
      "no-del": false,                                // Delete key remove last tag, true to avoid that
      "no-duplicate": true,                           // No duplicate in tag box
      "no-duplicate-callback": window.alert,          // Function to call when there is a duplicate tag
      "no-duplicate-text": "Duplicate tag:",          // Basic text passed to no-duplicate callback
      "no-enter": false,                              // Enter key add a new tag, true to avoid that
      "no-spacebar": false,                           // Spacebar key add a new tag by default, true to avoid that
      "pre-tags-separator": ", ",                     // By default, you must put new tags using a new line
      "tag-box-class": "tagging",                     // Class of the tag box
      "tag-char": "",                                 // Single Tag char
      "tag-class": "tag",                             // Single Tag class
      "tags-input-name": "tag",                       // Name to use as name="" in single tags (by default tag[])
      "tag-on-blur": true,                            // Add the current tag if user clicks away from type-zone
      "type-zone-class": "type-zone"                  // Class of the type-zone
    }

  };

  function editCodeSnippet(v){
    v.editor.children().show();
    $('textarea.file-editor-textarea').hide();

    v.editor.removeClass('violette-document');
    v.editor.addClass('violette-editor');

    // update v with updates in document
    v.confidence  = v.document.getConfidence();
    v.tags        = v.document.getTags();
    v.description = (Utils.isStringEmpty(v.document.getDescription())
      ? defaultDescription
      : v.document.getDescription()
    );

    v.exampleId   = v.document.getExampleId();
    v.tinyUrl     = v.document.getTinyUrl();

    v.document.container.children().hide();
    v.document.container.children().remove();
    // since codeElement is not a direct child of container
    // then we must hide, remove, and null it.
    v.document.container.codeElement.hide();
    v.document.container.codeElement.remove();
    v.document.container.codeElement = null;
    v.document.container.saveButton  = null;
    v.document.container.hide();
    v.document.container.remove();
    v.document.container = null;
    v.document = null;

    hljs.initHighlighting.called = false;

    var codemirror = v.codemirror;
    v.codemirror.operation(function(){
      codemirror.refresh();
    });

    Utils.deleteButtonHandler(v, editNamespace);
    Utils.deleteButtonHandler(v, uploadNamespace);
  }

  function saveCodeExample(v){
    v.stopwatch.stop();

    // 0. process elapsed time
    var elapsedtime = v.stopwatch.toString();

    var contexts        = [];
    var algorithms      = [];
    var datastructures  = [];

    var doc = v.document;

    // 1. process tags
    var tags     = doc.getTags() || [];
    var tlen     = tags.length;

    for(var t = 0; t < tlen; t++){
      var tag = tags[t];
      if(tag){
        switch (tag.charAt(0)){
          case '~':
            var algo = tag.substr(tag.indexOf('~'), tag.length).replace(/^~/, '');
            algorithms.push(algo);
            break;
          case '@':
            var topic = tag.substr(tag.indexOf('@'), tag.length).replace(/^~/, '');
            contexts.push(topic);
            break;
          case '#':
            var ds = tag.substr(tag.indexOf('#'), tag.length).replace(/^~/, '');
            datastructures.push(ds);
            break;
          default:
            // adds to context
            contexts.push(tag);
        }

      }
    }


    // 2. process notes
    var raw     = doc.getNotes().toHashArray() || [];
    var notes   = [];

    for(var n = 0; n < raw.length; n++){
      var note = raw[n];
      if(note){
        notes.push(note);
      }
    }

    // 3. process refactorings

    var drafts  = v.drafts.toArray() || [];
    var changes = [];
    for(var c = 0; c < drafts.length; c++){
      var d = drafts[c];
      if(d && d.name !== 'No changes'){
        changes.push(d.name);
      }
    }

    // 4. process content, classname, confidence & description
    var content     = doc.getContent();
    var klass       = v.classname;
    var confidence  = doc.getConfidence();
    var description = Utils.isStringEmpty(doc.getDescription())
      ? defaultDescription
      : doc.getDescription();

    // 5. process id
    var foundId = v.exampleId !== null;
    var id      = foundId ? v.exampleId : "new";

    // 5. process source
    var source = Utils.createCode(
      klass,
      description,
      content,
      contexts,
      datastructures,
      algorithms,
      changes,
      confidence,
      notes,
      elapsedtime,
      id
    );

    doc.log.info("Time spent curating example: " + elapsedtime);
    var that = v;
    if(foundId){
      Refactoring.updateCodeSnippet(source, function(reply){
        if(typeof reply.failure !== 'undefined'){
          doc.log.error("Document#saveCodeExample. " + reply.failure.message);
        }

        if(reply.info){

          that.document.setExampleId(reply.info.messages[1]);
        }

        doc.log.info("Exiting documentation mode after updating code example.");
        editCodeSnippet(that);
      });
    } else {
      Refactoring.saveCodeSnippet(source, function(reply){
        if(typeof reply.failure !== 'undefined'){
          doc.log.error("Document#saveCodeExample. " + reply.failure.message);
        }

        if(reply.info){

          that.document.setExampleId(reply.info.messages[1]);
          that.document.setTinyUrl(reply.info.messages[2]);

        }

        doc.log.info("Exiting documentation mode after saving code example.");
        editCodeSnippet(that);
      });
    }

  }


  function buildTop(v, options, container){

    var buttonToolbar = Html.buildHtml('div', {
      'class': 'btn-toolbar',
      'style':'margin-top:12px;margin-left: 8px;'
    }, {});

    var actions = options.actions;
    for(var idx = 0; idx < actions.length; idx++){
      var group   = Html.buildHtml('div', { 'class': 'button-group'}, {});

      // octicon-button
      var action  = actions[idx];

      var name    = action.name;
      var title   = action.title;
      var label   = action.label;
      var icon    = action.icon;
      var cb      = action.callback;
      var iconStr = '<span class="' + icon + '"></span> ' + label;

      var handler    = v.namespace + '-' + name;
      var buttonHtml = Html.buildOcticonButton(
        name,
        title,
        v,
        handler,
        iconStr
      );

      buttonHtml.tooltipster({
          position: 'bottom',
          hideOnClick: true,
          theme: 'tooltip-custom-theme'
        }
      );

      if(label === 'Save'){
        container.saveButton = buttonHtml;
      }

      v.handler.push(handler);
      v.callback.push(cb);

      group.append(buttonHtml);
      buttonToolbar.append(group);
    }

    var classnameText = Matcher.matchClassName(v.codemirror.getValue(), "Scratched") + '.java' ;

    var classnameHtml = Html.buildHtml('h1', classnameText, {
      'style': 'margin-top: 10px;margin-bottom: -2px;margin-left: 15px;font-family:"futura-pt",Helvetica,Arial,sans-serif;text-rendering:optimizeLegibility;'
    });

    container.append(classnameHtml);
    container.append(buttonToolbar);

    return container;
  }

  function buildMiddle(d, container){

    container = Html.buildStars(d, container);
    container = Html.buildIntentArea(d, container);
    container = Html.buildTagsArea(d, container);
    container = Html.buildCodeArea(d, container);
    return container;
  }


  function buildBottom(d, container){

    container = Html.buildCollectedNotes(d, container);

    return container;
  }

  function highlightCode(v, container){
    var code    = container.codeElement;
    v.editor.append(container);

    hljs.initHighlighting.called = false;

    code.each(function(i, block) {
      hljs.highlightBlock(block);
    });
  }

  /**
   * Public: Construct a new Document object.
   *
   * @param v Vesperize object.
   * @constructor
   */
  var Document = function (v) {
    this.options            = options;
    this.owner              = v.primaryKey;
    this.vault              = {};
    this.vault[this.owner]  = {};

    this.log                = v.log;


    // bookkeeping
    this.vault[this.owner].editor       = v.editor;
    this.vault[this.owner].tags         = v.tags;
    this.vault[this.owner].confidence   = v.confidence;
    this.vault[this.owner].content      = v.codemirror.getValue();
    this.vault[this.owner].notes        = v.notes;
    this.vault[this.owner].tinyUrl      = v.tinyUrl     || "null";
    this.vault[this.owner].exampleId    = v.exampleId   || "null";
    this.vault[this.owner].description  = v.description === defaultDescription ? nothing : v.description ;

    // UI elements
    this.container = null;

    // hide the scratching mode
    v.editor.children().hide();
    v.editor.removeClass('violette-editor');
    v.editor.addClass('violette-document');

    this.log.info("Entering into documentation mode");
    this.init(v);
  };

  /**
   * Private: Initializes the Documentation UI
   * @param v Vesperize object
   * @return {*} the Documentation object
   */
  Document.prototype.init = function(v){
    // todo(Huascar) add violette-reader to css file
    this.container = Html.buildHtml('div', {
      'id': Utils.brand('document')
      , 'class': 'violette-reader'
    }, {});

    // build UI
    this.container = buildTop(v, this.options, this.container);
    this.container = buildMiddle(this, this.container);
    this.container = buildBottom(this, this.container);

    // using highlightjs, highlights code block
    highlightCode(v, this.container);

    return this;
  };

  Document.prototype.getEditor = function(){
    return this.vault[this.owner].editor;
  };

  Document.prototype.getTags = function(){
    return this.vault[this.owner].tags;
  };

  Document.prototype.setTags = function(array){
    if(array){
      this.log.info("TAGS has been updated");
      this.vault[this.owner].tags = array;
    }
  };

  Document.prototype.getConfidence = function(){
    return this.vault[this.owner].confidence;
  };

  Document.prototype.setConfidence = function(val){
    this.vault[this.owner].confidence = val;
    return this;
  };

  Document.prototype.getContent = function(){
    return this.vault[this.owner].content;
  };


  Document.prototype.getNotes = function(){
    return this.vault[this.owner].notes;
  };

  Document.prototype.getTinyUrl = function(){
    return this.vault[this.owner].tinyUrl;
  };

  Document.prototype.setTinyUrl = function(val){
    this.vault[this.owner].tinyUrl = val;
  };

  Document.prototype.getExampleId = function(){
    return this.vault[this.owner].exampleId;
  };

  Document.prototype.setExampleId = function(val){
    this.vault[this.owner].exampleId = val;
  };

  Document.prototype.getDescription = function(){
    return this.vault[this.owner].description;
  };

  Document.prototype.setDescription = function(val){
    this.vault[this.owner].description = val;
    return this;
  };

  Document.prototype.moveCursorToEnd = moveCursorToEnd;


  return Document;
})(window.jQuery, window.hljs);;/**
 * Utility to perform ajax get and post requests. Supported browsers:
 * Chrome, Firefox, Opera, Safari, Internet Explorer 7+.
 *
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
 */
var Calls = (function ($, module) {
  "use strict";

  module.ACTIVE = true;
  module.STAGING = 'http://www.cookandstuff.com/kiwi/';
  module.PRODUCTION = 'http://www.vesperin.com/kiwi/';

  module.CURRENT_HOST = (module.ACTIVE ? module.PRODUCTION : module.STAGING);


  module.CURATORS = '&q=roles:curators';
  module.SERVICE_POST_URL = module.CURRENT_HOST + 'eval?' + "auth_token=legolas";
  module.SERVICE_GET_URL = module.CURRENT_HOST + 'find?' + module.CURATORS;


  function fetch(method, url, body, headers, datatype, callback) {
    $.ajax({
      type: method
      , headers: headers
      , url: url
      , async: true
      , data: JSON.stringify(body)
      , dataType: datatype
      , success: function (msg) {
        var reply = {
          'draft': msg.draft,
          'info': msg.info,
          'stages': msg.stages,
          'stage': msg.stage,
          'warnings': msg.warnings,
          'failure': msg.failure
        };

        if (callback) {
          callback(reply);
        }
      },

      error: function (jqXHR, textStatus, errorThrown) {
        var reply = {
          'failure': {'message': (jqXHR.responseText || errorThrown)}
        };

        if (callback) {
          callback(reply);
        }
      }
    });

  }

  function get(url, headers, callback) {
    var orElse = {
      'Content-Type': 'text/plain; charset=UTF-8',
      'x-auth-token': 'legolas'
    };

    fetch(
      'GET'
      , url
      , null
      , headers || orElse
      , 'text'
      , callback
    );
  }

  function post(url, body, headers, callback) {
    var orElse = {
      'Content-Type': 'application/json; charset=UTF-8',
      'x-auth-token': 'legolas'
    };

    fetch(
      'POST'
      , url
      , body
      , headers || orElse
      , 'json'
      , callback
    );
  }

  function put(url, body, headers, callback) {
    var orElse = {
      'Content-Type': 'application/json; charset=UTF-8',
      'x-auth-token': 'legolas'
    };

    fetch(
      'PUT'
      , url
      , body
      , headers || orElse
      , 'json'
      , callback
    );
  }

  module.fetch = fetch;
  module.get = get;
  module.post = post;
  module.put = put;

  return module;

}(window.jQuery, Calls || {}));;/**
 * The Refactoring class. This class depends on the Utils, and
 * RestfulCall objects.
 *
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
 */
var Refactoring = (function (module) {
  "use strict";

  var postUrl = Calls.SERVICE_POST_URL;
  var getUrl = Calls.SERVICE_GET_URL;

  module.deleteSelection = function (name, content, range, preprocess, callback) {
    var start = range.start;
    var end = range.end;

    var source = Utils.createCode(name, 'Java: *scratched* code snippet', content);

    var request = {
      'remove': {
        'what': 'region',
        'where': [start, end],
        'source': source,
        'preprocess': preprocess
      }
    };

    Calls.post(postUrl, request, null, callback/*(reply)*/);
  };


  module.detectMissingImports = function (name, content, callback) {

    var source = Utils.createCode(name, 'Java: *scratched* code snippet', content);

    var request = {
      'inspect': {
        'source': source,
        'imports': true
      }
    };

    Calls.post(postUrl, request, null, callback/*(reply)*/);
  };


  module.detectPartialSnippet = function (name, content, callback) {

    var source = Utils.createCode(name, 'Java: *scratched* code snippet', content);

    var request = {
      'preprocess': {
        'source': source
      }
    };

    Calls.post(postUrl, request, null, callback/*(reply)*/);
  };

  module.inspectWholeSourcecode = function (name, content, callback) {

    var source = Utils.createCode(name, 'Java: *scratched* code snippet', content);

    var request = {
      'inspect': {
        'source': source,
        'imports': false
      }
    };

    Calls.post(postUrl, request, null, callback/*(reply)*/);
  };

  module.renameSelectedMember = function (name, newName,
         content, range, preprocess, callback) {

    var start = range.start;
    var end = range.end;

    var source = Utils.createCode(name, 'Java: *scratched* code snippet', content);

    var request = {
      'rename': {
        'what': 'member',
        'to': newName,
        'where': [start, end],
        'source': source,
        'preprocess': preprocess
      }
    };

    Calls.post(postUrl, request, null, callback/*(reply)*/);
  };


  module.clipSelectedBlock = function (name, content,
         range, preprocess, callback) {

    var start = range.start;
    var end = range.end;

    var source = Utils.createCode(name, 'Java: *scratched* code snippet', content);

    var request = {
      'slice': {
        'source': source,
        'where': [start, end],
        'preprocess': preprocess
      }
    };

    Calls.post(postUrl, request, null, callback/*(reply)*/);
  };


  module.deduplicate = function (name, content, preprocess, callback) {
    var source = Utils.createCode(name, 'Java: *scratched* code snippet', content);

    var request = {
      'deduplicate': {
        'source': source
        , 'preprocess': preprocess
      }
    };

    Calls.post(postUrl, request, null, callback/*(reply)*/);
  };

  module.fullCleanup = function (name, content, preprocess, callback) {
    var source = Utils.createCode(name, 'Java: *scratched* code snippet', content);

    var request = {
      'cleanup': {
        'source': source
        , 'preprocess': preprocess
      }
    };

    Calls.post(postUrl, request, null, callback/*(reply)*/);
  };


  module.optimize = function (name, content, callback) {
    var source = Utils.createCode(name, 'Java: *scratched* code snippet', content);

    var request = {
      'optimize': {
        'source': source
      }
    };

    Calls.post(postUrl, request, null, callback/*(reply)*/);
  };

  module.format = function (name, content, callback) {
    var source = Utils.createCode(name, 'Java: *scratched* code snippet', content);

    var request = {
      'format': {
        'source': source
      }
    };

    Calls.post(postUrl, request, null, callback/*(reply)*/);
  };


  module.multistageCode = function (name, content, preprocess, callback) {
    var source = Utils.createCode(name, 'Java: *scratched* code snippet', content);

    var request = {
      'multistage': {
        'source': source
        , 'budget': 10
        , 'preprocess': preprocess
      }
    };

    Calls.post(postUrl, request, null, callback/*(reply)*/);
  };


  module.getParticipants = function (callback) {
    Calls.get(getUrl, null, callback/*(reply)*/);
  };


  module.saveCodeSnippet = function (source, callback) {
    var request = {
      'persist': {
        'source': source
      }
    };

    Calls.put(postUrl, request, null, callback);
  };

  module.updateCodeSnippet = function (source, callback) {
    var request = {
      'update': {
        'source': source
      }
    };

    Calls.post(postUrl, request, null, callback);
  };

  return module;

}(Refactoring || {}));;/**
 * Sometimes code between languages is ambiguous; therefore, we
 * want to shortcut look for languages that are similar to Java.
 *
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
 **/
var Heuristics = (function (hljs, $, module) {
    "use strict";

    var LANGUAGES = ["java"];

    function isSupportedLanguage(lang) {
        return LANGUAGES.indexOf(lang) > -1;
    }

    function blockLanguage(block) {
        var classes = (block.className + ' ' + (block.parentNode ? block.parentNode.className : '')).split(/\s+/);
        classes = classes.map(function (c) {
            return c.replace(/^lang(uage)?-/, '');
        });

        return classes.filter(function (c) {
            return hljs.getLanguage(c) || c == 'no-highlight';
        })[0];
    }

    function isCLike(element, index, array) {
        return ["objective-c", "cpp"].indexOf(element) > -1;
    }

    function isPerlOrProlog(element, index, array) {
        return ["perl", "prolog"].indexOf(element) > -1;
    }

    function isEclOrProlog(element, index, array) {
        return ["ecl", "prolog"].indexOf(element) > -1;
    }

    function isTypeScriptOrXml(element, index, array) {
        return ["typescript", "xml"].indexOf(element) > -1;
    }

    function isCListOrOpenCl(element, index, array) {
        return ["common lisp", "opencl"].indexOf(element) > -1;
    }

    function isRebolOrR(element, index, array) {
        return ["rebol", "r"].indexOf(element) > -1;
    }

    function isCSOrJava(element, index, array) {
        return ["cs", "java"].indexOf(element) > -1;
    }

    function isCppOrJava(element, index, array) {
        return ["cpp", "java"].indexOf(element) > -1;
    }

    function isCLangOrJava(element, index, array) {
        return ["c", "java"].indexOf(element) > -1;
    }

    function isJsOrJava(element, index, array) {
        return ["javascript", "java"].indexOf(element) > -1;
    }

    function isCppOrCs(element, index, array) {
        return ["cpp", "cs"].indexOf(element) > -1;
    }

    function disambiguate_c(data) {
        var matches = [];
        if (data.indexOf("@interface") > -1) {
            matches.push("objective-c")
        }
        if (data.indexOf("#include <cstdint>") > -1 || (/include\\s*[<"]/.test(data))
            || (/\\b(deque|list|queue|stack|vector|map|set|bitset|multiset|multimap|unordered_map|unordered_set|unordered_multiset|unordered_multimap|array)\\s*</.test(data))
            || (data.indexOf("::"))) {
            matches.push("cpp")
        }
        return matches
    }

    function disambiguate_pl(data) {
        var matches = [];
        if (data.indexOf("use strict") > -1) {
            matches.push("perl")
        }
        if (data.indexOf(":-") > -1) {
            matches.push("prolog")
        }
        return matches
    }

    function disambiguate_ecl(data) {
        var matches = [];
        if (data.indexOf(":=") > -1) {
            matches.push("ecl")
        }
        if (data.indexOf(":-") > -1) {
            matches.push("prolog")
        }
        return matches
    }

    function disambiguate_ts(data) {
        var matches = [];
        if (data.indexOf("</translation>") > -1) {
            matches.push("xml")
        } else {
            matches.push("typescript")
        }
        return matches
    }

    function disambiguate_cl(data) {
        var matches = [];
        if (data.indexOf("(defun ") > -1) {
            matches.push("common lisp")
        }
        if (/\/\* |\/\/ |^\}/.test(data)) {
            matches.push("opencl")
        }
        return matches
    }

    function disambiguate_r(data) {
        var matches = [];
        if (/\bRebol\b/i.test(data)) {
            matches.push("rebol")
        }
        if (data.indexOf("<-") > -1) {
            matches.push("r")
        }
        return matches
    }

    function disambiguate_cs(data) {
        var matches = [];
        if ((data.indexOf("<summary>") > -1)
            || (data.indexOf("using System;") > -1)
            || (data.indexOf("typeof") > -1)
            || (data.indexOf("sizeof") > -1)) {
            matches.push("cs")
        }
        if ((data.indexOf("import") > -1)) {
            matches.push("java")
        }
        return matches
    }

    function disambiguate_cj(data) {
        var matches = [];
        if (data.indexOf("#include <cstdint>") > -1 || (/#include\\s*[<"]/.test(data))
            || (/\\b(deque|list|queue|stack|vector|map|set|bitset|multiset|multimap|unordered_map|unordered_set|unordered_multiset|unordered_multimap|array)\\s*</.test(data))
            || (data.indexOf("::"))) {
            matches.push("cpp")
        }
        if ((data.indexOf("import") > -1)) {
            matches.push("java")
        }
        return matches
    }

    function disambiguate_j(data) {
        var matches = [];
        if (data.indexOf("#include") > -1 || (/#include\\s*["]/.test(data))) {
            matches.push("c")
        }
        if ((data.indexOf("import") > -1)) {
            matches.push("java")
        }
        return matches
    }

    function disambiguate_js(data) {
        var matches = [];
        if (data.indexOf("!==") > -1 || ( /\$[(.]/.test(data))) {
            matches.push("javascript")
        }
        if ((data.indexOf("import") > -1)) {
            matches.push("java")
        }
        return matches
    }

    function disambiguate_cpp(data) {
        var matches = [];
        if (data.indexOf("#include <cstdint>") > -1 || (/#include\\s*[<"]/.test(data))
            || (/\\b(deque|list|queue|stack|vector|map|set|bitset|multiset|multimap|unordered_map|unordered_set|unordered_multiset|unordered_multimap|array)\\s*</.test(data))
            || (data.indexOf("::"))) {
            matches.push("cpp")
        }
        if ((data.indexOf("<summary>") > -1)
            || (data.indexOf("using System;") > -1)
            || (data.indexOf("typeof") > -1)
            || (data.indexOf("sizeof") > -1)) {
            matches.push("cs")
        }
        return matches
    }


    module.findByHeuristics = function(data, languages){
        if (languages.every(isCLike)) {
            return disambiguate_c(data)
        }
        if (languages.every(isPerlOrProlog)) {
            return disambiguate_pl(data)
        }
        if (languages.every(isEclOrProlog)) {
            return disambiguate_ecl(data)
        }
        if (languages.every(isTypeScriptOrXml)) {
            return disambiguate_ts(data)
        }
        if (languages.every(isCListOrOpenCl)) {
            return disambiguate_cl(data)
        }
        if (languages.every(isRebolOrR)) {
            return disambiguate_r(data)
        }
        if (languages.every(isCSOrJava)) {
            return disambiguate_cs(data)
        }
        if (languages.every(isCppOrJava)) {
            return disambiguate_cj(data)
        }
        if (languages.every(isCLangOrJava)) {
            return disambiguate_j(data)
        }
        if (languages.every(isJsOrJava)) {
            return disambiguate_js(data)
        }
        if (languages.every(isCppOrCs)) {
            return disambiguate_cpp(data)
        }
    };

    module.detect = function(block){
        var text = block.text();
        var lang = blockLanguage(block);
        if (lang == 'no-highlight') {
            return "Unknown Language";
        }
        var result = lang ? hljs.highlight(lang, text, true) : hljs.highlightAuto(text);
        if (isSupportedLanguage(result.language)) {
            return result.language;
        } else {
            var secondLangExist = (typeof(result.second_best) !== 'undefined');

            if (secondLangExist && isSupportedLanguage(result.second_best.language)) {
                return result.second_best.language;
            } else {
                var languages = secondLangExist ? [result.language, result.second_best.language] : [result.language, "cs"];
                var matches = module.findByHeuristics(text, languages);
                return (matches && matches.length > 0) ? matches[0] : "Unknown Language";
            }
        }
    };

    return module;
}(window.hljs, window.jQuery, Heuristics || {}));;//noinspection JSUnresolvedVariable
/**
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
 */
var Vesperize = (function ($, store) {
  "use strict";

  /**
   * Default class name; used during refactorings.
   *
   * @type {string} the actual class name.
   */
  var defaultClassname = 'Scratched';

  function configuresPNotify(){
    // must be initialize in other to use octicon icons
    // for their alerts
    PNotify.prototype.options.styling = "octicon";
    PNotify.prototype.options.delay   = 4000;
    PNotify.prototype.options.confirm = {
      // Make a confirmation box.
      confirm: false,
      // Make a prompt.
      prompt: false,
      // Classes to add to the input element of the prompt.
      prompt_class: "",
      // The default value of the prompt.
      prompt_default: "",
      // Whether the prompt should accept multiple lines of text.
      prompt_multi_line: false,
      // Where to align the buttons. (right, center, left, justify)
      align: "right",
      buttons: [
        {
          text: "Ok",
          addClass: "violette-button minibutton",
          // Whether to trigger this button when the user hits enter in a single line prompt.
          promptTrigger: true,
          click: function(notice, value){
            notice.remove();
            notice.get().trigger("pnotify.confirm", [notice, value]);
          }
        }
      ]
    };

    PNotify.prototype.modules.confirm = {
      seen: new Set(),
      // The div that contains the buttons.
      container: null,
      // The input element of a prompt.
      prompt: null,

      init: function(notice, options){
        this.container = $('<div style="margin-top:5px;clear:both;" />')
          .css('text-align', options.align)
          .appendTo(notice.container);

        if (options.confirm || options.prompt)
          this.makeDialog(notice, options);
        else
          this.container.hide();
      },

      update: function(notice, options){
        if (options.confirm) {
          this.makeDialog(notice, options);
          this.container.show();
        } else {
          this.container.hide().empty();
        }
      },

      afterOpen: function(notice, options){
        if (options.prompt)
          this.prompt.focus();
      },

      makeDialog: function(notice, options) {
        var already = false, that = this, btn, elem;
        this.container.empty();
        if (options.prompt) {
          this.prompt = $('<'+(options.prompt_multi_line
              ? 'textarea rows="5"'
              : 'input type="text"')+' style="margin-bottom:5px;clear:both;" />'
          )
            .addClass(notice.styles.input+' '+options.prompt_class)
            .val(options.prompt_default)
            .appendTo(this.container);
        }
        for (var i in options.buttons) {
          btn = options.buttons[i];
          if(this.seen.has(btn.text)) continue;
          if (already) {
            this.container.append(' ');
            break;
          } else {
            already = true;
          }

          elem = $('<button type="button" />')
            .addClass(notice.styles.btn+' '+btn.addClass)
            .text(btn.text)
            .appendTo(this.container)
            .on("click", (function(btn){ return function(){
              if (typeof btn.click == "function") {
                btn.click(notice, options.prompt ? that.prompt.val() : null);
              }
            }})(btn));
          if (options.prompt && !options.prompt_multi_line && btn.promptTrigger)
            this.prompt.keypress((function(elem){ return function(e){
              if (e.keyCode == 13)
                elem.click();
            }})(elem));
          if (notice.styles.text) {
            elem.wrapInner('<span class="'+notice.styles.text+'"></span>');
          }
          if (notice.styles.btnhover) {
            elem.hover((function(elem){ return function(){
              elem.addClass(notice.styles.btnhover);
            }})(elem), (function(elem){ return function(){
              elem.removeClass(notice.styles.btnhover);
            }})(elem));
          }
          if (notice.styles.btnactive) {
            elem.on("mousedown", (function(elem){ return function(){
              elem.addClass(notice.styles.btnactive);
            }})(elem)).on("mouseup", (function(elem){ return function(){
              elem.removeClass(notice.styles.btnactive);
            }})(elem));
          }
          if (notice.styles.btnfocus) {
            elem.on("focus", (function(elem){ return function(){
              elem.addClass(notice.styles.btnfocus);
            }})(elem)).on("blur", (function(elem){ return function(){
              elem.removeClass(notice.styles.btnfocus);
            }})(elem));
          }
        }
      }
    };
  }

  function openInputDialog(editor, text, shortText, deflt, f){
    //noinspection JSUnresolvedVariable
    if (editor.openDialog) {
      //noinspection JSUnresolvedFunction
      editor.openDialog(text, f, {value: deflt});
    } else {
      f(prompt(shortText, deflt));
    }
  }


  function markNewDraft(v, value){
    Drafts.mark(v, value, notifyContent);

    return this;
  }


  function creatingNotesSection(v){
    if(v.staging.hasClass('violette-history')){
      v.staging.removeClass('violette-history');
      v.staging.addClass('violette-multistage btn-toolbar');
    } else {
      v.staging.addClass('violette-multistage btn-toolbar');
    }

    v.staging.css({
      'min-height': '25px'
      , 'height': 'auto'
    });


    v.disableButtons();
    notifyContent('info', v, 'Entering notes view');

    v.staging = Html.buildNoteSection(v);

    v.handler.push(v.namespace + '-' + 'close');
    v.callback.push(function(that){
      $.scrollLock();
      notifyContent('info', that, 'Exiting notes view');

      that.staging.children().hide();
      that.staging.children().remove();

      that.staging.hide();
      that.codemirror.setOption("readOnly", false);

      Utils.deleteButtonHandler(that, that.namespace + '-' + 'close');
      Utils.deleteButtonHandler(that, that.namespace + '-' + 'next');

      that.enableButtons();
      that.codemirror.setSelection({'line':0, 'ch':0});

      that.displayer = null;
      $.scrollLock();
    });

    v.handler.push(v.namespace + '-' + 'next');
    v.callback.push(Notes.nextNote);

    v.staging.show();
    Notes.nextNote(v);
    v.codemirror.setOption("readOnly", true);
    v.codemirror.focus();
  }

  // todo(Huascar) find code sections that can be moved to Html
  function addsNotesSection(v, container){

    var left  = Html.buildHtml('span', {'class': 'tabnav-left'}, {});

    v.displayer = Html.buildHtml('span', '', {'class': 'note'});
    var bookmarked = Html.buildHtml('span', '', {'class': 'octicon octicon-light-bulb'});
    left.append(bookmarked);
    left.append(Html.buildHtml('span', {'class':'divider'}, {}));
    left.append(v.displayer);

    container.append(left);
    v.handler.push(v.namespace + '-' + 'next');


    v.callback.push(Notes.nextNote);
    return container;
  }

  /**
   * Creates the edit tracker so that developers
   * can replay history (i.e., navigate marked drafts)
   *
   * @param v Vesperize object
   */
  // todo(Huascar) find code sections that can be moved to Html
  function replayHistory(v){

    if(v.staging.hasClass('violette-multistage')){
      v.staging.removeClass('violette-multistage');
      v.staging.addClass('violette-history btn-toolbar');
    }


    v.disableButtons();
    notifyContent('info', v, 'Entering history view');


    var top     = Html.buildHtml('div', {
      'class': 'btn-toolbar'
      , 'style': 'margin-left: 5px;'
    }, {});

    var bottom  = Html.buildHtml('div', {
      'class': 'btn-toolbar'
    }, {});

    top = addsNotesSection(v, top);

    var left  = Html.buildHtml('span', {'class': 'tabnav-left'}, {});
    var right = Html.buildHtml('span', {'class': 'tabnav-right'}, {});
    var tip   = Html.buildHtml('span', '', {
      'id': Utils.brand('value'),
      'class': 'tabnav-center',
      'style': 'margin-left:7px;'
    });


    var that = v;
    that.codemirror.setOption("readOnly", true);
    function setValue(value, handleElement, slider){
      var idx       = parseInt(value);
      var available = that.drafts.contains(idx);
      if(!available){
        that.log.warn("Vesperize#replayHistory. Reason: trying to access a non-existent draft.");
        return;
      }
      var draft     = that.drafts.getDraft(idx);
      var name = draft.name;
      var code = draft.after;
      $(tip).text(name);

      that.codemirror.setValue(code);

      that.notes = Notes.copyNotes(that.primaryKey, draft.notes.notes);
      if(that.notes.empty()){
        that.displayer.text("");
        that.displayer.hide();
        that.staging.css({
          'min-height': '25px'
          , 'height': 'auto'
        });
      } else {
        that.staging.css({
          'min-height': '50px'
          , 'height': 'auto'
        });
        that.displayer.show();
        Notes.nextNote(that);
      }
    }

    var min = [0];
    var max = [];
    max.push(v.drafts.size() - 1);
    var start = [];
    start.push(v.drafts.size());

    v.history = Html.buildEditTracker();
    left.append(v.history);
    bottom.append(left);

    v.history.noUiSlider({
      start: start,
      step: 1,
      connect: 'lower',
      range: {
        'min': min,
        'max': max
      }
    });

    v.history.Link('lower').to(setValue);

    bottom.append(tip);
    right.append(Html.buildNextButton(v));
    right.append(Html.buildHtml('span', {'class':'break'}, {}));
    right.append(Html.buildClosingButton(v));
    bottom.append(right);

    v.handler.push(v.namespace + '-' + 'close');
    v.callback.push(function(that){
      $.scrollLock();
      notifyContent('info', that, 'Exiting history view');

      that.staging.children().hide();
      that.staging.children().remove();

      that.staging.hide();

      Utils.deleteButtonHandler(that, that.namespace + '-' + 'close');
      Utils.deleteButtonHandler(that, that.namespace + '-' + 'next');

      that.codemirror.setOption("readOnly", false);
      that.enableButtons();

      that.codemirror.setValue(store.get(that.primaryKey));

      var savedNotes = store.get(that.primaryKey + 'notes');
      if (savedNotes) {
        that.notes = Notes.copyNotes(that.primaryKey, savedNotes.notes);
      }

      that.displayer = null;

      $(that.history)[0].destroy();
      that.history = null;

      that.enableButtons();
      $.scrollLock();

    });


    v.staging.append(top);
    v.staging.append(bottom);

    v.staging.show();
    Notes.nextNote(v);
    v.codemirror.focus();

  }


  /**
   * Default key for main buffer
   * @type {string} the actual key
   */
  var originalMarker   = 'Original';

  function openBuffer(v, name, text, mode) {
    v.buffers[name] = Editor.Doc(text, mode);
  }

  function newBuf(v, stage) {

    var name    = stage.label;
    var content = stage.source.content;
    var where   = stage.where;

    if(content === v.codemirror.getValue()){
      // prevents from trying to process a stage
      // that you are already in.
      summarize(v, where);
      v.codemirror.focus();

      return;
    }


    if (name == null) return;
    //noinspection JSUnresolvedFunction
    if (v.buffers.hasOwnProperty(name)) {
      selectBuffer(v, v.codemirror, name, where);
      return;
    }

    openBuffer(v, name, content, "text/x-java");
    selectBuffer(v, v.codemirror, name, where);
  }

  function selectBuffer(v, editor, name, where) {

    var buf = v.buffers[name];
    var readOnly = name !== originalMarker;
    editor.setOption("readOnly", readOnly);
    if (buf.getEditor()) buf = buf.linkedDoc({sharedHist: true});
    var old = editor.swapDoc(buf);
    var linked = old.iterLinkedDocs(function(doc) {linked = doc;});
    if (linked) {
      // Make sure the document in buffers is the one the other view is looking at
      for (var key in v.buffers) {
        //noinspection JSUnresolvedFunction
        if(v.buffers.hasOwnProperty(key)){
          if (v.buffers[key] == old) v.buffers[key] = linked;
        }
      }
      old.unlinkDoc(linked);
    }

    if(where.length > 0){
      summarize(v, where);
    }

    updateLineInfo(v);

    editor.focus();
  }


  function updateLineInfo(v){
    var editor = v.codemirror;
    var cured   = editor.getValue().replace(/\r\n|\r/g, '\n');
    var result  = Utils.count(cured);
    var lines   = result.total + ' lines (' + result.sloc + ' sloc)';
    v.sloc.text(lines);
  }



  function notifyContent(type, v, content) {

    var opts = {};

    switch (type) {
      case 'error':
        opts.title = "Oh No";
        opts.text = content + "!";
        opts.type = "error";
        break;
      case 'notice':
        opts.title = "Watch out";
        opts.text = content + "!";
        opts.type = "notice";
        break;
      case 'info':
        opts.title = "Breaking News";
        opts.text = content;
        opts.type = "info";
        break;
      case 'success':
        opts.title = "Good News Everyone";
        opts.text = content;
        opts.type = "success";
        break;
    }

    opts.before_open = function(PNotify) {
      // Position this notice in the center of the screen.
      PNotify.get().css({
        "right": ($(v.editor).width() / 2)  - (PNotify.get().width()) - 10
      });
    };

    new PNotify(opts);

    v.codemirror.focus();
  }

  function shareDialog(v, content, tinyUrl) {
    var modal_overlay;
    var opts = {};
    tinyUrl  = tinyUrl || 'no url';

    opts.title = "Sharing Example";
    opts.text = content + "!";
    opts.type = "notice";
    opts.icon = 'octicon octicon-link-external';

    opts.hide = false;
    opts.confirm = {
        prompt: true,
        prompt_multi_line: true,
        prompt_default: tinyUrl
    };

    opts.buttons = {
        closer: false,
        sticker: false
    };

    opts.history = {
        history: false
    };

    opts.before_open = function(PNotify) {
      // Position this notice in the center of the screen.
      PNotify.get().css({
        "top":  ($(window).height() / 2) - (PNotify.get().height() / 2),
        "left": ($(window).width() / 2) - (PNotify.get().width() / 2)
      });

      if (modal_overlay) modal_overlay.fadeIn("fast");
      else modal_overlay = $("<div />", {
        "class": "ui-widget-overlay",
        "css": {
          "display": "none",
          "position": "fixed",
          "top": "0",
          "bottom": "0",
          "right": "0",
          "left": "0",
          "z-index": "1040",
          "background-color": "#000",
          "opacity": ".5"
        }
      }).appendTo("body").fadeIn("fast");
    };

    opts.before_close = function() {
      modal_overlay.fadeOut("fast");
    };

    new PNotify(opts);
    v.codemirror.focus();
  }

  /**
   * Catch changes in class name and make appropriate updates.
   *
   * @param content code example's content.
   * @param className current class name.
   * @param e Vesperize
   * @return {*}
   */
  function compareAndSetClassName(content, className, e) {
    var clsName = Matcher.matchClassName(content, defaultClassname) + '.java';
    // extra step to make sure verify functionality gets a good class name
    if (clsName !== className) {
      e.log.debug("Vesperize#compareAndSetClassName. Updated classname (from=" + e.classname + ", to=" + clsName + ")");
      e.classname = clsName;
      return clsName;
    } else {
      return className;
    }
  }

  function persistContent(v, content){
    if(v.buffers == null && v.history == null && v.displayer == null){
      if(v.document == null){
        v.persist(content);
        v.status.text('SAVED ');
      }
    }
  }

  function inspectCodeExample(that, content){
    that.classname = compareAndSetClassName(content, that.classname, that);
    // hint users the code is broken
    Refactoring.inspectWholeSourcecode(that.classname, content,
      function (reply) {

        var editor  = that.editor;


        var broken = containsSyntaxErrors(reply);
        if(broken){

          if(ignoreResolveElementWarning(reply.warnings)) {
            that.log.info("Vesperize#inspectCodeExample. Ignoring `cannot resolve` errors. ");
            return;
          }

          that.log.debug(
            "Vesperize#inspectCodeExample. Code example " +
            (broken ? "contains" : "doesn't contain") +
            " compiler errors."
          );

          if (editor.hasClass('active')) {
            editor.removeClass('active');

            editor.addClass('broken');
          }
        } else {
          if (editor.hasClass('broken')) {
            editor.removeClass('broken');

            editor.addClass('active');
          }
        }

      }
    );
  }


  function ignoreResolveElementWarning(warnings){
    if(warnings){
      for(var i = 0; i < warnings.length; i++){
        var warning = warnings[i];
        if(warning.message.indexOf('cannot be resolved') > -1) return true;
      }
    }

    return false;
  }

  function requiresPreprocessing(reply){
    //noinspection JSUnresolvedVariable
    return ((typeof(reply.info) !== 'undefined' && reply.info.messages[0] === 'true'));
  }

  function containsSyntaxErrors(reply){
    return ((typeof(reply.warnings) !== 'undefined' && reply.warnings.length > 0) || (typeof(reply.failure) !== 'undefined'));
  }

  /**
   * Performs any post processing task after Vesperize has been initialized.
   * @param v Vesperize object
   */
  function postprocessing(v/*Vesperize*/){

    v.fit();

    var that = v;
    var efficientCallback = Utils.debounce(function(){
       that.fit();
    }, 250, false);

    $(window).on("resize", efficientCallback);

    // time starts ticking
    v.stopwatch = new Stopwatch();
  }


  /**
   * Check if browser has support for HTML storage
   *
   * @return bool true if the browser supports HTML storage; false otherwise.
   */
  function supportsHtmlStorage() {
    try {
      return store.enabled;
    } catch (e) {
      return false;
    }
  }

  /**
   * Swaps documents
   * @param v Vesperize object
   * @param content stage content
   */
  function swapDocument(v, content){

    var multistage  = v.multistage[v.id];
    var stages      = multistage.stages;

    var stage = $.grep(stages, function( s ) {  // {object}
      return s.label === content;
    });

    newBuf(v, stage[0]);
  }


  function expandEverything(cm){
    cm.operation(function() {
      for (var l = cm.firstLine(); l <= cm.lastLine(); ++l){
        //noinspection JSUnresolvedFunction
        cm.foldCode({line: l, ch: 0}, null, "unfold");
      }
    });
  }


  function summarize(v, where/*{array of arrays}*/){

    where = where || [];

    for (var l = 0; l < where.length; l++) {
      var fold = where[l];

      var line = fold.from[0];
      var off  = fold.from[1];

      //noinspection JSUnresolvedFunction
      v.codemirror.foldCode(
        Editor.Pos(
          line,
          off
        ),
        null, "fold"   // this will force folding when swapping between buffers
      );
    }

    v.codemirror.refresh();
  }

  /**
   * Multi stage a code example.
   * @param v Violette object.
   */
  function multiStageCode(v/*Violette*/) {

    if(v.staging.hasClass('violette-history')){
      v.staging.removeClass('violette-history');
      v.staging.addClass('violette-multistage btn-toolbar');
    } else {
      v.staging.addClass('violette-multistage btn-toolbar');
    }

    v.staging.css({
      'min-height': '25px'
      , 'height': 'auto'
    });


    v.disableButtons();
    notifyContent('info', v, 'Entering multistage view');

    v.buffers = {}; // resetting cache
    v.buffers[originalMarker] = v.codemirror.getDoc();

    if(typeof(v.multistage[v.id]) === 'undefined'){
      v.codemirror.focus();
    }


    // todo(Huascar) convert each stage into a split button.
    var multistage  = v.multistage[v.id];
    var stages      = multistage.stages;
    var len         = stages.length;
    for(var i = 0; i < len; i++){
      var stage = stages[i];
      var title = i + ' : ' + stage.label;
      var name  = stage.label;
      var handler = v.namespace + '-' + name;

      v.indexes.push(handler);

      var buttonHtml = Html.buildHtml('button', title, {
        'type': 'button'
        , 'title': title
        , 'class': 'violette-button minibutton primary'
        , 'data-provider': v.namespace
        , 'data-handler': handler
        , 'data-stage': name
      });

      buttonHtml.tooltipster({
          position: 'bottom',
          theme: 'tooltip-custom-theme'
        }
      );

      v.handler.push(handler);
      v.callback.push(swapDocument);

      v.staging.append(buttonHtml);

    }

    v.staging.append(Html.buildClosingButton(v));

    v.handler.push(v.namespace + '-' + 'close');
    v.callback.push(function(that){

      notifyContent('info', that, 'Exiting multistage view');
      that.staging.children().hide();
      that.staging.children().remove();

      that.staging.hide();

      that.codemirror.swapDoc(that.buffers[originalMarker]);
      that.codemirror.setOption("readOnly", false);
      that.buffers = null;

      Utils.deleteButtonHandler(that, that.namespace + '-' + 'close');

      expandEverything(that.codemirror);

      for(var idx = 0; idx < that.indexes.length; idx++){
        var key   = that.indexes[idx];
        var i     = that.handler.indexOf(key);
        delete that.handler[i];
        delete that.callback[i];
      }

      that.indexes = [];

      updateLineInfo(that);

      that.enableButtons();
    });

    v.staging.show();
    v.codemirror.focus();
  }


  /**
   * Handles Kiwi response.
   *
   * @param v Vesperize object
   * @param reply Kiwi's reply.
   */
  function handleReply(v, reply) {
    var codemirror = v.codemirror;
    var silent = v.options.silent;

    if (reply.draft) {
      var draft = reply.draft.after;
      if (v.classname !== draft.name) {
        v.classname = draft.name;
      }
      v.lastaction = reply.draft.cause;
      codemirror.setValue(draft.content);
      updateLineInfo(v);
    } else {
      if (reply.info) {
        //noinspection JSUnresolvedVariable
        v.log.debug(reply.info.messages.join('\n'));
        notifyContent('info', v, reply.info.messages.join('\n'));
        codemirror.focus();
      } else if (reply.warnings) {
        if (silent) {
          v.log.info(reply.warnings.join('\n'));
        } else {
          if (!v.editor.hasClass('broken')) {
            // this class will be removed
            // if not error are found
            // when trying to save the file.
            v.editor.addClass('broken');
          }
        }
      } else if (reply.stages) {
        v.multistage[v.id] = reply.stages;  // {array}
        multiStageCode(v);

      } else if (reply.stage) {
        var stage = reply.stage;
        var where = stage.where; // {array of arrays}

        summarize(v, where);

      } else { // failure
        var text = 'There was an internal server error.';
        var internalError = reply.failure.message.indexOf(text) > -1;
        var noErrors      = reply.failure.message.length == 0;
        var error = (
          (internalError || noErrors)
            ? "Invalid selection; unable to perform operation."
            : reply.failure.message
        );

        v.log.error("Kiwi misbehaved: " + error);
        notifyContent('error', v, error);
      }
    }

    codemirror.focus();
  }


  /**
   * Default options
   *
   * @type {{actions: Array}}
   */
  var defaults = {
    silent: true
    , width: 'inherit'
    , height: 'inherit'
    , hideable: false
    , intervalinmillis: 2000
    , 'actions':  [
      {
        name: 'delete'
        , title: 'Safely delete a selected code element.'
        , icon: 'octicon octicon-trashcan'
        , callback: function (v/*Vesperize*/) {
          var codemirror = v.codemirror;
          var content = codemirror.getValue();

          // nothing to refactor.
          if ("" == content) return;

          var selection = codemirror.getSelection();

          if ("" === selection) {
            notifyContent('notice', v, 'There is nothing to delete');
          } else if (selection === content) {
            notifyContent('notice', v, "There won't be any example left after this deletion");
          } else {
            // extract classname from content
            v.classname = compareAndSetClassName(content, v.classname, v);
            // extract selection range
            var range = Utils.selectionOffsets(codemirror, content, selection);

            $.scrollLock();
            // check if its comment
            if (Matcher.isComment(selection)) {
              // if the selection is a comment, then remove it
              // then call the Refactoring.prepare...
              content = content.replace(selection, '');

              // doing this we allow us to fix issues related to
              // have a clean version of code snippet
              Refactoring.format(v.classname, content, function (reply) {
                handleReply(v, reply);
                v.lastaction = 'Delete comment';
                v.log.info("Vesperize#delete. Deleting code section containing a comment. No Preprocessing required.");
                $.scrollLock();
              });

            } else {

              Refactoring.detectPartialSnippet(v.classname, content,
                function (reply) {

                  var preprocess = requiresPreprocessing(reply);
                  Refactoring.deleteSelection(
                    v.classname, content, range, preprocess, function (reply) {
                      v.log.info("Vesperize#delete. Deleting a code section. Preprocessing detected (" + preprocess + ").");
                      handleReply(v, reply);
                      $.scrollLock();
                    }
                  );

                }
              );


            }
          }
        }
      },
      {
        name: 'clip'
        , title: 'Clip a method'
        , icon: 'octicon octicon-clippy'
        , callback: function (v/*Violette*/) {
          var codemirror = v.codemirror;
          var content = codemirror.getValue();

          // nothing to refactor.
          if ("" == content) return;

          var selection = codemirror.getSelection();

          if ("" === selection) {
            notifyContent('notice', v, "There is nothing to delete");
          } else {
            // constructor regex: class\\s*([a-zA-Z\\d$]+).*?(public\\s+\\1\\s*\\(\\s*\\))
            if (!Matcher.isMethod(selection)) {
              notifyContent('notice', v, "Only methods can be clipped. Please select one");
            } else {
              v.classname = compareAndSetClassName(content, v.classname, v);
              var range = Utils.selectionOffsets(codemirror, content, selection);
              $.scrollLock();
              Refactoring.detectPartialSnippet(v.classname,
                content, function(reply){
                  var preprocess = requiresPreprocessing(reply);
                  Refactoring.clipSelectedBlock(v.classname, content, range,
                    preprocess, function (reply) {
                      v.log.info("Vesperize#clip. Clipping a code section. Preprocessing detected (" + preprocess + ").");
                      handleReply(v, reply);
                      $.scrollLock();
                    }
                  );
                }
              );
            }
          }

        }
      },
      {
        name: 'cleanup',
        title: 'Code formatting plus deduplication',
        icon: 'octicon octicon-three-bars',
        callback: function (v/*Violette*/) {
          var codemirror = v.codemirror;
          var content = codemirror.getValue();

          // nothing to refactor.
          if ("" == content) return;

          v.classname = compareAndSetClassName(content, v.classname, v);
          $.scrollLock();
          Refactoring.detectPartialSnippet(v.classname, content,
            function (reply) {
              var preprocess = requiresPreprocessing(reply);
              Refactoring.fullCleanup(v.classname, content, preprocess, function (reply) {
                v.log.info("Vesperize#cleanup. Cleaning code example. Preprocessing detected (" + preprocess + ").");
                handleReply(v, reply);
                $.scrollLock();
              });
            }
          );
        }
      },
      {
        name: 'rename'
        , title: 'Rename a selected element'
        , icon: 'octicon octicon-diff-renamed'
        , callback: function (v/*Violette*/) {
          var codemirror = v.codemirror;
          var content = codemirror.getValue();
          var selection = codemirror.getSelection();

          // nothing to refactor.
          if ("" == content) return;

          if ("" == selection) {
            notifyContent('notice', v, "Please select something");
          }

          var range = Utils.selectionOffsets(codemirror, content, selection);

          v.classname = compareAndSetClassName(content, v.classname, v);

          $.scrollLock();
          var other = codemirror;
          openInputDialog(codemirror, Html.buildInput('New Name?').html(), "Enter new name:", selection, function(description){
            other.operation(function(){
              if(description === selection) return;

              if(description !== null){
                Refactoring.detectPartialSnippet(v.classname, content,
                  function (reply) {
                    var preprocess = requiresPreprocessing(reply);
                    Refactoring.renameSelectedMember(v.classname, description,
                      content, range, preprocess, function (reply) {
                        v.log.info("Vesperize#rename. Renaming a selected class member. Preprocessing detected (" + preprocess + ").");
                        handleReply(v, reply);
                        $.scrollLock();
                    });
                  }
                );
              }

            });

          });

        }
      },
      {
        name: 'annotate'
        , title: 'Annotates code sections'
        , icon: 'octicon octicon-comment'
        , callback: function (v/*Violette*/) {
          var codemirror = v.codemirror;

          var other = codemirror;
          $.scrollLock();
          // opens a dialog
          openInputDialog(codemirror, Html.buildInput().html(), "Annotates selection:", "", function(description){
              other.operation(function(){
                 var content   = other.getValue();
                 var selection = other.getSelection();
                 selection     = "" === selection ? content : selection;
                 var location  = Utils.selectionLocation(other, content, selection);
                 var note = Notes.buildNote(description, location, Notes.chunkContent(content, location));
                 v.notes.addNote(note);
                 v.log.info("Vesperize#annotate. Annotating a selected code section. Notes size (" + v.notes.size() + ").");
                 $.scrollLock();
              });

          });

        }
      },
      {
        'name': 'stage'
        , 'title': 'Multi stage code example'
        , 'label': 'Stage'
        , callback: function(v){

          if(v.buffers != null) {
            v.codemirror.focus();
            return;
          }

          v.buffers = {}; // This will prevent multi-stage-event triggering more then once

          var codemirror = v.codemirror;
          var content = codemirror.getValue();

          // nothing to refactor.
          if ("" == content) return;

          v.classname = compareAndSetClassName(content, v.classname, v);
          $.scrollLock();
          Refactoring.detectPartialSnippet(v.classname, content,
            function (reply) {
              //name, content, preprocess, callback
              var preprocess = requiresPreprocessing(reply);
              Refactoring.multistageCode(
                v.classname, content, preprocess, function (reply) {
                  v.log.info("Vesperize#stage. Multistaging the code example.");
                  handleReply(v, reply);
                  $.scrollLock();
                }
              );

            }
          );
        }
      },
      {
        'name': 'history'
        , 'title': 'Show edit history'
        , 'label': 'History'
        , callback: function(v){
          // if history widget is already created (being displayed)
          // then don't show it
          if(v.history != null) {
            v.codemirror.focus();
            return;
          }

          if(!v.drafts.empty()){
            v.log.info("Vesperize#history. Replaying history. Drafts (" + v.drafts.size() + ")");
            replayHistory(v);
          } else {
            v.log.warn("Vesperize#history. You have no marked drafts.");
            notifyContent('notice', v, 'You have no marked drafts');
          }
        }
      },
      {
        'name': 'notes'
        , 'title': 'Launch notes'
        , 'label': 'Notes'
        , callback: function(v){
           if(v.notes.size() > 0 ){
             v.log.info("Vesperize#notes. Launching notes. Notes (" + v.notes.size() + ")");
             creatingNotesSection(v);
           } else {
             v.log.warn("Vesperize#notes. You have no notes.");
             notifyContent('notice', v, 'You have not annotated anything');
           }
           v.codemirror.focus();
        }
      }
    ]
    , 'modes':  [
      { name: 'download'
        , title: 'Bring code example to desktop'
        , icon: 'octicon octicon-device-desktop'
        , label: 'Bring it to Desktop'
        , callback: function (v/*Vesperize*/) {
          v.codemirror.focus();
        }
      }
    ]
    , 'social': [
      {
        name: 'share'
        , title: 'Share your master piece'
        , label: 'SHARE'
        , callback: function(v){

          var codemirror = v.codemirror;
          var content = codemirror.getValue();

          if(null !== v.tinyUrl){
            shareDialog(v, "Anyone with this link can see your fantastic work", v.tinyUrl);
            return;
          }

          // nothing to save.
          if ("" == content) {
            notifyContent('notice', v, "There is nothing to save");
            return;
          }

          v.classname = compareAndSetClassName(content, v.classname, v);

          $.scrollLock();
          var that = v;
          Refactoring.format(v.classname, content, function(reply){
             if(reply.draft){
               var source = reply.draft.after;
               that.stopwatch.stop();
               source.elapsedtime = that.stopwatch.toString();
               source.comments    = that.notes.toHashArray();
               source.confidence  = 5; // if we are sharing, then it means we like what we did
               source.url         = document.location.href;

               Refactoring.saveCodeSnippet(source, function(reply){
                 if(reply.info){
                   that.tinyUrl     = reply.info.messages[1];
                   that.exampleId   = reply.info.messages[2];
                   that.log.info("Vesperize#share. Sharing + saving code example. Example ID (" + that.exampleId + ")");
                   shareDialog(that, "Anyone with this link can see your fantastic work", that.tinyUrl);
                 } else {

                   var foundWarnings = ((typeof(reply.warnings) !== 'undefined' && reply.warnings.length > 0));
                   var foundFailures = ((typeof(reply.failure) !== 'undefined'));
                   var reason = (foundWarnings
                     ? (': ' + reply.warnings.join(','))
                     : (foundFailures ? (': ' + reply.failure.message) : '')
                   );

                   reason = reason + '.';

                   that.log.error("Vesperize#share. Unable to save your code example" + reason);
                   notifyContent('error', that, "Unable to save your code example")
                 }

                 $.scrollLock();
               });

             }
          });
        }
      },
      {
        name: 'document'
        , title: 'Document curated example.'
        , label: 'DOCUMENT'
        , callback: function (v/*Vesperize*/) {
          v.log.info("Vesperize#document. Launching documentation mode.");
          v.document = new Document(v);
        }
      }
    ]
  };

  /**
   * Public: Construct a new Vesperize object.
   *
   * @param element the wrapping element.
   * @param options the default options of Vesperize.
   * @constructor
   */
  var Vesperize = function (element, options) {
    this.id         = Utils.brand("violette");
    this.namespace  = 'violette-scratchspace';
    this.options    = $.extend(true, {}, defaults, options);
    this.element    = $(element);

    this.primaryKey = this.element.attr('data-identity');

    this.handler    = [];
    this.callback   = [];

    this.classname  = null;
    this.codemirror = null;
    this.editor     = null;
    this.textarea   = null;

    // status stuff
    this.status     = null;
    this.sloc       = null;
    this.staging    = null;

    // history (edit tracker)
    this.drafts     = new Drafts(this.primaryKey);
    this.history    = null;
    this.lastaction = null;

    // logging
    this.log        = new Logger(this.primaryKey);

    // notes
    this.notes      = new Notes(this.primaryKey);
    this.displayer  = null;

    // use entirely with local storage
    this.content   = null;
    this.tinyUrl   = null;
    this.exampleId = null;

    // create the multistage object
    this.multistage     = {};
    this.buffers        = null; // store button LIVE stages
    this.indexes        = [];

    // todo(Huascar) persist this information
    // documentation mode
    this.description = 'Java: *scratched* code snippet';
    this.tags        = [];
    this.confidence  = 5;
    this.document    = null;

    // notifications on the side
    this.parent     = this.element.parent('div.post-text');
    this.context    = {
      "dir1": "down",
      "dir2": "left",
      "context": this.parent
    };

    PNotify.removeAll(); // remove any notification element (just in case)
    configuresPNotify();

    this.log.info("Initializing Violette");

    this.init();

    this.stopwatch  = new Stopwatch();
  };


  /**
   * Private: initialize Vesperize.
   *
   * @return {Vesperize} object
   */
  Vesperize.prototype.init = function () {
    // main violette instance
    var that = this;

    // check local storage and see if we can recover any saved information
    this.checkStorage();

    // build internal editor if we don't have one available
    if (this.editor == null) {
      var editor = Html.buildHtml('div', {
        'id': this.id
        , 'class': 'violette-editor file'
        , 'click': function () {
          that.focus();
        }
      }, {/*Empty*/});


      // build editors' header
      editor.append(Html.buildHeader(this));

      // build editor's body
      // - textarea placeholder
      var textarea = Html.buildHtml('textarea', that.content, {});
      editor.append(Html.buildBody(this, textarea));

      // build editor's footer
      editor.append(Html.buildFooter(this));

      // Set editor to 'blocked the original container'
      this.element.replaceWith(editor);

      // Set Vesperize's width/height
      $.each(['height', 'width'], function (k, attr) {
        if (that.options[attr] != 'inherit') {
          if ($.isNumeric(that.options[attr])) {
            editor.css(attr, that.options[attr] + 'px')
          } else {
            editor.addClass(that.options[attr])
          }
        }
      });

      // update violette's editor
      this.editor = editor;

      // convert the textarea element into a codemirror instance.
      this.codemirror = Editor.fromTextArea(
        this.textarea[0], {
          lineNumbers: true,
          styleActiveLine: true,
          styleSelectedText: true,
          theme: "default",
          mode: 'text/x-java',
          viewportMargin: Infinity,
          foldGutter: true,
          matchBrackets: true,
          extraKeys: {
            "Ctrl-Q": function (cm) {
              that.log.info("Pressing Ctrl-Q to force folding of code block.");
              //noinspection JSUnresolvedFunction
              cm.foldCode(cm.getCursor());
            }
            , "Ctrl-S": function(cm){
              that.log.info("Pressing Ctrl-S to force saving example and marking a draft.");
              markNewDraft(that, cm.getValue());
              persistContent(that, cm.getValue());
              inspectCodeExample(that, cm.getValue());
            }
          },
          undoDepth: 1, /*no undoes*/
          gutters: ["breakpoints", "Editor-linenumbers", "Editor-foldgutter"]
        }
      );

      // tune editor's height to make sure we don't end up
      // with a tall editor, which may be difficult to follow

      // this will adjust height of code mirror
      var grow      = 13.45;
      var heightVal = ($(this.textarea).val().split(/\r\n|\r|\n/).length);

      heightVal = heightVal <= 20 ? 20 : heightVal;
      heightVal = heightVal > 35  ? 30 : heightVal;

      var editorHeight  = heightVal * grow;
      this.codemirror.setSize("100%", editorHeight);
      this.codemirror.refresh();


      // every time we are idle, violette will save your content
      this.editor.idleTimer(that.options.intervalinmillis);

      this.bindElements();

    } else {
      this.editor.show();
    }

    postprocessing(this);

    return this;
  };

  /**
   * Private: bind HTML element to their respective listeners
   */
  Vesperize.prototype.bindElements = function () {
    this.editor.on(
      'click', '[data-provider="violette-scratchspace"]',
      $.proxy(this.handleClickEvent, this)
    );

    this.codemirror.on('focus', $.proxy(this.focus, this));
    this.codemirror.on('blur',  $.proxy(this.blur, this));


    var that = this;
    var efficientCallback = Utils.debounce(function () {
      var content = that.codemirror.getValue();
      that.classname = compareAndSetClassName(content, that.classname, that);

      persistContent(that, content);

    }, 250, false);

    // save the content, locally, every quarter of a second after
    // 5 seconds of idle time => total = 5.25 seconds.
    this.editor.on("idle.idleTimer", efficientCallback);


    // if editing, then change the status
    this.codemirror.on('beforeChange', function(instance, change){
      that.status.text('NOT SAVED ');
      instance.old = instance.getValue();
    });

    this.codemirror.on('change', function(instance, change){
      // since we are setting a value when replaying history
      // , we set the tinyUrl to null. The solution is to make sure
      // we don't fall for this use case
      // erase above text if test passes
      if(that.buffers == null && that.history == null && that.displayer == null){
        if(instance.old !== instance.getValue() && that.tinyUrl !== null){
          notifyContent('info', that, "Saving NEW code example");
          // If so, then the current is becoming a new code example
          that.tinyUrl    = null;
          that.stopwatch  = new Stopwatch();
        }
      }

      instance.old    = null; // cleaning our stuff afterwards

    });

    // makes sure that when we exit fullscreen mode
    // the fullscreen button has the appropriate icons

    var efficientUiChangesFullscreenCallback = Utils.debounce(function () {
      if (!screenfull.isFullscreen) {
        that.exchange('fullscreen', "octicon-screen-full");
        that.change('fullscreen', function (el) {
          $(el).tooltipster('content', 'Enter fullscreen');
        });
      } else {
        that.exchange('fullscreen', "octicon-screen-normal");
        that.change('fullscreen', function (el) {
          $(el).tooltipster('content', 'Exit fullscreen');
        });
      }

    }, 250, false);

    //noinspection JSUnresolvedVariable
    this.editor.on(
      screenfull.raw.fullscreenchange,
      efficientUiChangesFullscreenCallback
    );
  };


  /**
   * Private: checks local HTML storage for saved code example.
   */
  Vesperize.prototype.checkStorage = function () {
    this.checkSavedContent();
    this.checkSavedAndMarkedDrafts();
    this.checkOtherSavedInfo();
  };

  Vesperize.prototype.checkSavedContent = function () {
    if (!supportsHtmlStorage()) {
      return;
    }

    var content = store.get(this.primaryKey);
    if (content) {
      this.content = content;
      return this;
    }

    // assert content is undefined and local content is null
    if(this.content == null){
      this.content =  Utils.getContent(this, this.element);
      return this;
    }
  };


  /**
   * Private: checks local HTML storage for saved all marked drafts.
   */
  Vesperize.prototype.checkSavedAndMarkedDrafts = function () {
    if (!supportsHtmlStorage()) {
      return;
    }

    var drafts = store.get(this.primaryKey + 'drafts');
    if (drafts) {
      this.drafts = new Drafts(this.primaryKey);
      for(var idx = 0; idx < drafts.drafts.length; idx++){
        var d = drafts.drafts[idx];
        this.drafts.addDraft(d);
      }
    }

    return this;
  };


  /**
   * Private: checks local HTML storage for saved information about the example;
   * e.g., exampleId, tinyUrl, comments, etc.
   */
  Vesperize.prototype.checkOtherSavedInfo = function () {
    if (!supportsHtmlStorage()) {
      return;
    }

    // 1. Check for example id
    var eid = store.get(this.primaryKey + 'eid');
    if(eid){ // if exampleID is found, it is safe to assume we have its tinyUrl
      this.exampleId = eid;
      this.tinyUrl   = store.get(this.primaryKey + 'tinyUrl');
    }

    // 2. comments
    var notes = store.get(this.primaryKey + 'notes');
    if (notes) {
      this.notes = new Notes(this.primaryKey);
      for(var idx = 0; idx < notes.notes.length; idx++){
        var n = notes.notes[idx];
        this.notes.addNote(n);
      }

    }

    return this;
  };


  /**
   * Private: listener to click events
   *
   * @param e the source of the event; i.e., the button.
   */
  Vesperize.prototype.handleClickEvent = function (e/*JQuery.Event*/) {
    var that = this;

    var target = $(e.currentTarget);
    var handler = that.handler;
    var callback = that.callback;

    var handlerName = target.attr('data-handler');
    var callbackIndex = handler.indexOf(handlerName);
    var callbackHandler = callback[callbackIndex];

    if(typeof(target.attr('data-stage')) === 'undefined'){
      // call the button's bound callback
      callbackHandler(that);
    } else {
      callbackHandler(that, target.attr('data-stage'));
    }

    e.preventDefault();
  };

  /**
   * Private: persist the current content found in codemirror locally.
   * @param value current content
   * @return {Vesperize} object.
   */
  Vesperize.prototype.persist = function (value) {

    if (!supportsHtmlStorage()) {
      return this;
    }

    // save content
    var localContent = store.get(this.primaryKey);

    if(localContent !== value){
      store.set(this.primaryKey, value);
      this.content = null; // we don't need content anymore
    }

    // save exampleId
    var key = this.primaryKey + 'eid';
    var eid = this.exampleId || null;

    // this covers the tinyUrl null checking since both attributes
    // are updated together
    if(eid !== null){
      var localEid = store.get(key);
      if(localEid !== eid){
        store.set(key, eid);
      }

      // save tinyUrl
      key = this.primaryKey + 'tinyUrl';
      var turl = this.tinyUrl;
      var localTinyUrl = store.get(key);

      if(localTinyUrl !== turl){
        store.set(key, turl);
      }
    }

    // save drafts
    key = this.primaryKey + 'drafts';
    var drafts  = this.drafts.toJSON();

    var localDrafts = store.get(key);

    if(store.serialize(localDrafts) !== store.serialize(drafts)) {
      store.set(key, drafts);
    }

    // save notes
    key = this.primaryKey + 'notes';
    this.notes = Notes.transfer(this, this.notes);
    var notes = this.notes.toJSON();
    var localNotes = store.get(key);

    if(store.serialize(localNotes) !== store.serialize(notes)){
      store.set(key, notes);
    }


    return this;
  };

  /**
   * Private: changes the style of a button.
   *
   * @param name The name of the button.
   * @param callback The alteration function
   */
  Vesperize.prototype.change = function (name, callback) {
    var that = this;
    var handler = that.handler;
    var isAll = (name == 'all');

    $.each(handler, function (k, v) {
      var halt = ((isAll) ? false : v.indexOf(name) < 0 );
      if (!halt && callback) { // halt == false
        callback(that.editor.find(
            'button[data-handler="' + v + '"]'
          )
        );
      }
    });
  };

  /**
   * Private: exchange icons on a given HTML element.
   *
   * @param name name of element
   * @param a new icon
   */
  Vesperize.prototype.exchange = function (name, a) {
    var that = this;

    function exchangeicon(element) {
      var icon = element.find("span.mega-octicon");
      if (icon.length >= 1) { // found octicons library
        if (icon.hasClass("octicon-screen-full")) {
          icon.removeClass("octicon-screen-full");
          icon.addClass(a);
        } else if (icon.hasClass("octicon-screen-normal")) {
          icon.removeClass("octicon-screen-normal");
          icon.addClass(a);
        }
      }
    }

    that.change(name, exchangeicon);
  };

  //noinspection JSUnusedLocalSymbols
  Vesperize.prototype.focus    = function(cm/*CodeMirror*/){
    var editor = this.editor;

    editor.addClass('active');

    // Blur other scratchspaces
    $(document).find('.violette-editor').each(function(){
      if ($(this).attr('id') != editor.attr('id')) {
        var attachedScratchspace = $(this)
          .find('textarea')
          .data('scratchspace');


        if (attachedScratchspace == null) {
          attachedScratchspace = $(this)
            .find('div[data-provider="violette-preview"]')
            .data('scratchspace')
        }

        if (attachedScratchspace) {
          attachedScratchspace.blur();
        }
      }
    });

    return this;
  };


  //noinspection JSUnusedLocalSymbols
  Vesperize.prototype.blur = function(cm/*CodeMirror*/){

    var options = this.options;
    var editor  = this.editor;

    var isHideable  = options.hideable;

    if (editor.hasClass('active') || this.element.parent().length == 0) {
      editor.removeClass('active');

      if(isHideable){
        editor.hide();
      }
    }

    return this;
  };

  /**
   * Private: fits Vesperize inside a div element.
   */
  Vesperize.prototype.fit = function(){
    this.codemirror.refresh();
  };

  /**
   * Private: enables already disabled buttons on Vesperize.
   *
   * @param name name of element to disable; 'all' if no one is given.
   *
   * @return {Vesperize} object
   */
  Vesperize.prototype.enableButtons = function(name) {
    name = name || 'all';

    var alter = function (el) {
      el.removeAttr('disabled');
    };

    this.change(name, alter);

    return this;
  };

  /**
   * Private: disables already enabled buttons on Vesperize.
   *
   * @param name name of element to enable; 'all' if no one is given.
   *
   * @return {Vesperize} object
   */
  Vesperize.prototype.disableButtons = function(name){
    name = name || 'all';

    var alter = function (el) {
      el.attr('disabled', 'disabled');
    };

    this.change(name, alter);

    return this;
  };

  return Vesperize;
}(window.jQuery, window.store));;/**
 * Violette plugin definition (it extends JQuery).
 *
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
 */
// the semi-colon before the function invocation is a safety
// net against concatenated scripts and/or other plugins
// that are not closed properly.
;(function($){
  "use strict";

  var COUNTER = 0;
  LE.init('2e1a6f53-37b0-4cd2-9252-cd4ed1734b19');

  function alterPretags(preElement) {
    preElement.attr('data-provide', 'violette-editable');
    preElement.attr('data-savable', 'true');
  }

  /** Creates a scratch space **/
  function scratch(element, options) {
    return new Vesperize(element, options);
  }

  //jQuery plugin
  var old = $.fn.scratchspace;
  $.fn.scratchspace = function (option) {
    return this.each(function () {
      var $this = $(this);

      // removes the scratch button if user decided to click the pre region {{
      var id     = $this.attr("data-scratcher-id");
      var $div   = $("div[data-scratcher-id='" + id + "']");
      $div.hide();
      // }}

      var data = $this.data('scratchspace');
      var options = typeof option == 'object' && option;
      if (!data) {
        $this.data(
          'scratchspace',
          (data = scratch(this, options))
        );
      }
    });
  };

  /** no conflict with Browser **/
  $.fn.scratchspace.noConflict = function () {
    $.fn.scratchspace = old;
    return this;
  };

  /** Global function and data-api **/

  var vesperize = function (element) {
    if (element.data('scratchspace')) {
      element.data('scratchspace').init();
      return;
    }
    element.scratchspace(element.data());
  };


  function isBlock($code){
    // ignore nested pre tags
    if($code.find("pre").length !== 0){
      return false;
    }

    // if it's less than 100 pixels, we don't treat it as a code block
    if($code.outerWidth() < 100){
      return false;
    }

    // if it's less than 30 lines of code, we don't treat it as a Violette-suitable
    // code block

    var splitText   = $code.text().split('\n');
    var loc         = splitText.length;

    if (loc < 15) return false;

    var C_LIKE = ['java', 'c', 'cpp', 'cs'];
    // if it's not Java, then we don't care about it
    var lang = Heuristics.detect($code);
    return C_LIKE.indexOf(lang) > -1;

  }


  function wireMouseEvents($block, $scratcher){
    // thanks to http://stackoverflow.com/questions/158070/jquery-how-to-position-one-element-relative-to-another
    $block.mouseenter(function(evt) {
      // .position() uses position relative to the offset parent,
      var pos = $(this).position();
      // .outerWidth() takes into account border and padding.
      var width = $(this).outerWidth();
      //show the menu directly over the placeholder
      $scratcher.css({
        position: "absolute",
        top: (pos.top + 7) + "px",
        left: (pos.left + width - 45) + "px"
      }).show();

      $scratcher.show();
    });

    $block.mouseleave(function(evt) {
      $scratcher.hide();
    });

    $scratcher.mouseenter(function(evt) {
      $(this).show();
      evt.stopPropagation();
    }).mouseleave(function() {
      $(this).hide();
    });
  }

  function wireTooltip($scratcher){
    $scratcher.attr('title', "Edit code");
    $scratcher.tooltipster({
        position: 'left',
        theme: 'tooltip-custom-theme'
      }
    );
  }

  function wireClick($scratcher){

    $scratcher.unbind('click').click(function(e){
      var id     = $(this).attr("data-scratcher-id");
      var $block = $("pre[data-scratcher-id='" + id + "']");
      vesperize($block);
      e.preventDefault();
    });

  }

  $(document).on( 'click.scratchspace.data-api',
    '[data-provide="violette-editable"]',
    function(e){
      vesperize($(this));
      e.preventDefault();
    }).ready(function(){

      $('pre').each(function(){
        var $pre = $(this);
        // make sure we have the inner-most blocks
        $pre.each(function(){
          var code  =  $(this);
          //var $this = code.parent('div');
          if(isBlock(code)){

            var attr = code.attr('data-provide');
            var containsAttr = (typeof attr !== 'undefined' && attr !== false);

            if(!containsAttr){
              var $codeScratcher  = $('<div/>', {class:'scratch-button'});
              var $scratch        = $('<button class="violette-button octicon-danger"><span class="octicon octicon-pencil"></span></button>');

              $codeScratcher.append($scratch);

              // we can referenced the attached $block
              $codeScratcher.attr("data-scratcher-id", COUNTER);
              code.attr("data-scratcher-id", COUNTER);

              var parent;
              if(typeof (code.parents('div.answer')[0]) !== 'undefined'){
                parent = code.parents('div.answer')[0];
              } else {
                if(typeof (code.parents('div.question')[0]) !== 'undefined'){
                  parent = code.parents('div.question')[0];
                } else {
                  parent = null;
                }
              }


              var identity;
              if(parent != null){
                var $parent = $(parent);
                var answerIdAttr   = $parent.attr('data-answerid');
                var questionIdAttr = $parent.attr('data-questionid');

                identity = answerIdAttr || questionIdAttr;

              }

              if(typeof (identity) === 'undefined'){
                identity = COUNTER;
              }


              code.attr("data-identity", identity);
              alterPretags(code);
              COUNTER++;


              $('body').append($codeScratcher);
              $codeScratcher.hide();

              wireMouseEvents(code, $codeScratcher);
              wireTooltip($codeScratcher);
              wireClick($codeScratcher);

            }
          }
        });

      });
    });

})(window.jQuery);