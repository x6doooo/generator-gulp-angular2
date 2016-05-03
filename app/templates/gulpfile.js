'use strict';

var gulp = require('gulp');
var bump = require('gulp-bump');
var concat = require('gulp-concat');
var filter = require('gulp-filter');
var inject = require('gulp-inject');
var rename = require('gulp-rename');
var flatten = require('gulp-flatten');
var cleanCSS = require('gulp-clean-css');
var minifyHTML = require('gulp-minify-html');
var plumber = require('gulp-plumber');
var sourcemaps = require('gulp-sourcemaps');
var template = require('gulp-template');
var tsc = require('gulp-typescript');
var uglify = require('gulp-uglify');
var watch = require('gulp-watch');
var insert = require('gulp-insert');

<% if (props.cssPreprocessor.key === 'node-sass') { %>
    var sass = require('gulp-sass');
<% } %>

<% if (props.htmlPreprocessor.key === 'jade') { %>
    var jade = require('gulp-jade');
<% } %>


var Builder = require('systemjs-builder');
var del = require('del');
var fs = require('fs');
var path = require('path');
var join = path.join;
var runSequence = require('run-sequence');
var semver = require('semver');
var series = require('stream-series');

var express = require('express');
var serveStatic = require('serve-static');
var openResource = require('open');

var tinylr = require('tiny-lr')();
var connectLivereload = require('connect-livereload');
var bowerFiles = require('main-bower-files');


// --------------
// Configuration.
var APP_BASE = '/';

var PATH = {
    dest: {
        all: 'dist',
        dev: {
            all: 'dist/dev',
            lib: 'dist/dev/lib',
            vendor: 'dist/dev/vendor',
            ng2: 'dist/dev/lib/angular2.js',
            router: 'dist/dev/lib/router.js'
        },
        prod: {
            all: 'dist/prod',
            lib: 'dist/prod/lib',
            vendor: 'dist/prod/vendor'
        }
    },
    src: {
        // Order is quite important here for the HTML tag injection.
        lib: [
            './node_modules/traceur/bin/traceur-runtime.js',
            './node_modules/es6-module-loader/dist/es6-module-loader-sans-promises.js',
            './node_modules/es6-module-loader/dist/es6-module-loader-sans-promises.js.map',
            './node_modules/reflect-metadata/Reflect.js',
            './node_modules/reflect-metadata/Reflect.js.map',
            './node_modules/systemjs/dist/system.src.js',
            './node_modules/angular2/node_modules/zone.js/dist/zone.js'
        ]
    }
};

var PORT = 5555;
var LIVE_RELOAD_PORT = 4002;

var ng2Builder = new Builder({
    defaultJSExtensions: true,
    paths: {
        'angular2/*': 'node_modules/angular2/es6/dev/*.js',
        rx: 'node_modules/angular2/node_modules/rx/dist/rx.js'
    },
    meta: {
        rx: {
            format: 'cjs'
        }
    }
});

var appProdBuilder = new Builder({
    baseURL: 'file:./tmp',
    meta: {
        'angular2/angular2': {build: false},
        'angular2/router': {build: false}
    }
});

var HTMLMinifierOpts = {conditionals: true};

var tsProject = tsc.createProject('tsconfig.json', {
    typescript: require('typescript')
});

var semverReleases = ['major', 'premajor', 'minor', 'preminor', 'patch',
    'prepatch', 'prerelease'];

// --------------
// Clean.

gulp.task('clean', function (done) {
    del(PATH.dest.all, done);
});

gulp.task('clean.dev', function (done) {
    del(PATH.dest.dev.all, done);
});

gulp.task('clean.app.dev', function (done) {
    // TODO: rework this part.
    del([join(PATH.dest.dev.all, '**/*'), '!' +
    PATH.dest.dev.lib, '!' + join(PATH.dest.dev.lib, '*')], done);
});

gulp.task('clean.prod', function (done) {
    del(PATH.dest.prod.all, done);
});

gulp.task('clean.app.prod', function (done) {
    // TODO: rework this part.
    del([join(PATH.dest.prod.all, '**/*'), '!' +
    PATH.dest.prod.lib, '!' + join(PATH.dest.prod.lib, '*')], done);
});

gulp.task('clean.tmp', function (done) {
    del('tmp', done);
});

// --------------
// Build dev.

gulp.task('build.ng2.dev', function () {
    ng2Builder.build('angular2/router - angular2/angular2', PATH.dest.dev.router, {});
    return ng2Builder.build('angular2/angular2', PATH.dest.dev.ng2, {});
});

gulp.task('build.lib.dev', ['build.ng2.dev'], function () {
    return gulp.src(PATH.src.lib)
        .pipe(gulp.dest(PATH.dest.dev.lib));
});

gulp.task('build.js.dev', function () {
    var result = gulp.src('./app/**/*ts')
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(tsc(tsProject));

    return result.js
        .pipe(sourcemaps.write())
        .pipe(template(templateLocals()))
        .pipe(gulp.dest(PATH.dest.dev.all));
});

