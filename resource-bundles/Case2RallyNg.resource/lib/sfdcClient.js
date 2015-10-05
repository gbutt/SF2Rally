var sfdcClient = function(config) {

	sforce.connection.sessionId = config.sessionId;

	var fetchSetupRecord = function() {
		var soql = 'SELECT Name, rallyUrl__c, Defect_Field_Map__c, Story_Field_Map__c, apiKey__c FROM Case2Rally_Setup__c LIMIT 1'
		var setupRecords = sforce.connection.query(soql).getArray("records");
		if (setupRecords.length !== 1){
			throw "Run setup first";
		}

		
		var setupObj = {
			DefectMap: JSON.parse(setupRecords[0].Defect_Field_Map__c || '{}'),
			HierarchicalRequirementMap: JSON.parse(setupRecords[0].Story_Field_Map__c || '{}'),
			rallyUrl: setupRecords[0].rallyUrl__c,
			workspaceName : setupRecords[0].Name,
			apiKey : setupRecords[0].apiKey__c
		}

		return setupObj;
	}
	
	

	var fetchCaseValues = function(caseId, caseFields) {
		var soql = 'SELECT ' + caseFields.join(', ') + " FROM Case WHERE Id = '" + caseId + "'";
		var records = sforce.connection.query(soql).getArray("records");
		if (records.length !== 1){
			throw "Baaad case id";
		}

		return records[0];
	}

	var createLinkRecord = function(props){
		var linkRecord = new sforce.SObject('Case2RallyArtifact__c');
		angular.forEach(props, function(val, key){
			linkRecord[key] = val;
		});
		
		return sforce.connection.create([linkRecord]);
	}

	var getLinkRecords = function(caseId){
		var soql = "SELECT Id, ArtifactRef__c FROM Case2RallyArtifact__c WHERE Case__c = '" + caseId + "'"; 
		return sforce.connection.query(soql).getArray("records");
	}

	var deleteLinkRecord = function(linkId){
		return sforce.connection.deleteIds([linkId]);
	}

	return {
		fetchSetupRecord : fetchSetupRecord,
		fetchCaseValues: fetchCaseValues,
		createLinkRecord : createLinkRecord,
		getLinkRecords : getLinkRecords,
		deleteLinkRecord: deleteLinkRecord
	}
}