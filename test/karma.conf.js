module.exports = function(config){
  config.set({

    basePath : '../',

    files : [
      'resource-bundles/*.resource/lib/**/*.js',
      'app/bower_components/angular-mocks/angular-mocks.js',
      'resource-bundles/*.resource/js/**/*.js',
      'test/unit/**/*.js'
    ],

    autoWatch : true,

    frameworks: ['jasmine'],

    browsers : ['Firefox'],

    plugins : [
            'karma-firefox-launcher',
            'karma-jasmine'
            ],

    junitReporter : {
      outputFile: 'test_out/unit.xml',
      suite: 'unit'
    }

  });
};