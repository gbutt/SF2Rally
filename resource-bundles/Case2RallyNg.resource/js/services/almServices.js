angular.module('almServices', []).
	factory('almClient', ['sfClient', '$http', 'appConfig', '$q',
		function(sfClient,$http,appConfig,$q) {
			if (!appConfig.setupRecord) {
				appConfig.setupRecord = sfClient.fetchSetupRecord();
			}
			$http.defaults.headers.common = {
				zsessionid: appConfig.setupRecord.apiKey__c
			};
			$http.defaults.headers.post = {
				'Content-Type': 'application/json'
			};

			return almClient({
				rallyUrl: appConfig.setupRecord.rallyUrl__c,
				apiKey: appConfig.setupRecord.apiKey__c,
				wsapiVersion: 'v2.0',
				workspaceName: appConfig.setupRecord.Name,
			},$http, angular, $q);
		}]);