"use strict";

const path = require('path');
const fs = require('fs');
const gulp = require('gulp');
const gdata = require('gulp-data');
const ext_replace = require('gulp-ext-replace');
const postcss = require('gulp-postcss');
const handlebars = require('gulp-hb');
const sass = require('gulp-sass');
const watch = require('gulp-watch');
const webpack_stream = require('webpack-stream');
const webpack = require('webpack');
const webpack_uglify_plugin = require('uglifyjs-webpack-plugin');
const named = require('vinyl-named');
const wait = require('gulp-wait');
const newer = require('gulp-newer');
const imagemin = require('gulp-imagemin');
const svgSprites = require('gulp-svg-sprites');

/************************************************************
 * Options
 ************************************************************/

let debugBuild = true;
let watching = false;

function getDirs(baseDir) {
  return fs.readdirSync(baseDir).filter(filename => fs.statSync(path.join(baseDir, filename)).isDirectory());
}

const config = require('./project-config.json');

/************************************************************
 * Live updating
 ************************************************************/

function live_update(stream) {
  stream.on('end', browser_sync.reload);
}

const browser_sync = require('browser-sync').create();

/************************************************************
 * Styles
 ************************************************************/

const postcssConfig = [ ];
for (let key of Object.keys(config.POSTCSS)) {
  let plugin = require(key);
  if (config.POSTCSS[key] != null) {
    postcssConfig.push(plugin(config.POSTCSS[key]));
  } else {
    postcssConfig.push(plugin);
  }
}

gulp.task('styles', () => {
  live_update(gulp.src(path.join(config.STYLES_INPUT, '*.scss'))
                  .pipe(sass().on('error', sass.logError))
                  .pipe(postcss(postcssConfig))
                  .pipe(gulp.dest(config.STYLES_OUTPUT)));
});

gulp.task('raw_styles', () => {
  live_update(gulp.src(path.join(config.STYLES_INPUT, '*.css'))
                            .pipe(postcss(postcssConfig))
                            .pipe(gulp.dest(config.STYLES_OUTPUT)));
});

gulp.task('all_styles', () => {
  gulp.start('styles', 'raw_styles');
});

/************************************************************
 * Scripts
 ************************************************************/

function generateWebpackConfig(input) {
  let outputFilename = input.replace(/.tsx?$/, '.js');

  let plugins = [ ];

  if (!debugBuild) {
    plugins.push(new webpack_uglify_plugin());
  }

  return {
    entry: path.join(__dirname, config.SCRIPTS_INPUT, input),
    output: {
      filename: outputFilename,
      path: path.join(__dirname, config.SCRIPTS_OUTPUT),
      libraryTarget: 'var'
    },
    devtool: debugBuild ? 'source-map' : undefined,
    target: 'web',
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.json', '.webpack.js']
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: 'ts-loader'
        }
      ]
    },
    watch: watching,
    watchOptions: {
      ignored: /node_modules/,
      aggregateTimeout: 750
    },
    plugins
  }
}

gulp.task('scripts', () => {
  for (let inputFile of config.ENTRY_SCRIPTS) {
    gulp.src(path.join(config.SCRIPTS_INPUT, inputFile))
      .pipe(named())
      .pipe(webpack_stream(generateWebpackConfig(inputFile)))
      .pipe(gulp.dest(config.SCRIPTS_OUTPUT))
  }
});

gulp.task('scripts_3rd', () => {
  gulp.src(path.join(config.THIRD_PARTY_SCRIPTS_INPUT, '*.js'))
      .pipe(gulp.dest(config.SCRIPTS_OUTPUT));
});

gulp.task('all_scripts', () => {
  gulp.start('scripts', 'scripts_3rd');
});

/************************************************************
 * HTML
 ************************************************************/

