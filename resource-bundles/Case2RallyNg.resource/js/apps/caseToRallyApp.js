(function(){
angular.module('caseToRallyApp', ['ngRoute', 'caseToRallyControllers','app.config'])
	.config(['$routeProvider', 'appConfig',
		function($routeProvider, appConfig) {
			$routeProvider.
				when('/artifacts', {
					templateUrl: appConfig.resourceUrl+'/partials/caseToRally/case-to-rally.html'
					,controller: 'CaseToRallyCtrl'
				}).
				otherwise({
					redirectTo: '/artifacts'
				});
		}
	])
	.directive('c2rCreateArtifact', ['appConfig',
		function(appConfig){
			return {
				restrict: 'E',
				templateUrl: appConfig.resourceUrl+'/partials/caseToRally/create-artifact.html'
			};
		}]
	)
	.directive('c2rListArtifacts', ['appConfig',
		function(appConfig){
			return {
				restrict: 'E',
				templateUrl: appConfig.resourceUrl+'/partials/caseToRally/list-artifacts.html'
			};
		}]
	)
;
})();