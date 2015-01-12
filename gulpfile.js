var gulp = require("gulp");
var source = require("vinyl-source-stream");
var browserify = require("browserify");
var watchify = require("watchify");
var reactify = require("reactify");
var path = require("path");
var less = require("gulp-less");
var transformTools = require("browserify-transform-tools");

var build = function (b, src) {
	b.bundle()
		.pipe(source(src))
		.pipe(gulp.dest("./build"));

	return b;
};

gulp.task("browserify", function () {
	var b = browserify({debug: true});

	b.transform(reactify);

	b = watchify(b);

	b.add("./App.js");

	b.on("update", function () {
		build(b, "./App.js");
	});

	build(b, "./App.js");
});

/*global __dirname*/
gulp.task("less", function () {
	return gulp.src("styles/style.less")
	  .pipe(less({
		paths: [path.join(__dirname, "less", "includes")]
	  }))
	  .pipe(gulp.dest("./styles"));
});

gulp.task("fonts", function () {
	return gulp.src(["styles/font-awesome/fonts/*",
		"styles/weather-icons/fonts/*"
	])
	  .pipe(gulp.dest("dist/fonts"));
});

gulp.task("watch", function () {
    gulp.watch("styles/**/*", ["less"]);
});

gulp.task("default", ["browserify", "less", "fonts", "watch"]);