gulp.task('html', ['all_svg_sprites'], () => {
  live_update(gulp.src(path.join(config.HTML_INPUT, '*.hbs'))
    .pipe(gdata(file => {
      let data_file = path.join(config.HANDLEBARS_DATA, path.basename(file.path, '.hbs') + '.json');
      try {
        fs.accessSync(data_file);
      } catch (err) {
        console.error(`Failed to load data file ${data_file}`);
        return;
      }

      let file_contents = fs.readFileSync(path.join(__dirname, data_file), 'utf-8');
      try {
        return JSON.parse(file_contents);
      } catch (err) {
        console.error(`Failed to load data file ${data_file}, JSON is malformed`)
      }
    }))
    .pipe(handlebars({
      partials: path.join(config.HANDLEBARS_PARTIALS),
      helpers: path.join(config.HANDLEBARS_HELPERS),
      data: path.join(config.HANDLEBARS_COMMON_DATA),
      bustCache: true,
      debug: config.DEBUG_CONFIG
    }).helpers(require('handlebars-inline-file'))
      .helpers(require('handlebars-layouts'))
      .on('error', (err) => console.error(err)))
    .pipe(ext_replace('.html'))
    .pipe(gulp.dest(config.HTML_OUTPUT)));
});

gulp.task('all_html', () => {
  gulp.start('html');
});

/************************************************************
 * Images
 ************************************************************/

const imageDirs = getDirs(config.IMAGES_INPUT);
const SVG_SPRITES = getDirs(config.SVG_SPRITES_INPUT);

function createImageTask(taskName, dir) {
  let outputDir = path.join(config.IMAGES_OUTPUT, dir);

  return gulp.task(taskName, () => {
    live_update(gulp.src(path.join(config.IMAGES_INPUT, dir, '*.*'))
      .pipe(newer(outputDir))
      .pipe(wait(config.IMAGE_COPY_DELAY))
      .pipe(imagemin(config.IMAGEMIN_OPTIONS))
      .pipe(gulp.dest(outputDir)));
  });
}

createImageTask('images', '');
imageDirs.map(dir => createImageTask(`images_${dir}`, dir));

function createSvgTask(taskName, dir) {
  return gulp.task(taskName, () => {
    live_update(gulp.src(path.join(config.SVG_SPRITES_INPUT, dir, '*.svg'))
      .pipe(svgSprites(config.SVG_SPRITES_OPTIONS))
      .pipe(gulp.dest(path.join(config.SVG_SPRITES_OUTPUT, dir))));
  });
}

SVG_SPRITES.map(dir => createSvgTask(`svg_sprite_${dir}`, dir));

gulp.task('all_svg_sprites', () => {
  gulp.start(...SVG_SPRITES.map(dir => `svg_sprite_${dir}`));
});

gulp.task('all_images', () => {
  gulp.start('images', 'all_svg_sprites', ...imageDirs.map(dir => `images_${dir}`));
});

/************************************************************
 * Tasks
 ************************************************************/

gulp.task('all', () => {
  gulp.start('all_images', 'all_styles', 'all_scripts', 'all_html');
});

gulp.task('default', () => {
  debugBuild = false;
  gulp.start('all');
});

gulp.task('build-dev', () => {
  debugBuild = true;
  gulp.start('all');
});

gulp.task('watch', () => {
  watching = true;

  gulp.start('all');

  browser_sync.init(config.BROWSER_SYNC_OPTIONS);

  watch(path.join(config.IMAGES_INPUT, '*.*'), () => gulp.start('images'));
  for (let dir of imageDirs) {
    let taskName = `images_${dir}`;
    watch(path.join(config.IMAGES_INPUT, dir, '*.*'), () => gulp.start(taskName));
  }
  watch(path.join(config.SVG_SPRITES_INPUT, '*.svg'), () => gulp.start('all_svg_sprites'));

  watch(path.join(config.STYLES_INPUT, '**'), () => gulp.start('styles', 'raw_styles'));
  watch(path.join(config.SCRIPTS_INPUT, '**'), () => gulp.start('scripts', 'scripts_3rd'));
  watch(path.join(config.HTML_INPUT, '**'), () => gulp.start('html'));

  browser_sync.reload();
});
