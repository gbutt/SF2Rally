(function(){
angular.module('c2rSetupApp', ['ngRoute', 'app.config', 'artifactMapperCtrl'])	
	.config(['$routeProvider', 'appConfig',
		function($routeProvider, appConfig) {
			$routeProvider.
				when('/artifactMapper', {
					templateUrl: appConfig.resourceUrl+'/partials/c2rSetup/artifact-mapper.html'
					,controller: 'ArtifactMapperCtrl'
				}).
				otherwise({
					redirectTo: '/artifactMapper'
				});
		}
	])
;
})();
