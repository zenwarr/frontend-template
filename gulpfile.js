"use strict";

var gulp = require('gulp');
var stylus = require('gulp-stylus');
var autoprefixer = require('gulp-autoprefixer');
var spritesmith = require('gulp.spritesmith');
var plumber = require('gulp-plumber');
var newer = require('gulp-newer');
var preprocess = require('gulp-preprocess');
var uglify = require('gulp-uglify');
var wait = require('gulp-wait');
var addsrc = require('gulp-add-src');
var ignore = require('gulp-ignore');
var browser_sync = require('browser-sync');
var watch = require('gulp-watch');
var imagemin = require('gulp-imagemin');
var postcss = require('gulp-postcss');

/************************************************************
 * Options
 ************************************************************/

// Options for styles

var styles_input = 'src/styles';
var styles_output = 'css';

var autoprefixer_options = {
  browsers: ['last 3 versions', '> 1%', 'Safari >= 5', 'ie >= 8'],
  remove: false
};

var postcss_processors = [
  require('postcss-color-rgba-fallback')
];

// Options for scripts

var scripts_input = 'src/scripts';
var scripts_output = 'js';
var concat_3dparty_scripts = false;
var concat_output_file = '3rdparty.min.js';

var uglify_options = {
  preserveComments: 'some' /* preserves comments starting with ! or @preserve directive */
};

if (concat_3dparty_scripts) {
  var concat = require('gulp-concat');
  var order = require('gulp-order');
}

// Options for images

var image_copy_delay = 500;

var images_input = 'src/img';
var images_output = 'img';
var image_dirs = ['content', 'demo', 'fancybox'];

var imagemin_options = {
  progressive: true,
  multipass: true
};

// Options for sprites

var sprites = [{
    name: 'sprite'
  }];

// Options for html

var html_input = 'src/html';

/************************************************************
 * Styles
 ************************************************************/

gulp.task('stylus', function() {
  var stream = gulp.src(styles_input + '/*.styl')
      .pipe(plumber())
      .pipe(stylus({
              define: {

              },
              url: 'embedurl'
            }))
      .pipe(autoprefixer(autoprefixer_options))
      .pipe(postcss(postcss_processors))
      .pipe(gulp.dest(styles_output));
});

gulp.task('raw_css', function() {
  var stream = gulp.src(styles_input + '/*.css')
      .pipe(plumber())
      .pipe(autoprefixer(autoprefixer_options))
      .pipe(gulp.dest(styles_output));
});

/************************************************************
 * Scripts
 ************************************************************/

gulp.task('js', function() {
  var stream = gulp.src(scripts_input + '/*.*')
      .pipe(plumber())
      .pipe(newer(scripts_output))
      .pipe(gulp.dest(scripts_output));

  var thirdparty_stream = gulp.src([scripts_input + '/3rdparty/*.*']);

  if (concat_3dparty_scripts) {
    thirdparty_stream = thirdparty_stream
                .pipe(plumber())
                .pipe(newer(scripts_output + '/' + concat_output_file))
                .pipe(order([
                  'jquery.min.js',
                  'jquery.js',
                  '*.*'
                  ]))
                .pipe(uglify(uglify_options))
                .pipe(concat(concat_output_file))
                .pipe(gulp.dest(scripts_output));
  } else {
    thirdparty_stream = thirdparty_stream
                        //.pipe(uglify(uglify_options))
                        .pipe(gulp.dest(scripts_output));
  }
});

/************************************************************
 * HTML
 ************************************************************/

gulp.task('html', function() {
  var stream = gulp.src(html_input + '/*.html')
      .pipe(plumber())
      .pipe(preprocess())
      .pipe(gulp.dest('.'));
});

gulp.task('html_partial', function() {
  var partial_stream = gulp.src(html_input + '/partial/*.html')
      .pipe(plumber())
      .pipe(ignore.exclude(true))
      .pipe(addsrc(html_input + '/*.html'))
      .pipe(preprocess())
      .pipe(gulp.dest('.'));
});

