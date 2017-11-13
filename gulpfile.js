"use strict";

const path = require('path');
const gulp = require('gulp');
const postcss = require('gulp-postcss');
const pug = require('gulp-pug');
const beautify = require('gulp-jsbeautifier');
const browserify = require('browserify');
const tsify = require('tsify');
const source = require('vinyl-source-stream');
const sass = require('gulp-sass');
const watch = require('gulp-watch');
const buffer = require('vinyl-buffer');
const sourcemaps = require('gulp-sourcemaps');

/************************************************************
 * Options
 ************************************************************/

const browser_sync = require('browser-sync').create();

const DEBUG_BUILD = true;

const IMAGES_INPUT = 'src/img';
const IMAGES_OUTPUT = 'dist/img';
const IMAGE_DIRS = [
    'content', 'demo', 'tmp'
];

const IMAGEMIN_OPTIONS = {
  progressive: true,
  multipass: true
};

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

/************************************************************
 * Scripts
 ************************************************************/

const SCRIPTS_INPUT = 'src/scripts';
const THIRDPARTY_SCRIPTS_INPUT = path.join(SCRIPTS_INPUT, '3rdparty');
const SCRIPTS_OUTPUT = 'dist/js';

gulp.task('scripts', () => {
  return browserify({
    basedir: '.',
    debug: DEBUG_BUILD,
    entries: ['src/scripts/index.ts'],
    cache: { },
    packageCache: { }
  }).plugin(tsify)
    .on('error', (err) => console.error('JS: ', err))
    .bundle()
    .pipe(source('index.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(sourcemaps.write({
      includeContent: false,
      sourceRoot: file => {
        return path.join(__dirname, 'src/scripts')
      }
    }))
    .pipe(gulp.dest(SCRIPTS_OUTPUT));
});

gulp.task('scripts_3rd', () => {
  gulp.src(path.join(THIRDPARTY_SCRIPTS_INPUT, '*.js'))
      .pipe(gulp.dest(SCRIPTS_OUTPUT));
});

/************************************************************
 * HTML
 ************************************************************/

const HTML_INPUT = 'src/html';
const HTML_OUTPUT = 'dist';
const HTML_BEAUTIFY_OPTIONS = {
  indent_size: 2,
  indent_char: ' ',
  end_with_newline: true,
  wrap_line_length: 60,
  unformatted: []
};

gulp.task('html', () => {
  live_update(gulp.src(path.join(HTML_INPUT, '*.pug'))
                  .pipe(pug().on('error', err => console.error('PUG: ', err.message)))
                  .pipe(beautify(HTML_BEAUTIFY_OPTIONS))
                  .pipe(gulp.dest(HTML_OUTPUT)));
});

function live_update(stream) {
  stream.on('end', browser_sync.reload);
}

/************************************************************
 * Tasks
 ************************************************************/

gulp.task('default', () => {
  gulp.start('styles', 'scripts', 'scripts_3rd', 'html');
});

gulp.task('watch', () => {
  browser_sync.init({
    server: {
      baseDir: './dist'
    },
    open: false
  });

  // watch(path.join(IMAGES_OUTPUT, '*.*'), () => gulp.start('images'));
  // for (let j = 0; j < IMAGE_DIRS.length; ++j) {
  //   (image_dir =>
  //     watch(path.join(IMAGES_INPUT, image_dir, '*.*'), () => gulp.start('images-' + image_dir))
  //   )(IMAGE_DIRS[j]);
  // }

  watch(path.join(STYLES_INPUT, '**'), () => gulp.start('styles', 'raw_styles'));
  watch(path.join(SCRIPTS_INPUT, '**'), () => gulp.start('scripts', 'scripts_3rd'));
  watch(path.join(HTML_INPUT, '**'), () => gulp.start('html'));
});
