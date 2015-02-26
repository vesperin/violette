/**
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
 */
var Html = (function ($, module) {
  "use strict";

  // rating bar template
  var template =
    '<select id="example-c" name="rating">' +
    '   <option value=""></option>'   +
    '   <option value="1">1</option>' +
    '   <option value="2">2</option>' +
    '   <option value="3">3</option>' +
    '   <option value="4">4</option>' +
    '   <option value="5">5</option>' +
    '</select>';

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
    return module.buildHtml('button', '<span class="octicon octicon-x" aria-hidden="true"></span>', {
      'class': 'close'
      , 'aria-label': 'Close'
      , 'data-provider': v.namespace
      , 'data-handler': v.namespace + '-' + 'close'
    });
  }


  function buildNextButton(v){
    return module.buildHtml('button', '<span class="octicon octicon-arrow-right" aria-hidden="true"></span>', {
      'class': 'next'
      , 'aria-label': 'Next'
      , 'data-provider': v.namespace
      , 'data-handler': v.namespace + '-' + 'next'
      , 'title': 'Next note'
    });
  }


  function buildNoteSection(v){
    v.staging.removeClass('violette-history');
    v.staging.attr('class', 'violette-multistage');
    v.staging.css({
      'height': '25px'
    });

    var left  = Html.buildHtml('span', {'class': 'tabnav-left'}, {});

    v.displayer = Html.buildHtml('span', '', {'class': 'note'});
    left.append(v.displayer);

    var right = Html.buildHtml('span', {'class': 'tabnav-right'}, {});
    right.append(Html.buildNextButton(v));
    right.append(Html.buildHtml('span', {'class':'break'}, {}));
    right.append(Html.buildClosingButton(v));

    v.staging.append(left);
    v.staging.append(right);

    return v.staging;
  }


  function buildStars(d, container){
    var starbox = Html.buildHtml('div', {
      'id': Utils.brand("starbox")
      , 'class': 'input select rating-c'
      , 'for': 'example-c'
      , 'style': 'padding: 15px;margin-bottom:-20px;'
    }, {});

    var heading = '<span class="octicon octicon-bookmark"></span> ';
    heading     = heading + 'How much confident are you on whether this code is reusable?';

    var title = Html.buildHtml('div', {
      'id': Utils.brand("intent-title")
      , 'class': 'titlearea'
    });

    var q = Html.buildHtml('label', heading, {});
    var qHelpText  = 'Rating values displayed on the bars. 1 is for ' +
      'no confident at all and 5 is for totally confident. Click on a bar to vote.';
    var qHelp = Html.buildHtml('p', qHelpText, {
      'class': 'help-block'
      , 'style': 'font-weight: normal;'
    });

    title.append(q);
    title.append(qHelp);

    var select = $(template);

    starbox.append(title);
    starbox.append(select);

    var bigD = d;
    select.barrating('show', {
      initialRating:bigD.getConfidence(),
      showValues:true,
      showSelectedRating:false,
      onSelect:function(value, text) {
        console.log("rating set!! =>" + value);
        bigD.setConfidence(parseInt(value));
      }
    });

    container.append(starbox);


    return container;
  }

  function buildLinks(options, text){
    var tweet  = text;
    var hyperlinkTarget     = (options.hyperlinkTarget != '') ? 'target="_' + options.hyperlinkTarget + '"' : '';
    var mentionTarget       = (options.mentionTarget != '') ? 'target="_' + options.mentionTarget + '"' : '';
    var hashtagTarget       = (options.hashtagTarget != '') ? 'target="_' + options.hashtagTarget + '"' : '';
    var hyperlinkClass      = (options.hyperlinkClass != '') ? 'class="' + options.hyperlinkClass + '"' : '';
    var mentionClass        = (options.mentionClass != '') ? 'class="' + options.mentionClass + '"' : '';
    var hashtagClass        = (options.hashtagClass != '') ? 'class="' + options.hashtagClass + '"' : '';
    var hyperlinkRel        = (options.hyperlinkRel != '') ? 'rel="' + options.hyperlinkRel + '"' : '';
    var mentionRel          = (options.mentionRel != '') ? 'rel="' + options.mentionRel + '"' : '';
    var hashtagRel          = (options.hashtagRel != '') ? 'rel="' + options.hashtagRel + '"' : '';

    if (options.excludeHyperlinks != true) {
      tweet = tweet.replace(/(https\:\/\/|http:\/\/)([www\.]?)([^\s|<]+)/gi, '<a href="$1$2$3" ' + hyperlinkTarget + ' ' + hyperlinkClass + ' ' + hyperlinkRel + '>$1$2$3</a>');
      tweet = tweet.replace(/([^https\:\/\/]|[^http:\/\/]|^)(www)\.([^\s|<]+)/gi, '$1<a href="http://$2.$3" ' + hyperlinkTarget + ' ' + hyperlinkClass + ' ' + hyperlinkRel + '>$2.$3</a>');
      tweet = tweet.replace(/<([^a]|^\/a])([^<>]+)>/g, "&lt;$1$2&gt;").replace(/&lt;\/a&gt;/g, "</a>").replace(/<(.)>/g, "&lt;$1&gt;").replace(/\n/g, '<br />');
    }

    if (options.excludeMentions != true) {
      if (options.mentionIntent == false) {
        tweet = tweet.replace(/(@)([a-zA-Z0-9_]{1,20})/g, '<a href="http://twitter.com/$2" '
        + mentionTarget + ' '
        + mentionClass + ' '
        + mentionRel + '>$1$2</a>');
      } else {
        tweet = tweet.replace(/(@)([a-zA-Z0-9_]{1,20})/g, '<a href="http://twitter.com/intent/user?screen_name=$2">$1$2</a>');
      }
    }

    if (options.excludeHashtags != true) {
      tweet = tweet.replace(/(#)(\w+)/g, '<a href="https://twitter.com/search/?src=hash&q=%23$2" '
      + hashtagTarget + ' '
      + hashtagClass + ' '
      + hashtagRel
      + '>$1$2</a>');
    }

    return tweet;
  }


  function buildIntentArea(d, container){

    // intent container
    var intentbox = Html.buildHtml('div', {
      'id': Utils.brand("intentbox")
      , 'style': 'padding: 15px;'
    });


    var heading = '<span class="octicon octicon-light-bulb"></span> ';
    heading     = heading + 'What is the intent behind this code example?';

    var title = Html.buildHtml('div', {
      'id': Utils.brand("intent-title")
      , 'class': 'titlearea'
    });


    var question = Html.buildHtml('label', heading, {});
    var questionHelpText  = 'Provide a description of the goal behind this code and the reason for using it.';
    var questionHelp = Html.buildHtml('p', questionHelpText, {
      'class': 'help-block'
      , 'style': 'font-weight: normal;'
    });


    title.append(question);
    title.append(questionHelp);

    var intent = Html.buildHtml('form', {
      'id': Utils.brand("intent")
      , 'name': 'intent'
    });

    var composer = Html.buildHtml('div', {
      'id': Utils.brand('composer')
      , 'placeholder': 'Intent of code example?'
      , 'class': 'intent-composer'
      , 'contenteditable': true
    }, {});

    var fieldSet  = Html.buildHtml('fieldset', {'class': 'tabnav-right'}, {});
    var charCount = Html.buildHtml('span', {'id': Utils.brand('char-count'),'class': 'char-count'}, {});
    var inputObj  = module.buildHtml('div', {}, {});

    inputObj.prepend('You have ');
    inputObj.append(charCount);
    inputObj.append(' characters left');

    fieldSet.append(inputObj);

    intent.append(composer);
    intent.append(fieldSet);


    charCount.text(parseFloat(d.options.textLength - d.getDescription().length));
    var bigD = d;
    composer.on('click', function(){
      $(this).text(bigD.getDescription());
      bigD.moveCursorToEnd($(this)[0]);
      $(this).focus();
    });

    composer.on('blur', function(){
      var $this = $(this);
      if(Utils.isStringEmpty($this.text())
        && Utils.isStringEmpty(bigD.getDescription())){

        $this.removeClass("focus");

      } else {
        if($this.hasClass('focus')){
          $this.removeClass('focus');
        }

        $this.html(buildLinks(bigD.options, bigD.getDescription()));
      }

    });

    composer.on('keyup', function(){
      var tweetCount      = $(this).text().length;
      var remainingChars  = parseFloat(d.options.textLength - tweetCount);

      if(remainingChars <= 20){
        charCount.addClass('warning');
      } else {
        charCount.removeClass('warning');
      }

      charCount.text(remainingChars);
      bigD.setDescription($(this).text());

      if(tweetCount >= 80 || tweetCount <= 11/*min-max text range*/){
        inputObj.attr('disabled', 'disabled');
      } else {
        inputObj.removeAttr('disabled');
      }
    });

    if(!Utils.isStringEmpty(d.getDescription())){
      composer.html(buildLinks(bigD.options, bigD.getDescription()));
      composer.focus();
    }

    intentbox.append(title);
    intentbox.append(intent);

    container.append(intentbox);

    return container;
  }


  function buildTagsArea(d, container){

    var heading = '<span class="octicon octicon-tag"></span> ';
    heading     = heading + 'Tags';

    // 1
    var title = Html.buildHtml('label', heading, {
      'id': Utils.brand("tags-title")
      , 'for': 'tag'
      , 'class': 'control-label'
      , 'style': 'margin-bottom: 10px;'
    });



    // 2
    var tags = Html.buildHtml('div', {
      'class': 'tagging'
      , 'data-tags-input-name': 'taggone'
    }, {});

    // 3
    var helpText  = 'Press Enter, Comma or Spacebar to create a new tag, ' +
      'Backspace or Delete to remove the last one. You could either write @ (topic), ' +
      '# (datastructure), or ~ (algorithm) along with a text.';
    var help = Html.buildHtml('p', helpText, {
      'class': 'help-block'
      , 'style': 'font-size: 14px;'
    });

    // tags container
    var tagbox = Html.buildHtml('div', {
      'id': Utils.brand("tags")
      , 'class': 'tags'
      , 'placeholder': 'Enter new Tag'
    });

    tagbox.append(title);
    tagbox.append(tags);
    tagbox.append(help);

    container.append(tagbox);

    var bigD = d;
    d.options.tagging.subscriber = function(array){
      if(array && array.length > 0){
        bigD.setTags(array);
      }
    };

    // provide our own options to the tagging plugin
    tags.tagging(d.options.tagging);
    tags.tagging( "add", d.getTags());

    return container;
  }

  function bindCodeEvents(code){
    var flag;
    code.on('mousedown', function() {
      flag = 0;
    });

    code.on('mousemove', function(){
      flag = 1;
    });

    code.on('mouseup', function(){
      if(flag === 0){
        Utils.selectText($(this)[0]);
      }
    });
  }

  function buildCodeArea(d, container){

    // code container
    var codebox = Html.buildHtml('div', {
      'id': Utils.brand("codebox")
      , 'style': 'padding: 15px;'
    });


    var heading = '<span class="octicon octicon-code"></span> ';
    heading     = heading + 'Your <strong>modified code fragment</strong> is below. ' +
    'You can easily select it with just <strong>one click</strong>!';

    var title = Html.buildHtml('div', {
      'id': Utils.brand("code-title")
      , 'class': 'titlearea-light'
    });


    var codeLabel = Html.buildHtml('label', heading, {
      'style': 'font-weight: normal;'
    });
    title.append(codeLabel);

    var codecontainer = Html.buildHtml('div', {
      'id': Utils.brand("codecontainer")
    });

    var pre = Html.buildHtml('pre', {
      'style':'display: block; padding: 6px 4px; background: #fff; border: 0; margin-top:10px;'
    }, {});

    var codeid = Utils.brand('code');

    var code = Html.buildHtml('code', {
      'id': codeid
      , 'class': 'java'
      , 'style': 'font-size: 12px;'
    }, {});

    bindCodeEvents(code);

    code.html(d.getContent());
    pre.append(code);

    codecontainer.append(pre);

    codebox.append(title);
    codebox.append(codecontainer);

    container.append(codebox);

    container.codeElement =  code;

    return container;

  }

  function buildCollectedNotes(d, container){
    var notes = d.getNotes().toHashArray();
    var len   = notes.length;

    var prefix = '<span class="octicon octicon-comment-discussion" style="color: #888;"></span> ';
    var text   = prefix + len + (len > 1 ? ' Comments' : ' Comment');

    var title = Html.buildHtml('div', text, {
      'id': Utils.brand("notes-title")
      , 'class': 'notes-title'
    });

    container.append(title);

    for(var idx = 0; idx < len; idx++){
      var note = notes[idx];
      if(note){

        var from = parseInt(note.from.split(';')[0]) + 1;
        var to   = parseInt(note.to.split(';')[0]) + 1;

        var rangeText = ' [' + from + '-' + to + ']';

        var noteHtml = Html.buildHtml('blockquote', note.text, {
           'id':Utils.brand("note")
           , 'style': 'margin-left: 4px; margin-right: 10px;color: #2c3e50; font-size: 13px; margin-top:5px;'
        });

        var userHtml  = Html.buildHtml('footer', note.username + ' annotated section ' + rangeText, {});

        noteHtml.append(userHtml);
        container.append(noteHtml);
      }
    }

    return container;

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

  module.buildInput = function(placeholder){
    placeholder = placeholder || "New Note?";
    var shell = module.buildHtml('div', {
      'class': 'col-md-12'
    }, {});

    var inside = '<i class="octicon octicon-pencil"></i>' +
      '<input type="text" class="form-control" style="border-color: #d6dbdf;box-shadow: none;" ' +
      'placeholder="' + placeholder + '" />';

    var entry = module.buildHtml('div', inside, {
      'class': 'right-inner-addon'
      , 'style': 'margin-left: 5px;'
    });

    shell.append(entry);

    return shell;
  };

  module.buildNextButton    = buildNextButton;
  module.buildClosingButton = buildClosingButton;
  module.buildNoteSection   = buildNoteSection;
  module.buildOcticonButton = buildOcticonButton;
  module.buildStars         = buildStars;
  module.buildIntentArea    = buildIntentArea;
  module.buildTagsArea      = buildTagsArea;
  module.buildCodeArea      = buildCodeArea;

  module.buildCollectedNotes  = buildCollectedNotes;
  return module;

})(window.jQuery, Html || {});