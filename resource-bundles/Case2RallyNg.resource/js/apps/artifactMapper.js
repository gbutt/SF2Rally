var artifactMapperApp = {};
artifactMapperApp.init = function(config) {
	angular.module('artifactMapperApp', ['ngRoute', 'sfServices', 'almServices', 'artifactMapperControllers'])
		
		.constant('appConfig', config)
		
		.config(['$routeProvider', 
			function($routeProvider) {
				$routeProvider.
					when('/', {
						templateUrl: config.resourceUrl+'/partials/artifactMapper/artifact-mapper.html'
						,controller: 'ArtifactMapperCtrl'
					}).
					otherwise({
						redirectTo: '/'
					});
			}
		])
	;
	angular.element(document).ready(function() {
		angular.bootstrap(document, ['artifactMapperApp']);
	});
};
