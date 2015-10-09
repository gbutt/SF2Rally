(function(){
	angular.module('sfServices', ['ngForce']).
		factory('sfClientService', ['appConfig', '$q', 'vfr',
			function(appConfig,$q,vfr) {
				
				var clientInstance = sfdcClient(vfr);
				return {
					getInstance: function() {
						var deferred = $q.defer();
						deferred.resolve( clientInstance );
						return deferred.promise;
					}
				};

			}]);

	var sfdcClient = function(vfr) {

		var exports = {}

		exports.fetchSetupRecord = function() {
			var soql = 'SELECT Id, Name, rallyUrl__c, Defect_Field_Map__c, Story_Field_Map__c, apiKey__c FROM Case2Rally_Setup__c LIMIT 1';
			return vfr.query(soql).then(function(result){
				return result.records[0];
			});

		}
		
		exports.fetchCaseFields = function() {
			return vfr.describe('Case').then(function(result){
				return result.fields.filter(function(element){return !element.referenceTo;});
			});
		}

		exports.fetchCaseValues = function(caseId, caseFields) {
			var soql = 'SELECT ' + caseFields.join(', ') + " FROM Case WHERE Id = '" + caseId + "'";
			return vfr.query(soql).then(function(result){
				return result.records;
			});
		}

		exports.createLinkRecord = function(props){
			return vfr.create('Case2RallyArtifact__c', props);
		}

		exports.getLinkRecords = function(caseId){
			var soql = "SELECT Id, ArtifactRef__c FROM Case2RallyArtifact__c WHERE Case__c = '" + caseId + "'"; 
			return vfr.query(soql).then(function(result){
				return result.records;
			});
		}

		exports.deleteLinkRecord = function(linkId){
			return vfr.del('Case2RallyArtifact__c', linkId);
		}

		return exports;
	}
})();