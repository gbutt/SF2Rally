(function(){
	var filterSchema = function(typeDefSchema){
		var map = {}, typeBlackList=['COLLECTION'];
		var attributeWhitelist = [
			"FoundInBuild",
			"Severity",
			"Priority",
			"Environment",
			"Description",
			"Name",
			"Package",
			"Owner"
		];
		typeDefSchema.Attributes.forEach(function(val) {
			if (!val.ReadOnly && typeBlackList.indexOf(val.AttributeType) === -1 && (val.Custom || attributeWhitelist.indexOf(val.ElementName) > -1)){
				map[val.ElementName] = val;	
			}
		});
		return reorderFields(map);
	};

	var sortByKey = function (key) {
		return function(a, b) {
			return (a[key] < b[key]) ? -1 : ((a[key] > b[key]) ? 1 : 0);
		};
	};

	var reorderFields = function(typeDefSchema){
		var standardFields = [],
			customFields = [];
		angular.forEach(typeDefSchema, function(val){
			if (val.Custom){
				customFields.push(val);
			} else {
				standardFields.push(val);
			}
		});
		return standardFields.sort(sortByKey('Name'))
		 .concat(customFields.sort(sortByKey('Name')));
	};

	var prettyLabel = function(attrType){
		return attrType
			.replace('_',' ')
			.toLowerCase()
			.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); })
	};

	var buildViewModel = function(typeDefSchema, fieldMap, caseFields) {
		var rows = [];
		var allRallyFields = filterSchema(typeDefSchema);
		allRallyFields.forEach(function(rallyField){
			var rallyFieldCode = rallyField.ElementName;
			var allowedValues = (Array.isArray(rallyField.AllowedValues) && rallyField.AllowedValues.length > 0) ? rallyField.AllowedValues : [];
			var rallyFieldType = prettyLabel(rallyField.AttributeType);
			var field = fieldMap[rallyFieldCode] || {};
			var caseFieldOptions = [];
			if (!rallyField.Required){
				caseFieldOptions.push({name: 'None', label: '' });	
			}
			caseFieldOptions.push({name: 'Default', label: '<Default Value>' });
			caseFieldOptions = caseFieldOptions.concat(caseFields);

			var row = {
				rallyFieldCode: rallyFieldCode,
				
				caseField:{
					value: field.fldValue || caseFieldOptions[0].name,
					options: caseFieldOptions,
				}, 

				defaultField:{
					value: field.literalValue || (allowedValues.length > 0 ? allowedValues[0].StringValue : ''),
					allowedValues: allowedValues,
					type: function(){ return this.allowedValues.length > 0 ? 'select' : 'input'; },
				},

				rallyFieldName: rallyField.Name,
				rallyFieldType: rallyFieldType,
			};
			row.defaultField.cachedValue = row.defaultField.value;
			row.defaultField.disabled = function(){ return row.caseField.value !== 'Default'; };
			rows.push(row);
		});

		return rows;
	};

	angular.module('artifactMapperCtrl', ['sfServices','almServices','app.config'])
		.controller('ArtifactMapperCtrl', ['$scope', 'sfClientService', 'almClientService', 'appConfig', '$q', 
			function($scope, sfClientService, almClientService, appConfig, $q){

				var resolveServices = function() {
					var almPromise = almClientService.getInstance();
					var sfPromise = sfClientService.getInstance();
					return $q.all({almClient: almPromise, sfClient: sfPromise});
				};

				var bindScope = function(sfClient, almClient) {
					var cleanupWatches = function() {
						angular.forEach($scope.rows, function(row){
							if (!!row.removeWatch) {
								row.removeWatch();
							}
						});
					};
					var watchCaseFieldsForChanges = function() {
						angular.forEach($scope.rows, function(row){
							var deregister = $scope.$watch(function(){return row.caseField.value;}, 
								function(newVal, oldVal){
								// if it changes from 'Default', wipe the defaultField value and cache it
								if(oldVal === 'Default' && newVal !== 'Default') {
									row.defaultField.cachedValue = row.defaultField.value;
									row.defaultField.value = '';
								} 
								// if it changes to 'Default', restore the defaultField cached value
								else if(oldVal !== 'Default' && newVal === 'Default') {
									row.defaultField.value = row.defaultField.cachedValue;
								}
							});
							row.removeWatch = deregister;
						});
					};
					var rebuildRows = function(artifactType) {
						$q.all({
							typeDefSchema: almClient.fetchTypeDefSchemaByName($scope.artifactType),
							caseFields: sfClient.fetchCaseFields(),
						}).then(function(data){
							var typeDefSchema = data.typeDefSchema,
								caseFields = data.caseFields;
							var fieldMapStr = ($scope.artifactType == 'Defect' ?  
								appConfig.setupRecord.Defect_Field_Map__c : appConfig.setupRecord.Story_Field_Map__c);
							var fieldMap = JSON.parse(fieldMapStr || '{}');

							return buildViewModel(typeDefSchema, fieldMap, caseFields.sort(sortByKey('label')));
						}).then(function(rows){
							cleanupWatches();
							$scope.rows = rows;
							watchCaseFieldsForChanges();
						});
					};

					$scope.saveSettings = function(){
						
					}

					$scope.$watch('artifactType', rebuildRows);
					$scope.artifactType = 'Defect';
				};

				resolveServices().then(function(services) {
					var sfClient = services.sfClient,
						almClient = services.almClient;
						bindScope(sfClient, almClient);
				});
			}
		])
	;		
})();