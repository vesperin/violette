//noinspection JSUnresolvedVariable
/**
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
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

    editor.focus();
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
      return 'localStorage' in window && window.localStorage !== null;
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

      selectBuffer(that, that.codemirror, originalMarker, []);
      that.buffers = null;

      expandEverything(that.codemirror);
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
    , intervalinmillis: 5000
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
        name: 'notes'
        , title: 'Annotates code sections'
        , icon: 'octicon octicon-comment'
        , callback: function (v/*Violette*/) {}
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
        , callback: function(v){}
      },
      {
        'name': 'notes'
        , 'title': 'Launch notes'
        , 'label': 'Notes'
        , callback: function(v){}
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

    // use entirely with local storage
    this.content = null;

    // create the multistage object
    this.multistage     = {};
    this.buffers        = null; // store button LIVE stages

    this.parent     = this.element.parent('div.post-text');
    this.context    = {
      "dir1": "down",
      "dir2": "left",
      "context": this.parent
    };

    // must be initialize in other to use octicon icons
    // for their alerts
    PNotify.prototype.options.styling = "octicon";
    PNotify.prototype.options.delay   = 4000;

    this.init();

    this.stopwatch  = new Stopwatch();
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

    }, 250, false);

    // save the content, locally, every quarter of a second after
    // 5 seconds of idle time => total = 5.25 seconds.
    this.editor.on("idle.idleTimer", efficientCallback);


    // if editing, then change the status
    this.codemirror.on('beforeChange', function(){
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

    var content = localStorage.getItem(this.primaryKey);
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

    if(JSON.stringify(localStorage.getItem(this.primaryKey)) !== JSON.stringify(value)){
      localStorage.setItem(this.primaryKey, value);
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


  Vesperize.prototype.fit = function(){
    this.codemirror.refresh();
  };

  return Vesperize;
}(window.jQuery));