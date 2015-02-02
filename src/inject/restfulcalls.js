/**
 * Utility to perform ajax get and post requests. Supported browsers:
 * Chrome, Firefox, Opera, Safari, Internet Explorer 7+.
 *
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
 */
var RestfulCall = (function ($, module) {
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

}(window.jQuery, RestfulCall || {}));