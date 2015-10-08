var sfdcClient = function(config) {

	sforce.connection.sessionId = config.sessionId;

	var exports = {}

	exports.fetchSetupRecord = function() {
		var soql = 'SELECT Id, Name, rallyUrl__c, Defect_Field_Map__c, Story_Field_Map__c, apiKey__c FROM Case2Rally_Setup__c LIMIT 1'
		var setupRecords = sforce.connection.query(soql).getArray("records");
		if (setupRecords.length !== 1){
			throw "Run setup first";
		}

		return setupRecords[0];
	}
	
	exports.fetchCaseFields = function() {
		return sforce.connection.describeSObject("Case").fields.filter(function(element){return !element.referenceTo;});
	}

	exports.fetchCaseValues = function(caseId, caseFields) {
		var soql = 'SELECT ' + caseFields.join(', ') + " FROM Case WHERE Id = '" + caseId + "'";
		var records = sforce.connection.query(soql).getArray("records");
		if (records.length !== 1){
			throw "Baaad case id";
		}

		return records[0];
	}

	exports.createLinkRecord = function(props){
		var linkRecord = new sforce.SObject('Case2RallyArtifact__c');
		angular.forEach(props, function(val, key){
			linkRecord[key] = val;
		});
		
		return sforce.connection.create([linkRecord]);
	}

	exports.getLinkRecords = function(caseId){
		var soql = "SELECT Id, ArtifactRef__c FROM Case2RallyArtifact__c WHERE Case__c = '" + caseId + "'"; 
		return sforce.connection.query(soql).getArray("records");
	}

	exports.deleteLinkRecord = function(linkId){
		return sforce.connection.deleteIds([linkId]);
	}

	return exports;
}