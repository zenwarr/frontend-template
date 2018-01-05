'use strict';

module.exports.register = Handlebars => {
  const makeUseTag = icon => {
    icon = Handlebars.escapeExpression(icon);
    if (!icon.startsWith('#')) {
      icon = '#' + icon;
    }
    return `<use xlink:href="${icon}"></use>`;
  };

  Handlebars.registerHelper({
    'use-icon': icon => {
      return new Handlebars.SafeString(makeUseTag(icon));
    },
    'icon': (icon, classes) => {
      let html;
      if (classes && typeof classes === 'string') {
        html = `<svg class="${classes}">${makeUseTag(icon)}</svg>`;
      } else {
        html = `<svg>${makeUseTag(icon)}</svg>`;
      }
      return new Handlebars.SafeString(html);
    },
    'use-svg-sprite': sprite => {
      let compiled = Handlebars.compile(`{{{inline "dist/img/svg-sprites/${sprite}/symbols.svg"}}}`);
      return new Handlebars.SafeString(compiled({}));
    }
  });
};
