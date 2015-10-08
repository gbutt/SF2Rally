var caseToRallyApp = {};
caseToRallyApp.init = function(config) {
	angular.module('caseToRallyApp', [
			'ngRoute', 
			'caseToRallyControllers', 
			'sfServices', 
			'almServices',
		])

		.constant('appConfig', config)

		.config(['$routeProvider', 
			function($routeProvider) {
				$routeProvider.
					when('/artifacts', {
						templateUrl: config.resourceUrl+'/partials/caseToRally/case-to-rally.html'
						,controller: 'CaseToRallyCtrl'
					}).
					otherwise({
						redirectTo: '/artifacts'
					});
			}
		])
		.directive('c2rCreateArtifact',
			function(){
				return {
					restrict: 'E',
					templateUrl: config.resourceUrl+'/partials/caseToRally/create-artifact.html'
				};
			}
		)
		.directive('c2rListArtifacts', 
			function(){
				return {
					restrict: 'E',
					templateUrl: config.resourceUrl+'/partials/caseToRally/list-artifacts.html'
				};
			}
		)
	;

	angular.element(document).ready(function() {
		angular.bootstrap(document, ['caseToRallyApp']);
	});
};