"use strict";

function build_fancybox_options(in_options) {
  return $.extend({
    padding: 0,
    autoHeight: true,
    afterLoad: function() {
      var $wrap = this.wrap;
      $wrap.addClass('fancybox-dpopup');
    },
    afterShow: function() {
      var $wrap = this.wrap;
      if ($(window).scrollLeft() > $wrap.offset().left) {
        $('html, body').animate({
          scrollLeft: $wrap.offset().left
        });
      }

      var validator = $wrap.find('.js-validate').validate();
      if (validator != undefined) {
        validator.resetForm();
      }
    }, openSpeed: 0
  }, in_options);
}

$(function() {
  /*
   * test for font-size: 0 bug
   */
  Modernizr.testStyles('', function(elem) {
    var $elem = $(elem);

    $('<div class="modr"><div class="modr__child1"></div>  \n  <div class="modr__child2"></div></div>').appendTo($elem);
    $('<style>' +
      '.modr { font-size: 0; width: 100px; text-align: left } .modr__child1, .modr__child2 { display: inline-block; width: 20px; height: 20px; }' +
    '</style>').appendTo($elem);

    var $child1 = $elem.find('.modr__child1'),
        $child2 = $elem.find('.modr__child2');

    var x1 = $child1.offset().left + $child1.width(),
        x2 = $child2.offset().left;

    var uc_mobile = navigator.userAgent.indexOf('UCBrowser') >= 0 && navigator.userAgent.indexOf('Mobile') >= 0;

    Modernizr.addTest('zerofontsize', x1 == x2 && !uc_mobile);
  });

  /*
   * Input blocks
   */

  // compensate unsupported pointer-events: none on ib__placeholder
  $('.ib__placeholder').click(function(e) {
    $(this).closest('.ib').find('.ib__input').focus();
    e.preventDefault();
  });

  $('.ib__input').blur(function() {
    var $this = $(this);

    function mark_dirty() {
      $this.toggleClass('ib__input--dirty', $this.val() !== '');
    }

    mark_dirty();

    setTimeout(function() {
      mark_dirty();
    }); // для совместимости с maskedinput
  });

  /*
   * Вкладки
   */

  $('.tabs').tabs();

  /*
   * Ввод телефона
   */

  $('input[type=tel]').mask('+7 (999) 99-99-999', {
    autoclear: false
  });

  /*
   * Rating control
   */

  $('.rate__control').each(function () {
    var $this = $(this);

    $this.raty({
      starType: 'i',
      score: $this.data('rate'),
      readOnly: $this.data('readonly') !== undefined,
      scoreName: $this.data('input-name') || 'rating',
      hints: ['1', '2', '3', '4', '5']
    });
  });

  /*
   * Всплывающие окна
   */

  if ($.fn.fancybox) {
    if (location.hash != undefined && location.hash.length > 1 && location.hash[0] == '#') {
      var loc_hash = location.hash;
      var $popup = $(loc_hash);
      if ($popup.length > 0 && $popup.hasClass('popup') && $popup.data('allow-auto-open') != undefined) {
        $.fancybox.open(build_fancybox_options({
          type: 'inline',
          href: loc_hash
        }));
      }
    }

    $('.js-popup').fancybox(build_fancybox_options({
      type: 'inline'
    }));

    $(window).on('resize', function() {
      $.fancybox.update();
    });

    $('.js-fancybox').fancybox({
      padding: 0
    });
  }

  /*
   * Стилизация выпадающих списков
   */

  $('.select-control').styler();

  /*
   * Валидация форм
   */

  validation_scripts();

  /*
   * Плавная прокрутка
   */

  $('.js-scroll').click(function() {
    if (location.pathname.replace(/^\//,'') == this.pathname.replace(/^\//,'') && location.hostname == this.hostname) {
      var target = $(this.hash);
      target = target.length ? target : $('[name=' + this.hash.slice(1) +']');
      if (target.length) {
        $('html,body').animate({
          scrollTop: target.offset().top
        }, 1000);
        return false;
      }
    }
  });
});

(function($) {
  $.fn.tabs = function(arg) {
    var $this = this,
        $labels,
        $tabs,
        tabs_map = [];

    function reinit() {
      // collect all labels and tabs from our widget
      $labels = $this.find(options.label_selector),
      $tabs = $this.find(options.tab_selector);

      // if labels and tabs count does not match, warn about this
      if ($labels.length != $tabs.length) {
        console.warn('tabs plugin: tab count does not match labels count');
      }

      // now we will build tabs map
      tabs_map = [];

      // iterate over labels and push them into map
      $labels.each(function() {
        tabs_map.push({
          label: $(this),
          tab: null
        });
      });

      // now iterate over tabs and add them to corresponding item in tabs_map array
      var j = 0;
      $tabs.each(function() {
        if (j < tabs_map.length) {
          tabs_map[j].tab = $(this);
        } else {
          tabs_map.push({
            label: null,
            tab: $(this)
          });
        }
        ++j;
      });

      // remove activation classes from tabs and labels
      $this.find(options.label_selector).removeClass(options.active_label_class);
      $this.find(options.tab_selector).removeClass(options.active_tab_class);

      // and activate default tab
      var tab_to_activate = +$this.data('active-index');
      if (isNaN(tab_to_activate)) {
        tab_to_activate = 0;
      }

      activate_tab(tab_to_activate);
    }

    function activate_tab(index) {
      if (index >= 0 && index < tabs_map.length && tabs_map[index].tab != undefined) {
        // remove active classes from label and tab
        $this.find(options.tab_selector).removeClass(options.active_tab_class);
        $this.find(options.label_selector).removeClass(options.active_label_class);

        // and add active class to another label
        tabs_map[index].tab.addClass(options.active_tab_class);
        if (tabs_map[index].label !== undefined) {
          tabs_map[index].label.addClass(options.active_label_class);
        }
      }
    }

    if (this.length == 0) {
      return;
    } else if (this.length > 1) {
      return this.each(function() {
        $(this).tabs();
      });
    }

    if (typeof arg == 'string') {
      // this is method
      if (arg == 'reinit') {
        reinit();
      }
      return this;
    }

    var options = $.extend({
      labels_selector: '.tabs__labels',
      label_selector: '.tabs__label',
      tab_selector: '.tabs__tab',
      active_label_class: 'tabs__label--active',
      active_tab_class: 'tabs__tab--active'
    }, arg);

    reinit();

    this.on('touch click', options.label_selector, function(e) {
      var $label = $(this);

      // iterate over tabs_map array and find item where this label is
      for (var j = 0; j < tabs_map.length; ++j) {
        if (tabs_map[j].label !== undefined && tabs_map[j].label[0] == $label[0]) {
          activate_tab(j);
          break;
        }
      }

      e.preventDefault();
    });

    return this;
  }
}(jQuery));

function validation_scripts() {
  $.validator.addMethod("requiredphone", function (value, element) {
    return value.replace(/\D+/g, '').length > 1;
  }, "Заполните это поле");

  $.validator.addMethod("minlenghtphone", function (value, element) {
    return value.replace(/\D+/g, '').length > 10;
  }, "Неверный формат номера");

  function build_validate_options(in_options) {
    return $.extend({
      onfocusout: false,
      onsubmit: true,
      rules: {
        tel: {
          requiredphone: true,
          minlenghtphone: true
        }
      },
      errorElement: 'span',
      errorClass: 'ib__error',
      errorPlacement: function($error_element, $target) {
        var $ib = $target.closest('.ib');

        $error_element.attr('title', $error_element.text());

        $target.attr('title', $error_element.text());

        if ($ib.find('.ib__wrapper').length) {
          $ib.find('.ib__wrapper').append($error_element);
        } else {
          $ib.append($error_element);
        }
      }, highlight: function(element, error_class, valid_class) {
        $(element).closest('.ib').addClass('ib--error');
      }, unhighlight: function(element, error_class, valid_class) {
        $(element).closest('.ib').removeClass('ib--error');
        $(element).removeAttr('title');
      }, invalidHandler: function() {
        console.log('invalidation handler');
        setTimeout(function() {
          $('.select-control').trigger('refresh');
        }, 1);
      }
    }, in_options);
  }

  $('.js-validate').each(function() {
    $(this).validate(build_validate_options({

    }));
  });
}