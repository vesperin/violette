/**
 * @author Huascar A. Sanchez
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
      'class': 'violette-footer  btn-toolbar'
    }, {});

    bottom = buildLeftBox(v, bottom, v.modes);
    bottom = buildRightBox(v, bottom, v.social);

    return bottom;
  };

  function buildLeftBox(v, container, actions){
    var leftBox   = module.buildHtml('div', {'class': 'info'}, {});
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

      var iconStr = '<span class="' + icon + '"></span>';
      var handler = v.namespace + '-' + name;

      var buttonHtml = module.buildHtml('button', iconStr, {
        'type': 'button'
        , 'title': title
        , 'data-provider': v.namespace
        , 'data-handler': handler
      });

      buttonHtml.tooltipster({
          position: 'right',
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
    v.status    = module.buildHtml('span', 'NOT SAVED ', {'class': 'status'});
    var divider = module.buildHtml('span', {'class':'meta-divider'}, {});

    leftContainer.append(v.status);
    leftContainer.append(divider);


    container.append(leftContainer);

    // build right container
    var actions = v.options.actions;
    var len     = actions.length;

    for(var i = 0; i < len; i++){
      // octicon-button
      var group   = module.buildHtml('div', { 'class': 'btn-group'}, {});
      var action  = actions[i];

      var name  = action.name;
      var title = action.title;
      var icon  = action.icon;
      var cb    = action.callback;

      var iconStr = '<span class="' + icon + '"></span>';
      var handler = v.namespace + '-' + name;

      var buttonHtml = module.buildHtml('button', iconStr, {
        'type': 'button'
        , 'title': title
        , 'data-provider': v.namespace
        , 'data-handler': handler
      });

      buttonHtml.tooltipster({
          position: 'right',
          theme: 'tooltip-custom-theme'
        }
      );

      v.handler.push(handler);
      v.callback.push(cb);

      if('plus' === name){
        leftContainer.append(buttonHtml);
      } else {
        rightContainer.append(buttonHtml);
      }

    }

    container.append(rightContainer);
    container.append(leftContainer);

    return container;  // DOM container including a nice-looking button group
  }

  /**
   * Create Vesperize's thin footer
   * @param v Vesperize object
   * @param container DOM editor
   * @param textarea text area object
   * @return {*}
   */
  function buildTextarea(v, container, textarea) {
    if (!container.is('textarea')) { // it must be a `pre` element
      var rawContent = (v.content != null
        ? v.content
        : container.text()
      );

      var currentContent = $.trim(rawContent);

      if (container.is('div')) {
        currentContent = currentContent
          .replace(/(<([^>]+)>)/ig, "") // strip html tags
          .replace(/ +(?= )/g, '')      // strip numerous whitespaces
          .replace(/^ +/gm, '');       // trim each line
      }


      textarea = module.buildHtml('textarea', currentContent, {
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

    body.append(buildTextarea(v, v.element, textarea));

    return body;
  };


  return module;

})(window.jQuery, Html || {});