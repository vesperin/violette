/**
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
 */
var Html = (function ($, module) {
  "use strict";

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
    return Html.buildHtml('button', '<span class="octicon octicon-x" aria-hidden="true"></span>', {
      'class': 'close'
      , 'aria-label': 'Close'
      , 'data-provider': v.namespace
      , 'data-handler': v.namespace + '-' + 'close'
    });
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


  module.buildClosingButton = buildClosingButton;


  return module;

})(window.jQuery, Html || {});