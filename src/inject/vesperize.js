/**
 * @author Huascar A. Sanchez
 */
var Vesperize = (function ($) {
  "use strict";

  /**
   * Default class name; used during refactorings.
   *
   * @type {string} the actual class name.
   */
  var defaultClassname = 'Scratched';

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
    v.persist(content);
    v.status.text('SAVED ');
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
      return 'localStorage' in window && window.localStorage !== null;
    } catch (e) {
      return false;
    }
  }

  /**
   * Multi stage a code example.
   * @param v Violette object.
   */
  function multiStageCode(v/*Violette*/) {
    // todo(Huascar) implement
    console.log(JSON.stringify(v.multistage[v.id]));
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

        for (var l = 0; l < where.length; l++) {
          var fold = where[l];
          var location = Utils.createLocation(codemirror.getValue(), fold[0], fold[1]);
          //noinspection JSUnresolvedFunction
          v.codemirror.foldCode(
            Editor.Pos(
              location.from.line,
              location.from.col
            )
          );
        }

      } else { // failure
        var text = 'There was an internal server error.';
        var internalError = reply.failure.message.indexOf(text) > -1;
        var noErrors      = reply.failure.message.length == 0;
        var error = (
          (internalError || noErrors)
            ? "Invalid selection; unable to perform operation."
            : reply.failure.message
        );

        // todo(Huascar) implement Logger.err(error);
        // a bar that appears above the footer
      }
    }
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
    , intervalinmillis: 5000
    , 'actions':  [
      {
        name: 'summary'
        , title: 'Summarize code example'
        /*No label; we'll use tooltips */
        , icon: 'octicon octicon-fold'
        , callback: function (v/*Violette*/) {
        // todo(Huascar) implement
        }
      }
    ]
    , 'modes':  []
    , 'social': []
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

    this.handler    = [];
    this.callback   = [];

    this.classname  = null;
    this.codemirror = null;
    this.editor     = null;
    this.textarea   = null;
    this.status     = null;
    this.stopwatch  = null;

    // use entirely with local storage
    this.content = null;

    // create the multistage object
    this.multistage = {};

    this.init();

  };


  /**
   * Private: initialize Vesperize.
   *
   * @return {Vesperize} object
   */
  // todo(Huascar) DONE
  Vesperize.prototype.init = function () {
    // main violette instance
    var that = this;

    // check local storage and see if we can recover the last
    // saved edit made by the current user.
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
              cm.foldCode(cm.getCursor());
            }
            , "Ctrl-S": function(cm){
              persistContent(that, cm.getValue());
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

      var editorHeight  = ((heightVal <= 25)? heightVal * grow : ((heightVal + 10) * grow));
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

      // todo(Huascar) implement
      //Refactoring.inspectWholeSourcecode(that.classname, content,
      //  function (reply) {
      //
      //    if (!reply.warnings && !reply.failure) {
      //      that.persist();
      //    } else {
      //      handleReply(that, reply);
      //    }
      //  }
      //);

    }, 250, false);

    // save the content, locally, every quarter of a second after
    // 5 seconds of idle time => total = 5.25 seconds.
    this.editor.on("idle.idleTimer", efficientCallback);


    // if editing, then change the status
    this.codemirror.on('beforeChange', function(instance, change){
      that.status.text('NOT SAVED ');
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
    if (!supportsHtmlStorage()) {
      return;
    }

    if (localStorage.content) {
      this.content = localStorage.content;
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

    // call the button's bound callback
    callbackHandler(that);

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

    if(JSON.stringify(localStorage.content) !== JSON.stringify(value)){
      localStorage.content = value;
      this.content = null; // we don't need content anymore
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


  Vesperize.prototype.fit = function(){
    this.codemirror.refresh();
  };

  return Vesperize;
}(window.jQuery));