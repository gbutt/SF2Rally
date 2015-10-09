module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt, {
		pattern: ['grunt-*', '!grunt-template-jasmine-istanbul', 'which']
	});

	var stdMetadata = {
		apexclass: ['*'],
		apexpage: ['*'],
		staticresource: ['*'],
		customobject: ['*'],
		apextrigger: ['*'],
		apexcomponent: ['*']
	};

	var caseToRallyNgBaseDir = 'resource-bundles/Case2RallyNg.resource/';
	var sfdcSession = grunt.file.readJSON('config/.session');

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		clean: {
			caseToRallyNg: [caseToRallyNgBaseDir+'dist'],
			deploy: 'deployTmp',
		},
		uglify: {
			options: {
				screwIE8: true,
				sourceMap: true,
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n' +
					'/*! visit <%= pkg.homepage %> for more info. */\n',
			},
			caseToRallyNg: {
				files: {
					'resource-bundles/Case2RallyNg.resource/dist/caseToRallyNg.min.js': caseToRallyNgBaseDir+'js/**/*.js'
				}
			},
		},
		compress: {
			caseToRallyNg: {
				options: {
					mode: 'zip',
					archive: 'src/staticresources/caseToRallyNg.resource'
				},
				files: [{
					expand: true,
					cwd: caseToRallyNgBaseDir,
					src: ['**'],
					dest: ''
				}, ]
			},
		},
		copy: {
			caseToRallyNg: {
				files: [{
					expand: true,
					src: ['src/staticresources/Case2RallyNg.*'],
					dest: 'deployTmp/',
				}]
			},
		},
		antdeploy: {
			options: {
				version: '29.0',
				root: 'deployTmp/src/',
			},
			automated: {
				options: {
					serverurl: sfdcSession.instanceUrl,
					sessionid: sfdcSession.accessToken,
				},
				pkg: stdMetadata
			},
		},
		watch: {
			scripts: {
				files: [caseToRallyNgBaseDir+'**/*'],
				tasks: ['min'],
				options: {
					spawn: false,
				},
			},
		},
	});

	grunt.registerTask('default', 'min');

	grunt.registerTask('min', function() {
		grunt.task.run([
			'clean:caseToRallyNg',
			'uglify:caseToRallyNg',
		]);
	});

	grunt.registerTask('deploy', function(){
		grunt.task.run([
			'compress:caseToRallyNg',
			'copy:caseToRallyNg',
			'antdeploy:automated',
			'clean:deploy'
		]);
	});

	grunt.registerTask('tasks', ['availabletasks']);
};