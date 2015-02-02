/**
 * @author Huascar A. Sanchez
 */
var Utils = (function ($, module) {
  "use strict";


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
   * calculates the offsets of a code selection.
   *
   * @param cm codemirror
   * @param content code example's content
   * @param selection user selection
   * @return {{start: number, end: number}}
   */
  module.selectionOffsets = function (cm, content, selection) {
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


  module.brand = brand;
  module.debounce = debounce;

  return module;

})(window.jQuery, Utils || {});