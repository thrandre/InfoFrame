var gulp = require("gulp");
var source = require("vinyl-source-stream");
var browserify = require("browserify");
var watchify = require("watchify");
var reactify = require("reactify");
var path = require("path");
var less = require("gulp-less");
var transformTools = require("browserify-transform-tools");
var tsify = require("tsify");
var rename = require("gulp-rename");
var jsx = require("react-jsx-anywhere/gulp");

var build = function (b, src, dst) {
	b.bundle()
		.pipe(source(src))
		.pipe(rename(dst))
		.pipe(gulp.dest("./build"));

	return b;
};

gulp.task("browserify", ["jsx"], function () {
	var b = browserify({debug: true, extensions: [".jsx"]});
	
	b.on('error', function(err){
      console.log(err.message);
      this.emit('end');
    });
	
	b.on("update", function () {
		build(b, "./App.ts", "App.js");
	});
	
	b.transform(reactify);
	
	b = watchify(b);

	b.add("./App.ts");
	
	b.plugin("tsify", { target: "ES5" });

	build(b, "./App.ts", "App.js");
});

gulp.task("jsx", function() {
	return gulp.src("**/*.react.ts")
		.pipe(jsx())
		.pipe(rename(function(p) {
			return p.basename = p.basename.replace(".react", "");
		}))
		.pipe(gulp.dest("./"));
});

/*global __dirname*/
gulp.task("less", function () {
	return gulp.src("styles/*.less")
		.pipe(less({
			paths: [ path.join(__dirname, 'less', 'includes') ]
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
	gulp.watch("**/*.react.ts", ["jsx"]);
	gulp.watch("styles/**/*", ["less"]);
});

gulp.task("default", ["jsx", "browserify", "less", "fonts", "watch"]);