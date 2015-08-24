'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
//var fs = require('fs');

module.exports = yeoman.generators.Base.extend({
    constructor: function () {
        yeoman.generators.Base.apply(this, arguments);

        this.argument('appName', {
            type: String,
            required: false
        });

        this.appName = this.appname || path.basename(process.cwd());

        this.props = {};
    },

    askFor: function () {
        var done = this.async();

        this.log(yosay(
            chalk.red('Welcome!') + '\n' +
            chalk.yellow('You\'re using the fantastic generator for scaffolding an application with Angular2 and Gulp!')
        ));
        var prompts = [{
            type: 'list',
            name: 'htmlPreprocessor',
            message: 'Which HTML template engine would you want?',
            choices: [{
                value: {
                    key: 'none',
                    extension: 'html'
                },
                name: 'None, I like to code in standard HTML.'
            }, {
                value: {
                    key: 'jade',
                    extension: 'jade'
                },
                name: 'Jade (*.jade)'
            }]
        }, {
            type: 'list',
            name: 'cssPreprocessor',
            message: 'Which CSS preprocessor do you want?',
            choices: [{
                value: {
                    key: 'node-sass',
                    extension: 'scss'
                },
                name: 'Sass (Node)'
            }/*, {
                value: {
                    key: 'ruby-sass',
                    extension: 'scss'
                },
                name: 'Sass (Ruby)'
            }, {
                value: {
                    key: 'less',
                    extension: 'less'
                },
                name: 'Less'
            }, {
                value: {
                    key: 'stylus',
                    extension: 'styl'
                },
                name: 'Stylus'
            }*/, {
                value: {
                    key: 'none',
                    extension: 'css'
                },
                name: 'None, only the good old CSS'
            }]
        }];


        this.prompt(prompts, function (props) {
            this.props = props;
            done();
        }.bind(this));
    },

    write: function () {
        var statics = [
            'bower.json',
            'tsconfig.json',
            'tsd.json',
            '.editorconfig',
            '.jshintrc'
        ];

        var statics_dir = [
            'tsd_typings',
            'app/typings'
        ];

        var templates = [
            'package.json',
            'gulpfile.js'
        ];

        var scripts = [
            'app/init.ts',
            'app/app.ts',
            'app/components/about/about.ts',
            'app/components/home/home.ts',
            'app/services/NameList.ts'
        ];

        var styles = [
            'app/styles/app'
        ];
        var htmls = [
            'app/index',
            'app/app',
            'app/components/home/home',
            'app/components/about/about'
        ];

        // write statics
        var me = this;
        statics.forEach(function(f) {
            me.copy(f, f);
        });
        statics_dir.forEach(function(f) {
            me.bulkDirectory(f, f);
        });
        templates.forEach(function(f) {
            me.template(f, f, me);
        });
        scripts.forEach(function(f) {
            me.copy(f, f)
        });

        var htmlSuffix = '.html';
        if (me.props.htmlPreprocessor.key === 'jade') {
            htmlSuffix = '.jade';
        }
        htmls.forEach(function(f) {
            f = f + htmlSuffix;
            me.copy(f, f);
        });

        var styleSuffix = '.css';
        if (me.props.cssPreprocessor.key === 'node-sass') {
            styleSuffix = '.sass';
        }
        styles.forEach(function(f) {
            f = f + styleSuffix;
            me.copy(f, f);
        });



    },

    install: function () {
        this.installDependencies({
            skipInstall: this.options['skip-install'],
            skipMessage: this.options['skip-message']
        });
    }



});
