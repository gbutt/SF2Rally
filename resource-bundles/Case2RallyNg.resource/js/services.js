angular.module('caseToRallyServices', []).
	factory('sfClient', ['caseToRallyConfig', 
		function(caseToRallyConfig) {
			return sfdcClient({sessionId: caseToRallyConfig.sessionId})
		}]).
	factory('almClient', ['sfClient', '$http', 'caseToRallyConfig', '$q',
		function(sfClient,$http,caseToRallyConfig,$q) {
			var setupRecord = sfClient.fetchSetupRecord();
			$http.defaults.headers.common = {
				zsessionid: setupRecord.apiKey
			};
			$http.defaults.headers.post = {
				'Content-Type': 'application/json'
			};
			caseToRallyConfig.setupRecord = setupRecord;

			return almClient({
				rallyUrl: setupRecord.rallyUrl,
				apiKey: setupRecord.apiKey,
				wsapiVersion: 'v2.0',
				workspaceName: setupRecord.workspaceName,
			},$http, angular, $q);
		}]);