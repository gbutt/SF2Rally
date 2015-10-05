angular.module('caseToRallyDirectives', [])
	.directive('c2rCreateArtifact', ['caseToRallyConfig', function(caseToRallyConfig){
		return {
			restrict: 'E',
			templateUrl: caseToRallyConfig.resourceUrl+'/partials/create-artifact.html'
		};
	}])
	.directive('c2rListArtifacts', ['caseToRallyConfig', function(caseToRallyConfig){
		return {
			restrict: 'E',
			templateUrl: caseToRallyConfig.resourceUrl+'/partials/list-artifacts.html'
		};
	}])
;