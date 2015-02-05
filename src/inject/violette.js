/**
 * Violette plugin definition (it extends JQuery).
 *
 * @author hsanchez@cs.ucsc.edu (Huascar A. Sanchez)
 */
// the semi-colon before the function invocation is a safety
// net against concatenated scripts and/or other plugins
// that are not closed properly.
;(function($){
  "use strict";

  var COUNTER = 0;

  function alterPretags(preElement) {
    preElement.attr('data-provide', 'violette-editable');
    preElement.attr('data-savable', 'true');
  }

  /** Creates a scratch space **/
  function scratch(element, options) {
    return new Vesperize(element, options);
  }

  //jQuery plugin
  var old = $.fn.scratchspace;
  $.fn.scratchspace = function (option) {
    return this.each(function () {
      var $this = $(this);

      // removes the scratch button if user decided to click the pre region {{
      var id     = $this.attr("data-scratcher-id");
      var $div   = $("div[data-scratcher-id='" + id + "']");
      $div.hide();
      // }}

      var data = $this.data('scratchspace');
      var options = typeof option == 'object' && option;
      if (!data) {
        $this.data(
          'scratchspace',
          (data = scratch(this, options))
        );
      }
    });
  };

  /** no conflict with Browser **/
  $.fn.scratchspace.noConflict = function () {
    $.fn.scratchspace = old;
    return this;
  };

  /** Global function and data-api **/

  var vesperize = function (element) {
    if (element.data('scratchspace')) {
      element.data('scratchspace').init();
      return;
    }
    element.scratchspace(element.data());
  };


  function isBlock($code){
    // ignore nested pre tags
    if($code.find("pre").length !== 0){
      return false;
    }

    // if it's less than 100 pixels, we don't treat it as a code block
    if($code.outerWidth() < 100){
      return false;
    }

    // if it's less than 30 lines of code, we don't treat it as a Violette-suitable
    // code block

    var splitText   = $code.text().split('\n');
    var loc         = splitText.length;

    if (loc < 15) return false;

    var C_LIKE = ['java', 'c', 'cpp', 'cs'];
    // if it's not Java, then we don't care about it
    var lang = Heuristics.detect($code);
    return C_LIKE.indexOf(lang) > -1;

  }


  function wireMouseEvents($block, $scratcher){
    // thanks to http://stackoverflow.com/questions/158070/jquery-how-to-position-one-element-relative-to-another
    $block.mouseenter(function(evt) {
      // .position() uses position relative to the offset parent,
      var pos = $(this).position();
      // .outerWidth() takes into account border and padding.
      var width = $(this).outerWidth();
      //show the menu directly over the placeholder
      $scratcher.css({
        position: "absolute",
        top: (pos.top + 7) + "px",
        left: (pos.left + width - 45) + "px"
      }).show();

      $scratcher.show();
    });

    $block.mouseleave(function(evt) {
      $scratcher.hide();
    });

    $scratcher.mouseenter(function(evt) {
      $(this).show();
      evt.stopPropagation();
    }).mouseleave(function() {
      $(this).hide();
    });
  }

  function wireTooltip($scratcher){
    $scratcher.attr('title', "Edit code");
    $scratcher.tooltipster({
        position: 'left',
        theme: 'tooltip-custom-theme'
      }
    );
  }

  function wireClick($scratcher){

    $scratcher.unbind('click').click(function(e){
      var id     = $(this).attr("data-scratcher-id");
      var $block = $("pre[data-scratcher-id='" + id + "']");
      vesperize($block);
      e.preventDefault();
    });

  }

  $(document).on( 'click.scratchspace.data-api',
    '[data-provide="violette-editable"]',
    function(e){
      vesperize($(this));
      e.preventDefault();
    }).ready(function(){

      $('pre').each(function(){
        var $pre = $(this);
        // make sure we have the inner-most blocks
        $pre.each(function(){
          var code  =  $(this);
          //var $this = code.parent('div');
          if(isBlock(code)){

            var attr = code.attr('data-provide');
            var containsAttr = (typeof attr !== 'undefined' && attr !== false);

            if(!containsAttr){
              var $codeScratcher  = $('<div/>', {class:'scratch-button'});
              var $scratch        = $('<button class="violette-button octicon-danger"><span class="octicon octicon-pencil"></span></button>');

              $codeScratcher.append($scratch);

              // we can referenced the attached $block
              $codeScratcher.attr("data-scratcher-id", COUNTER);
              code.attr("data-scratcher-id", COUNTER);

              var parent;
              if(typeof (code.parents('div.answer')[0]) !== 'undefined'){
                parent = code.parents('div.answer')[0];
              } else {
                if(typeof (code.parents('div.question')[0]) !== 'undefined'){
                  parent = code.parents('div.question')[0];
                } else {
                  parent = null;
                }
              }


              var identity;
              if(parent != null){
                var $parent = $(parent);
                var answerIdAttr   = $parent.attr('data-answerid');
                var questionIdAttr = $parent.attr('data-questionid');

                identity = answerIdAttr || questionIdAttr;

              }

              if(typeof (identity) === 'undefined'){
                identity = COUNTER;
              }


              code.attr("data-identity", identity);
              alterPretags(code);
              COUNTER++;


              $('body').append($codeScratcher);
              $codeScratcher.hide();

              wireMouseEvents(code, $codeScratcher);
              wireTooltip($codeScratcher);
              wireClick($codeScratcher);

            }
          }
        });

      });
    });

})(window.jQuery);