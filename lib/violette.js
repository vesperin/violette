/**
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
 */
var Utils = (function ($, module) {
  "use strict";


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

        console.log(offsetStart + " - " + offsetEnd);

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
                                confidence, comments, elapsedtime) {
    tags = tags || [];
    datastructures = datastructures || [];
    algorithms = algorithms || [];
    refactorings = refactorings || [];
    confidence = confidence || 0;
    comments = comments || [];
    elapsedtime = elapsedtime || "";

    var url = document.location.href;
    var birthday = Date.now();

    description = description || 'Java: *scratched* code snippet';
    return {
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
})();;/**
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
 */
var Html = (function ($, module) {
  "use strict";

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
    container = buildBoxFooter(v, container, leftBox, actions);
    return container;
  }

  function buildRightBox(v, container, actions){
    var rightBox  = module.buildHtml('span', {'class': 'tabnav-right'}, {});
    container = buildBoxFooter(v, container, rightBox, actions);
    return container;
  }

  function buildBoxFooter(v, container, box, actions) {

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
        : action.label
      );


      var handler = v.namespace + '-' + name;


      var buttonHtml = (hasLabel
        ? buildOcticonFooterButton(name, title, v, handler, iconStr)
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

  function buildOcticonFooterButton(name, title, v, handler, iconStr){
    var darkTheme = name === 'document';
    return module.buildHtml('button', iconStr, {
      'type': 'button'
      , 'class': darkTheme ? 'violette-button minibutton dark' : 'violette-button minibutton'
      , 'title': title
      , 'data-provider': v.namespace
      , 'data-handler': handler
    });
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
    return Html.buildHtml('button', '<span class="octicon octicon-x" aria-hidden="true"></span>', {
      'class': 'close'
      , 'aria-label': 'Close'
      , 'data-provider': v.namespace
      , 'data-handler': v.namespace + '-' + 'close'
    });
  }


  function buildNextButton(v){
    return Html.buildHtml('button', '<span class="octicon octicon-arrow-right" aria-hidden="true"></span>', {
      'class': 'next'
      , 'aria-label': 'Next'
      , 'data-provider': v.namespace
      , 'data-handler': v.namespace + '-' + 'next'
      , 'title': 'Next note'
    });
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

  module.buildInput = function(){
    var shell = module.buildHtml('div', {
      'class': 'col-md-12'
    }, {});

    var inside = '<i class="octicon octicon-pencil"></i>' +
      '<input type="text" class="form-control" style="border-color: #d6dbdf;box-shadow: none;" ' +
      'placeholder="Annotate selection" />';

    var entry = module.buildHtml('div', inside, {
      'class': 'right-inner-addon'
      , 'style': 'margin-left: 5px;'
    });

    shell.append(entry);

    return shell;
  };

  module.buildNextButton    = buildNextButton;
  module.buildClosingButton = buildClosingButton;


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

  function openInputDialog(editor, text, shortText, deflt, f){
    //noinspection JSUnresolvedVariable
    if (editor.openDialog) {
      //noinspection JSUnresolvedFunction
      editor.openDialog(text, f, {value: deflt});
    } else {
      f(prompt(shortText, deflt));
    }
  }


  function deleteButtonHandler(v, name){
    var handlerIndex = v.handler.indexOf(name);
    delete v.handler[handlerIndex];
    delete v.callback[handlerIndex];
  }


  function creatingNotesSection(v){
    v.disableButtons();
    notifyContent('info', v, 'Entering notes view');

    var left  = Html.buildHtml('span', {'class': 'tabnav-left'}, {});

    v.displayer = Html.buildHtml('span', '', {'class': 'note'});
    left.append(v.displayer);

    var right = Html.buildHtml('span', {'class': 'tabnav-right'}, {});
    right.append(Html.buildNextButton(v));
    right.append(Html.buildHtml('span', {'class':'break'}, {}));
    right.append(Html.buildClosingButton(v));

    v.staging.append(left);
    v.staging.append(right);
    v.handler.push(v.namespace + '-' + 'close');
    v.callback.push(function(that){

      notifyContent('info', that, 'Exiting notes view');

      that.staging.children().hide();
      that.staging.children().remove();

      that.staging.hide();
      that.codemirror.setOption("readOnly", false);

      deleteButtonHandler(v, v.namespace + '-' + 'close');
      deleteButtonHandler(v, v.namespace + '-' + 'next');

      that.enableButtons();
      that.codemirror.setSelection({'line':0, 'ch':0});
    });
    v.handler.push(v.namespace + '-' + 'next');

    var nextNote = function(that){
      var next     = that.notes.next();
      var text     = next.text;
      var location = next.range;

      var from = {'line':location.from.line, 'ch':location.from.col};
      var to   = {'line':location.to.line, 'ch':location.to.col};

      (function(f, t, c){
        var editor = c.codemirror;
        c.codemirror.operation(function() {
          editor.getDoc().setSelection(f, t);
        });
      })(from, to, that);

      that.displayer.text(text);
      that.codemirror.focus();
    };

    v.callback.push(nextNote);

    v.staging.show();
    nextNote(v);
    v.codemirror.setOption("readOnly", true);
    v.codemirror.focus();
  }

  /**
   * Creates the edit tracker so that developers
   * can replay history (i.e., navigate marked drafts)
   *
   * @param v Vesperize object
   */
  function replayHistory(v){

    v.disableButtons();
    notifyContent('info', v, 'Entering history view');

    var left  = Html.buildHtml('span', {'class': 'tabnav-left'}, {});
    var right = Html.buildHtml('span', {'class': 'tabnav-right'}, {});
    var tip   = Html.buildHtml('span', 'Hello', {'id': Utils.brand('value'), 'class': 'tabnav-center'});

    // todo(Huascar) implement drafts tracking
    function setValue(value, handleElement, slider){
      // 1. take the value and use it as the index for this.drafts[value]
      //    to get some data and access it to get the name of the draft
      // 2. this name will be text to be inserted into the tip html element.
      // 3. use the select buffer thing to swap documents as the slider
      //    handle is dragged left or right
      // 4. WHen exiting, then put the original document back in place
      tip.text(value);
    }

    v.history = Html.buildEditTracker();
    left.append(v.history);
    v.staging.append(left);

    v.history.noUiSlider({
      start: [ 0 ],
      step: 1,
      connect: 'lower',
      range: {
        'min': [0],
        'max': [1000]
      }
    });

    v.history.Link('lower').to(setValue);

    v.staging.append(tip);
    right.append(Html.buildClosingButton(v));
    v.staging.append(right);

    v.handler.push(v.namespace + '-' + 'close');
    v.callback.push(function(that){

      notifyContent('info', that, 'Exiting history view');

      that.staging.children().hide();
      that.staging.children().remove();

      that.staging.hide();

      deleteButtonHandler(v, v.namespace + '-' + 'close');

      $(that.history)[0].destroy();
      that.history = null;

      that.enableButtons();

    });

    v.staging.show();
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
      e.classname = clsName;
      return clsName;
    } else {
      return className;
    }
  }

  function persistContent(v, content){
    if(v.buffers == null){
      v.persist(content);
      v.status.text('SAVED ');
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

    v.disableButtons();
    notifyContent('info', v, 'Entering multistage view');

    v.buffers = {}; // resetting cache
    v.buffers[originalMarker] = v.codemirror.getDoc();

    if(typeof(v.multistage[v.id]) === 'undefined'){
      v.codemirror.focus();
    }


    // todo(Huascar) convert each stage into a button.
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

      deleteButtonHandler(that, v.namespace + '-' + 'close');

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

      codemirror.setValue(draft.content);
    } else {
      if (reply.info) {
        //noinspection JSUnresolvedVariable
        console.log(reply.info.messages.join('\n'));
        notifyContent('info', v, reply.info.messages.join('\n'));
        codemirror.focus();
      } else if (reply.warnings) {
        if (silent) {
          console.log(reply.warnings.join('\n'));
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
            // check if its comment
            if (Matcher.isComment(selection)) {
              // if the selection is a comment, then remove it
              // then call the Refactoring.prepare...
              content = content.replace(selection, '');

              // doing this we allow us to fix issues related to
              // have a clean version of code snippet
              Refactoring.format(v.classname, content, function (reply) {
                handleReply(v, reply);
              });

            } else {

              Refactoring.detectPartialSnippet(v.classname, content,
                function (reply) {

                  var preprocess = requiresPreprocessing(reply);
                  Refactoring.deleteSelection(
                    v.classname, content, range, preprocess, function (reply) {
                      handleReply(v, reply);
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
        , title: 'Clip a code selection'
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

              Refactoring.detectPartialSnippet(v.classname,
                content, function(reply){
                  var preprocess = requiresPreprocessing(reply);
                  Refactoring.clipSelectedBlock(v.classname, content, range,
                    preprocess, function (reply) {
                      handleReply(v, reply);
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

          Refactoring.detectPartialSnippet(v.classname, content,
            function (reply) {
              var preprocess = requiresPreprocessing(reply);
              Refactoring.fullCleanup(v.classname, content, preprocess, function (reply) {
                handleReply(v, reply);
              });
            }
          );
        }
      },
      {
        name: 'rename'
        , title: 'Rename a selected element'
        , icon: 'octicon octicon-diff-renamed'
        , callback: function (v/*Violette*/, newName) {
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

          Refactoring.renameSelectedMember(v.classname, newName, content,
            range, function (reply) {
              handleReply(v, reply);
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
          // opens a dialog
          openInputDialog(codemirror, Html.buildInput().html(), "Annotates selection:", "", function(description){
              other.operation(function(){
                 var content   = other.getValue();
                 var selection = other.getSelection();
                 selection     = "" === selection ? content : selection;
                 var location  = Utils.selectionLocation(other, content, selection);
                 var note = Notes.buildNote(description, location);
                 v.notes.addNote(note);
                 console.log(v.notes.size());
              });

          });

        }
      },
      {
        name: 'wrap'
        , title: 'Wrap code inside a class'
        , icon: 'octicon octicon-plus'
        , callback: function (v/*Violette*/, newName) {
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

        Refactoring.renameSelectedMember(v.classname, newName, content,
          range, function (reply) {
            handleReply(v, reply);
          });
      }
      },
      {
        'name': 'stage'
        , 'title': 'Multi stage code example'
        , 'label': 'Stage'
        , callback: function(v){

          if(v.buffers != null && Object.keys(v.buffers).length > 0) {
            v.codemirror.focus();
            return;
          }

          var codemirror = v.codemirror;
          var content = codemirror.getValue();

          // nothing to refactor.
          if ("" == content) return;

          v.classname = compareAndSetClassName(content, v.classname, v);

          Refactoring.detectPartialSnippet(v.classname, content,
            function (reply) {
              //name, content, preprocess, callback
              var preprocess = requiresPreprocessing(reply);
              Refactoring.multistageCode(
                v.classname, content, preprocess, function (reply) {
                  handleReply(v, reply);
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

          replayHistory(v);

        }
      },
      {
        'name': 'notes'
        , 'title': 'Launch notes'
        , 'label': 'Notes'
        , callback: function(v){
           if(v.notes.size() > 0 ){
             creatingNotesSection(v);
           } else {
             notifyContent('notice', v, 'You have not annotated anything');
           }
           v.codemirror.focus();
        }
      }
    ]
    , 'modes':  [
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
                   shareDialog(that, "Anyone with this link can see your fantastic work", that.tinyUrl);
                 } else {
                   notifyContent('error', that, "Unable to save your code example")
                 }
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

    // history
    this.drafts     = null;
    this.history    = null; // edit tracker

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

    this.parent     = this.element.parent('div.post-text');
    this.context    = {
      "dir1": "down",
      "dir2": "left",
      "context": this.parent
    };

    PNotify.removeAll(); // remove any notification element (just in case)

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
          addClass: "",
          // Whether to trigger this button when the user hits enter in a single line prompt.
          promptTrigger: true,
          click: function(notice, value){
            notice.remove();
            notice.get().trigger("pnotify.confirm", [notice, value]);
          }
        }
      ]
    };

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
              //noinspection JSUnresolvedFunction
              cm.foldCode(cm.getCursor());
            }
            , "Ctrl-S": function(cm){
              // todo(Huascar) Save both a draft and the content
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
      console.log(change.origin);
      instance.old = instance.getValue();
    });

    this.codemirror.on('change', function(instance, change){
      console.log(change.origin);
      if(instance.old !== instance.getValue() && that.tinyUrl !== null){
        notifyContent('info', that, "Saving NEW code example");
        // If so, then the current is becoming a new code example
        that.tinyUrl    = null;
        that.stopwatch  = new Stopwatch();
        instance.old    = null; // cleaning our stuff afterwards
      }
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
    this.editor.on(screenfull.raw.fullscreenchange, efficientUiChangesFullscreenCallback);
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
      this.drafts = drafts;
      return this;
    }

    // assert content is undefined and local content is null
    if(this.drafts == null){
      this.drafts =  {};
      return this;
    }
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

      return this;
    }

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

    var localEid = store.get(key);
    if(localEid !== eid){
      store.set(key, eid);
    }

    // save tinyUrl
    key = this.primaryKey + 'tinyUrl';
    var turl = this.tinyUrl || null;
    var localTinyUrl = store.get(key);

    if(localTinyUrl !== turl){
      store.set(key, turl);
    }

    // save drafts
    key = this.primaryKey + 'drafts';
    var drafts  = this.drafts;

    var localDrafts = store.get(key);

    if(store.serialize(localDrafts) !== store.serialize(drafts)) {
      store.set(key, drafts);
    }

    // save notes
    key = this.primaryKey + 'notes';
    var notes = {'notes': this.notes.toRawArray() };
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
        var attachedScratchspace = $(this).find('textarea').data('scratchspace');


        if (attachedScratchspace == null) {
          attachedScratchspace = $(this).find('div[data-provider="violette-preview"]').data('scratchspace')
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