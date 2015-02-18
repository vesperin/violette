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

})(window.jQuery, Utils || {});