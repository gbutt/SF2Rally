angular.module('sfServices', []).
	factory('sfClient', ['appConfig', 
		function(appConfig) {
			return sfdcClient({sessionId: appConfig.sessionId})
		}]);