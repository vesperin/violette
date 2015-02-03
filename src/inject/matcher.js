/**
 * @author Huascar A. Sanchez
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
})(window.jQuery, Matcher || {});