'use strict';

const path = require('path');
const fs = require('fs');

const CONFIG_FILENAME = 'project-config.json';

function loadConfig(dir) {
  if (!dir) {
    dir = __dirname;
  }

  try {
    let configFilename = path.join(dir, CONFIG_FILENAME);
    fs.accessSync(configFilename);
    console.log(`Project config file found at ${configFilename}`);
    return require(configFilename);
  } catch (err) {
    let parentDir = path.dirname(dir);
    if (!parentDir || parentDir === dir) {
      throw new Error(`Failed to load config file ${CONFIG_FILENAME}. Ensure the file exists at the root of the project`);
    }
    return loadConfig(parentDir);
  }
}

module.exports.register = Handlebars => {
  let config = loadConfig();

  if (config.SVG_SPRITES_OPTIONS.mode !== 'symbols') {
    throw new Error('Only symbols mode for svg sprites is supported by Handlebars helpers');
  }

  const getSpriteFilename = sprite => {
    return path.join(config.SVG_SPRITES_OUTPUT, sprite,
            (config.SVG_SPRITES_OPTIONS.svg && config.SVG_SPRITES_OPTIONS.svg.symbols) || 'symbols.svg');
  };

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
      let compiled = Handlebars.compile(`{{{inline "${getSpriteFilename(sprite)}"}}}`);
      return new Handlebars.SafeString(compiled({}));
    }
  });
};
