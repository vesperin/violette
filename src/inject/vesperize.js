//noinspection JSUnresolvedVariable
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
      { name: 'options'
        , title: 'More options'
        , icon: 'octicon octicon-gear'
        , callback: function (v/*Vesperize*/) {}
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
}(window.jQuery, window.store));