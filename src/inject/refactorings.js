/**
 * The Refactoring class. This class depends on the Utils, and
 * RestfulCall objects.
 *
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
 */
var Refactoring = (function (module) {
  "use strict";

  var postUrl = RestfulCall.SERVICE_POST_URL;
  var getUrl = RestfulCall.SERVICE_GET_URL;

  module.deleteSelection = function (name, content, range, callback) {
    var start = range.start;
    var end = range.end;

    var source = Utils.createCode(name, 'Java: *scratched* code snippet', content);

    var request = {
      'remove': {
        'what': 'region',
        'where': [start, end],
        'source': source
      }
    };

    RestfulCall.post(postUrl, request, null, callback/*(reply)*/);
  };


  module.detectMissingImports = function (name, content, callback) {

    var source = Utils.createCode(name, 'Java: *scratched* code snippet', content);

    var request = {
      'inspect': {
        'source': source,
        'imports': true
      }
    };

    RestfulCall.post(postUrl, request, null, callback/*(reply)*/);
  };

  module.inspectWholeSourcecode = function (name, content, callback) {

    var source = Utils.createCode(name, 'Java: *scratched* code snippet', content);

    var request = {
      'inspect': {
        'source': source,
        'imports': false
      }
    };

    RestfulCall.post(postUrl, request, null, callback/*(reply)*/);
  };

  module.renameSelectedMember = function (name, newName, content, range, callback) {
    var start = range.start;
    var end = range.end;

    var source = Utils.createCode(name, 'Java: *scratched* code snippet', content);

    var request = {
      'rename': {
        'what': 'member',
        'to': newName,
        'where': [start, end],
        'source': source
      }
    };

    RestfulCall.post(postUrl, request, null, callback/*(reply)*/);
  };


  module.clipSelectedBlock = function (name, content, range, callback) {
    var start = range.start;
    var end = range.end;

    var source = Utils.createCode(name, 'Java: *scratched* code snippet', content);

    var request = {
      'slice': {
        'source': source,
        'where': [start, end]
      }
    };

    RestfulCall.post(postUrl, request, null, callback/*(reply)*/);
  };


  module.deduplicate = function (name, content, callback) {
    var source = Utils.createCode(name, 'Java: *scratched* code snippet', content);

    var request = {
      'deduplicate': {
        'source': source
      }
    };

    RestfulCall.post(postUrl, request, null, callback/*(reply)*/);
  };

  module.fullCleanup = function (name, content, callback) {
    var source = Utils.createCode(name, 'Java: *scratched* code snippet', content);

    var request = {
      'cleanup': {
        'source': source
      }
    };

    RestfulCall.post(postUrl, request, null, callback/*(reply)*/);
  };


  module.optimize = function (name, content, callback) {
    var source = Utils.createCode(name, 'Java: *scratched* code snippet', content);

    var request = {
      'optimize': {
        'source': source
      }
    };

    RestfulCall.post(postUrl, request, null, callback/*(reply)*/);
  };

  module.format = function (name, content, callback) {
    var source = Utils.createCode(name, 'Java: *scratched* code snippet', content);

    var request = {
      'format': {
        'source': source
      }
    };

    RestfulCall.post(postUrl, request, null, callback/*(reply)*/);
  };


  module.getParticipants = function (callback) {
    RestfulCall.get(getUrl, null, callback/*(reply)*/);
  };


  module.saveCodeSnippet = function (source, callback) {
    var request = {
      'persist': {
        'source': source
      }
    };

    RestfulCall.put(postUrl, request, null, callback);
  };

  return module;

}(Refactoring || {}));