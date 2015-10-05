var caseToRally = {
	init: function(config) {
		angular.module('caseToRallyApp', ['ngRoute', 'caseToRallyControllers', 'caseToRallyServices', 'caseToRallyDirectives']).
			constant('caseToRallyConfig', config).
			config(['$routeProvider', 
				function($routeProvider) {
					$routeProvider.
						when('/artifacts', {
							templateUrl: config.resourceUrl+'/partials/case-to-rally.html'
							,controller: 'CaseToRallyCtrl'
						}).
						otherwise({
							redirectTo: '/artifacts'
						});
				}])
			;

		angular.element(document).ready(function() {
			angular.bootstrap(document, ['caseToRallyApp']);
		});
	}
};