<% if (props.htmlPreprocessor.key === 'jade') { %>
gulp.task('build.jade.dev', function() {
    var YOUR_LOCALS = {};
    return gulp.src('./app/**/*.jade')
        .pipe(jade({
            locals: YOUR_LOCALS,
            doctype: 'html' //保证angular2的标记被正常解析
        }))
        .pipe(gulp.dest(PATH.dest.dev.all));
});
<% } %>

gulp.task('build.assets.dev', [
    'build.js.dev'
    <% if (props.htmlPreprocessor.key === 'jade') { %>
    ,'build.jade.dev'
    <% } %>
], function () {

    <% if (props.cssPreprocessor.key === 'node-sass') { %>
        gulp.src(['./app/**/*.sass', './app/**/*.scss'])
            .pipe(sass().on('error', sass.logError))
            .pipe(gulp.dest(PATH.dest.dev.all));

    <% } %>



    return gulp.src(['./app/**/*.html', './app/**/*.css'])
        .pipe(gulp.dest(PATH.dest.dev.all));
});

gulp.task('build.fonts.dev', function () {
  return gulp.src('./bower_components/**/*.{eot,svg,ttf,woff,woff2}')
    .pipe(flatten())
    .pipe(gulp.dest(path.join(PATH.dest.dev.all, 'fonts/')));
});

gulp.task('build.index.dev', ['build.fonts.dev'], function () {
    var target = gulp.src(injectableDevAssetsRef(), {read: false});
    var bower = injectableBowerComponents('dev');
    return gulp.src(PATH.dest.dev.all + '/index.html')
        .pipe(inject(series(target, bower), { transform: transformPath('dev') }))
        .pipe(template(templateLocals()))
        .pipe(gulp.dest(PATH.dest.dev.all));
});

gulp.task('build.app.dev', function (done) {
    runSequence('clean.app.dev', 'build.assets.dev', 'build.index.dev', done);
});

gulp.task('build.dev', function (done) {
    runSequence('clean.dev', 'build.lib.dev', 'build.app.dev', done);
});

// --------------
// Build prod.

gulp.task('build.ng2.prod', function () {
    ng2Builder.build('angular2/router - angular2/angular2', join('tmp', 'router.js'), {});
    return ng2Builder.build('angular2/angular2', join('tmp', 'angular2.js'), {});
});

gulp.task('build.lib.prod', ['build.ng2.prod'], function () {
    var jsOnly = filter('**/*.js');
    var lib = gulp.src(PATH.src.lib);
    var ng2 = gulp.src('tmp/angular2.js');
    var router = gulp.src('tmp/router.js');

    return series(lib, ng2, router)
        .pipe(jsOnly)
        .pipe(concat('lib.js'))
        .pipe(uglify())
        .pipe(gulp.dest(PATH.dest.prod.lib));
});

gulp.task('build.js.tmp', function () {
    var result = gulp.src(['./app/**/*ts', '!./app/init.ts'])
        .pipe(plumber())
        .pipe(tsc(tsProject));

    return result.js
        .pipe(template({VERSION: getVersion()}))
        .pipe(gulp.dest('tmp'));
});

// TODO: add inline source maps (System only generate separate source maps file).
gulp.task('build.js.prod', ['build.js.tmp'], function () {
    return appProdBuilder.build('app', join(PATH.dest.prod.all, 'app.js'),
        {minify: true}).catch(function (e) {
            console.log(e);
        });
});

gulp.task('build.init.prod', function () {
    var result = gulp.src('./app/init.ts')
        .pipe(insert.prepend('declare var System;'))
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(tsc(tsProject));

    return result.js
        .pipe(uglify())
        .pipe(template(templateLocals()))
        .pipe(sourcemaps.write())
        .pipe(gulp.dest(PATH.dest.prod.all));
});

<% if (props.htmlPreprocessor.key === 'jade') { %>
gulp.task('build.jade.prod', function() {
    var YOUR_LOCALS = {};
    return gulp.src('./app/**/*.jade')
        .pipe(jade({
            locals: YOUR_LOCALS,
            doctype: 'html' //保证angular2的标记被正常解析
        }))
        .pipe(gulp.dest(PATH.dest.prod.all));
});
<% } %>

gulp.task('build.assets.prod', [
    'build.js.prod'
    <% if (props.htmlPreprocessor.key === 'jade') { %>
    ,'build.jade.prod'
    <% } %>
], function () {
    <% if (props.cssPreprocessor.key === 'node-sass') { %>
        gulp.src(['./app/**/*.sass', './app/**/*.scss'])
            .pipe(sass().on('error', sass.logError))
            .pipe(gulp.dest(PATH.dest.dev.all));

    <% } %>

    var filterHTML = filter('**/*.html');
    var filterCSS = filter('**/*.css');
    return gulp.src(['./app/**/*.html', './app/**/*.css'])
        .pipe(filterHTML)
        .pipe(minifyHTML(HTMLMinifierOpts))
        .pipe(filterHTML.restore())
        .pipe(filterCSS)
        .pipe(cleanCSS())
        .pipe(filterCSS.restore())
        .pipe(gulp.dest(PATH.dest.prod.all));
});

