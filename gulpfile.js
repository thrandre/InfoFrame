'use strict';

// Include gulp
var gulp = require('gulp');

// Include Our Plugins
var express = require('express');
var ts = require('gulp-typescript');
var less = require('gulp-less');
var concat = require('gulp-concat');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var path = require('path');
var debug = require('gulp-debug');

var serverport = 1337;
var server = express();
server.use(express.static('./'));
server.get('/', function(req, res) {
  res.redirect('/');
});

gulp.task('serve', function(cb) {
  server.listen(serverport);
  cb();
});

gulp.task('vendor', function() {
  return gulp.src(['js/vendor/*.js', 'js/*.js'])
    .pipe(concat('vendor.js'))
    .pipe(gulp.dest('dist'));
});

gulp.task('typescript', function() {
  var tsResult = gulp.src('ts/**/*.ts')
    .pipe(ts({
      noExternalResolve: false,
      module: 'commonjs',
      target: 'ES5',
      sortOutput: true
    }));

  return tsResult.js.pipe(concat('app.js')).pipe(gulp.dest('dist'));
});

// Concatenate & Minify JS
gulp.task('concat', ['typescript', 'vendor'], function() {
  return gulp.src(['dist/vendor.js', 'dist/app.js'])
    .pipe(uglify())
    .pipe(concat('app.all.min.js'))
    .pipe(gulp.dest('dist'));
});

// Compile Our Less
gulp.task('less', function() {
  return gulp.src('styles/christmas.less')
    .pipe(less({
      paths: [path.join(__dirname, 'less', 'includes')]
    }))
    .pipe(gulp.dest('dist'));
});

gulp.task('fonts', function() {
  return gulp.src(['styles/font-awesome/fonts/*',
      'styles/weather-icons/fonts/*'
    ])
    .pipe(gulp.dest('dist/fonts'));
});

gulp.task('watch', ['typescript', 'vendor', 'concat', 'less'], function() {
  gulp.watch('ts/**/*.ts', ['typescript', 'concat']);
  gulp.watch('styles/*.less', ['less']);
  gulp.watch('js/**/*.js', ['vendor', 'concat']);
});

// Default Task
gulp.task('default', ['serve', 'typescript', 'vendor', 'concat', 'less',
  'fonts',
  'watch'
]);