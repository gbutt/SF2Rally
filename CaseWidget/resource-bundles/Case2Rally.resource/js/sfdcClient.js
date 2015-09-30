var sfdcClient = function(config) {

	sforce.connection.sessionId = config.sessionId;
	
	var soql = 'SELECT Name, rallyUrl__c, Defect_Field_Map__c FROM Case2Rally_Setup__c LIMIT 1'
	var records = sforce.connection.query(soql).getArray("records");
	if (records.length !== 1){
		throw "Run setup first";
	}

	
	var setupObj = {
		defectMap: JSON.parse(records[0].Defect_Field_Map__c),
		rallyUrl: records[0].rallyUrl__c,
		workspaceName : records[0].Name
	}

	var fetchCaseValues = function(caseId, caseFields) {
		var soql = 'SELECT ' + caseFields.join(', ') + " FROM Case WHERE Id = '" + caseId + "'";
		var records = sforce.connection.query(soql).getArray("records");
		if (records.length !== 1){
			throw "Baaad case id";
		}

		return records[0];
	}

	return {
		defectMap: setupObj.defectMap,
		rallyUrl: setupObj.rallyUrl,
		workspaceName : setupObj.workspaceName,
		fetchCaseValues: fetchCaseValues
	}
}