gulp.task('build.fonts.prod', function () {
  return gulp.src('./bower_components/**/*.{eot,svg,ttf,woff,woff2}')
    .pipe(flatten())
    .pipe(gulp.dest(path.join(PATH.dest.prod.all, 'fonts/')));
});

gulp.task('build.index.prod', ['build.fonts.prod'], function () {
    var bower = injectableBowerComponents('prod');
    var target = gulp.src([join(PATH.dest.prod.lib, 'lib.js'),
        join(PATH.dest.prod.all, '**/*.css')], {read: false});
    return gulp.src(PATH.dest.prod.all + '/index.html')
        .pipe(inject(series(target, bower), { transform: transformPath('prod') }))
        .pipe(template(templateLocals()))
        .pipe(gulp.dest(PATH.dest.prod.all));
});

gulp.task('build.app.prod', function (done) {
    // build.init.prod does not work as sub tasks dependencies so placed it here.
    runSequence('clean.app.prod', 'build.init.prod', 'build.assets.prod',
        'build.index.prod', 'clean.tmp', done);
});

gulp.task('build.prod', function (done) {
    runSequence('clean.prod', 'build.lib.prod', 'clean.tmp', 'build.app.prod',
        done);
});

// --------------
// Version.

registerBumpTasks();

gulp.task('bump.reset', function () {
    return gulp.src('package.json')
        .pipe(bump({version: '0.0.0'}))
        .pipe(gulp.dest('./'));
});

// --------------
// Test.

// To be implemented.

// --------------
// Serve dev.

gulp.task('serve.dev', ['build.dev', 'livereload'], function () {
    watch('./app/**', function (e) {
        runSequence('build.app.dev', function () {
            notifyLiveReload(e);
        });
    });
    serveSPA('dev');
});

// --------------
// Serve prod.

gulp.task('serve.prod', ['build.prod', 'livereload'], function () {
    watch('./app/**', function (e) {
        runSequence('build.app.prod', function () {
            notifyLiveReload(e);
        });
    });
    serveSPA('prod');
});

// --------------
// Livereload.

gulp.task('livereload', function () {
    tinylr.listen(LIVE_RELOAD_PORT);
});

// --------------
// Utils.

function notifyLiveReload(e) {
    var fileName = e.path;
    tinylr.changed({
        body: {
            files: [fileName]
        }
    });
}

function transformPath(env) {
    var v = '?v=' + getVersion();
    return function (filepath) {
        var filename = filepath.replace('/' + PATH.dest[env].all, '') + v;
        arguments[0] = join(APP_BASE, filename);
        return inject.transform.apply(inject.transform, arguments);
    };
}

function injectableDevAssetsRef() {
    var src = PATH.src.lib.map(function (path) {
        return join(PATH.dest.dev.lib, path.split('/').pop());
    });
    src.push(PATH.dest.dev.ng2, PATH.dest.dev.router,
        join(PATH.dest.dev.all, '**/*.css'));
    return src;
}

function getVersion() {
    var pkg = JSON.parse(fs.readFileSync('package.json'));
    return pkg.version;
}

function templateLocals() {
    return {
        VERSION: getVersion(),
        APP_BASE: APP_BASE
    };
}

function registerBumpTasks() {
    semverReleases.forEach(function (release) {
        var semverTaskName = 'semver.' + release;
        var bumpTaskName = 'bump.' + release;
        gulp.task(semverTaskName, function () {
            var version = semver.inc(getVersion(), release);
            return gulp.src('package.json')
                .pipe(bump({version: version}))
                .pipe(gulp.dest('./'));
        });
        gulp.task(bumpTaskName, function (done) {
            runSequence(semverTaskName, 'build.app.prod', done);
        });
    });
}

function injectableBowerComponents(path) {

  var jsFilter = filter('**/*.js');
  var cssFilter = filter('**/*.css');

  return gulp.src(bowerFiles())
  .pipe(jsFilter)
  .pipe(uglify())
  .pipe(gulp.dest(PATH.dest[path].vendor))
  .pipe(jsFilter.restore())
  .pipe(cssFilter)
  .pipe(concat('vendor.css'))
  .pipe(minifyCSS())
  .pipe(rename({ suffix: '.min' }))
  .pipe(gulp.dest(PATH.dest[path].vendor))
  .pipe(cssFilter.restore());
}

function serveSPA(env) {
    var app;
    app = express().use(APP_BASE, connectLivereload({port: LIVE_RELOAD_PORT}), serveStatic(join(__dirname, PATH.dest[env].all)));
    app.all(APP_BASE + '*', function (req, res, next) {
        res.sendFile(join(__dirname, PATH.dest[env].all, 'index.html'));
    });
    app.listen(PORT, function () {
        openResource('http://localhost:' + PORT + APP_BASE);
    });
}
