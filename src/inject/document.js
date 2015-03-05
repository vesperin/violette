/**
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
})(window.jQuery, window.hljs);