/************************************************************
 * Images
 ************************************************************/

gulp.task('images', function() {
  gulp.src(images_input + '/*.*')
      .pipe(plumber())
      .pipe(newer(images_output))
      .pipe(wait(image_copy_delay))
      .pipe(imagemin(imagemin_options))
      .pipe(gulp.dest(images_output));
});

for (var j = 0; j < image_dirs.length; ++j) {
  (function() {
    var local_j = j;
    gulp.task('images-' + image_dirs[j], function() {
      var input_dir = images_input + '/' + image_dirs[local_j];
      var output_dir = images_output + '/' + image_dirs[local_j];

      gulp.src(input_dir + '/*.*')
          .pipe(plumber())
          .pipe(newer(output_dir))
          .pipe(wait(image_copy_delay))
          .pipe(imagemin(imagemin_options))
          .pipe(gulp.dest(output_dir));
    });
  })();
}

gulp.task('all-images', function() {
  gulp.start('images');
  for (var j = 0; j < image_dirs.length; ++j) {
    gulp.start('images-' + image_dirs[j]);
  }
});

/************************************************************
 * Sprites
 ************************************************************/

for (var j = 0; j < sprites.length; ++j) {
  (function() {
    var local_j = j;
    gulp.task('sprite-' + sprites[j].name, function() {
      var spr_data = sprites[local_j];
      var stream = gulp.src(images_input + '/' + spr_data.name + '/*.png')
          .pipe(plumber())
          .pipe(spritesmith({
            imgName: spr_data.name + '.png',
            cssName: 'sprites/' + spr_data.name + '.styl',
            algorithm: 'binary-tree',
            padding: 4,
            imgPath: '../img/sprites/' + spr_data.name + '.png',
            cssVarMap: function(sprite) {
              sprite.name = 'icon_' + sprite.name;
              if (spr_data.css_postfix != undefined)
                sprite.name = sprite.name + spr_data.css_postfix;
            }
          }));

      stream.img.pipe(gulp.dest(images_output + '/sprites'));
      stream.css.pipe(gulp.dest(styles_input));
    });
  })();
}

gulp.task('all-sprites', function() {
  for (var j = 0; j < sprites.length; ++j) {
    gulp.start('sprite-' + sprites[j].name);
  }
});

/************************************************************
 * Tasks
 ************************************************************/

gulp.task('watch', function() {
  browser_sync.init({
    server: {
      baseDir: './'
    },
    files: ['*.html', 'css/*.css', 'js/*.js', 'fonts/*.*', 'img/**/*.*'],
    open: false
  });

  watch(images_input + '/*.*', function() {
    gulp.start('images');
  });

  for (var j = 0; j < image_dirs.length; ++j) {
    (function() {
      var image_dir = image_dirs[j];
      watch(images_input + '/' + image_dir + '/*.*', function() {
        gulp.start('images-' + image_dir);
      });
    })();
  }

  for (var j = 0; j < sprites.length; ++j) {
    (function() {
      var sprite_name = sprites[j].name;
      watch(images_input + '/' + sprite_name + '/*.png', function() {
        gulp.start('sprite-' + sprite_name);
      });
    })();
  }

  watch(styles_input + '/**', function() {
    gulp.start('stylus', 'raw_css');
  });

  watch(scripts_input + '/**', function() {
    gulp.start('js');
  });

  watch(html_input + '/*.html', function() {
    gulp.start('html');
  });

  watch(html_input + '/partial/*.html', function() {
    gulp.start('html_partial');
  });
});

gulp.task('default', function() {
  gulp.start('html', 'all-sprites', 'all-images', 'stylus', 'raw_css', 'js', 'watch');
});

gulp.task('build', function() {
  gulp.start('html', 'all-sprites', 'all-images', 'stylus', 'raw_css', 'js');
});
