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

const STYLES_INPUT = 'src/styles';
const STYLES_OUTPUT = 'dist/css';

const POSTCSS_PREPROCESSORS = [
  require('autoprefixer')({
    browsers: ['last 3 versions', '> 1%', 'ie >= 11'],
    remove: false
  }),
  require('postcss-discard-comments')
];

gulp.task('styles', () => {
  live_update(gulp.src(path.join(STYLES_INPUT, '*.scss'))
                  .pipe(sass().on('error', sass.logError))
                  .pipe(postcss(POSTCSS_PREPROCESSORS))
                  .pipe(gulp.dest(STYLES_OUTPUT)));
});

gulp.task('raw_styles', () => {
  live_update(gulp.src(path.join(STYLES_INPUT, '*.css'))
                            .pipe(postcss(POSTCSS_PREPROCESSORS))
                            .pipe(gulp.dest(STYLES_OUTPUT)));
});

gulp.task('all_styles', () => {
  gulp.start('styles', 'raw_styles');
});

/************************************************************
 * Scripts
 ************************************************************/

const SCRIPTS_INPUT = 'src/scripts';
const THIRDPARTY_SCRIPTS_INPUT = path.join(SCRIPTS_INPUT, '3rdparty');
const SCRIPTS_OUTPUT = 'dist/js';

const ENTRY_SCRIPTS = [
  'index.ts'
];

function generateWebpackConfig(input) {
  let outputFilename = input.replace(/.tsx?$/, '.js');

  let plugins = [ ];

  if (!debugBuild) {
    plugins.push(new webpack_uglify_plugin());
  }

  return {
    entry: path.join(__dirname, SCRIPTS_INPUT, input),
    output: {
      filename: outputFilename,
      path: path.join(__dirname, SCRIPTS_OUTPUT),
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
  for (let inputFile of ENTRY_SCRIPTS) {
    gulp.src(path.join(SCRIPTS_INPUT, inputFile))
      .pipe(named())
      .pipe(webpack_stream(generateWebpackConfig(inputFile)))
      .pipe(gulp.dest(SCRIPTS_OUTPUT))
  }
});

gulp.task('scripts_3rd', () => {
  gulp.src(path.join(THIRDPARTY_SCRIPTS_INPUT, '*.js'))
      .pipe(gulp.dest(SCRIPTS_OUTPUT));
});

gulp.task('all_scripts', () => {
  gulp.start('scripts', 'scripts_3rd');
});

/************************************************************
 * HTML
 ************************************************************/

const HTML_INPUT = 'src/html';
const HTML_OUTPUT = 'dist';

gulp.task('html', ['all_svg_sprites'], () => {
  live_update(gulp.src(path.join(HTML_INPUT, '*.hbs'))
    .pipe(gdata(file => {
      let data_file = path.join(HTML_INPUT, 'data', path.basename(file.path, '.hbs') + '.json');
      return fs.existsSync(data_file) ? require(path.join(__dirname, data_file)) : { };
    }))
    .pipe(handlebars({
      partials: path.join(HTML_INPUT, 'partials/*.hbs'),
      helpers: path.join(HTML_INPUT, 'helpers/*.js'),
      data: path.join(HTML_INPUT, 'data/common/*.json'),
      bustCache: true,
      debug: debugBuild
    }).helpers(require('handlebars-inline-file'))
      .helpers(require('handlebars-layouts'))
      .on('error', (err) => console.error(err)))
    .pipe(ext_replace('.html'))
    .pipe(gulp.dest(HTML_OUTPUT)));
});

gulp.task('all_html', () => {
  gulp.start('html');
});

/************************************************************
 * Images
 ************************************************************/

const IMAGES_INPUT = 'src/img';
const IMAGES_OUTPUT = 'dist/img';
const IMAGE_DIRS = getDirs(IMAGES_INPUT);
const SVG_SPRITES_INPUT = 'src/svg';
const SVG_SPRITE_OUTPUT = 'dist/img/svg-sprites';
const SVG_SPRITES = getDirs(SVG_SPRITES_INPUT);
const IMAGE_COPY_DELAY = 500;

const IMAGEMIN_OPTIONS = {
  progressive: true,
  multipass: true
};

function createImageTask(taskName, dir) {
  let outputDir = path.join(IMAGES_OUTPUT, dir);

  return gulp.task(taskName, () => {
    live_update(gulp.src(path.join(IMAGES_INPUT, dir, '*.*'))
      .pipe(newer(outputDir))
      .pipe(wait(IMAGE_COPY_DELAY))
      .pipe(imagemin(IMAGEMIN_OPTIONS))
      .pipe(gulp.dest(outputDir)));
  });
}

createImageTask('images', '');
IMAGE_DIRS.map(dir => createImageTask(`images_${dir}`, dir));

function createSvgTask(taskName, dir) {
  return gulp.task(taskName, () => {
    live_update(gulp.src(path.join(SVG_SPRITES_INPUT, dir, '*.svg'))
      .pipe(svgSprites({
        mode: 'symbols',
        preview: false,
        svgId: 'i-%f',
        svg: {
          symbols: 'symbols.svg',
          defs: 'defs.svg'
        }
      }))
      .pipe(gulp.dest(path.join(SVG_SPRITE_OUTPUT, dir))));
  });
}

SVG_SPRITES.map(dir => createSvgTask(`svg_sprite_${dir}`, dir));

gulp.task('all_svg_sprites', () => {
  gulp.start(...SVG_SPRITES.map(dir => `svg_sprite_${dir}`));
});

gulp.task('all_images', () => {
  gulp.start('images', 'all_svg_sprites', ...IMAGE_DIRS.map(dir => `images_${dir}`));
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

  browser_sync.init({
    server: {
      baseDir: './dist'
    },
    open: false
  });

  watch(path.join(IMAGES_OUTPUT, '*.*'), () => gulp.start('images'));
  for (let dir of IMAGE_DIRS) {
    let taskName = `images_${dir}`;
    watch(path.join(IMAGES_INPUT, dir, '*.*'), () => gulp.start(taskName));
  }
  watch(path.join(SVG_SPRITES_INPUT, '*.svg'), () => gulp.start('all_svg_sprites'));

  watch(path.join(STYLES_INPUT, '**'), () => gulp.start('styles', 'raw_styles'));
  watch(path.join(SCRIPTS_INPUT, '**'), () => gulp.start('scripts', 'scripts_3rd'));
  watch(path.join(HTML_INPUT, '**'), () => gulp.start('html'));

  browser_sync.reload();
});
