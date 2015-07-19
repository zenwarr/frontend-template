$(function() {
  ie8_selectors();

  $('input, textarea').blur(function() {
    $(this).toggleClass('dirty', $(this).val() !== '');
  });

  $('input[type=tel]').mask('+7 (999) 99-99-999', {
    autoclear: false
  });

  $('.rate-control').each(function() {
    var $this = $(this);
    $this.raty({
      starType: 'i',
      score: function() {
        return $(this).attr('data-rate');
      }, readOnly: function() {
        return $(this).attr('data-readonly') != undefined;
      }, scoreName: $this.data('name')
    })
  });

  $('.do-popup').fancybox({
    type: 'inline',
    padding: 0,
    afterLoad: function() {
      this.wrap.addClass('fancybox-dpopup');
    },
  });

  $('.js-fancybox').fancybox();

  $('.form-select').styler();
});

function ie8_selectors() {
  if ((document.documentMode || 100) < 9) {

  }
}

