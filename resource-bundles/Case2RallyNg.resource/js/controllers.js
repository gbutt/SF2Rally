angular.module('caseToRallyControllers', []).
	controller('CaseToRallyCtrl', ['$scope', 'sfClient', 'almClient', 'caseToRallyConfig', 
		function($scope, sfClient, almClient, caseToRallyConfig){
			$scope.RallyUrl = caseToRallyConfig.setupRecord.rallyUrl;
			$scope.removeLink = function(artifact, type) {
				if (!!artifact) {
					sfClient.deleteLinkRecord(artifact.LinkId);
					if (type === 'defect') {
						var index = $scope.defects.indexOf(artifact);
						$scope.defects.splice(index, 1);
					} else if (type === 'userStory') {
						var index = $scope.userStories.indexOf(artifact);
						$scope.userStories.splice(index, 1);
					}
				}
			};
			$scope.refresh = function() {
				var linkRecords = sfClient.getLinkRecords(caseToRallyConfig.caseId);
				var oids = [];
				var oidToLinkIdMap = {};
				angular.forEach(linkRecords, function(record) {
					var oid = almClient.parseOidFromUrl(record.ArtifactRef__c);
					oidToLinkIdMap[oid] = record.Id;
					oids.push(oid);
				});
				almClient.fetchArtifacts(oids).then(function(artifacts) {
					angular.forEach(artifacts.rallyDefects.concat(artifacts.rallyStories), function(artifact){
						artifact.LinkId = oidToLinkIdMap[artifact.ObjectID];
					});
					$scope.defects = artifacts.rallyDefects;
					$scope.userStories = artifacts.rallyStories;
				});
			}
			$scope.createArtifact = function(type) {
				// get defect mapping
				var savedFieldMap = caseToRallyConfig.setupRecord[type + 'Map'];

				// get merge fields from case
				var caseFieldsToQuery = [];
				angular.forEach(savedFieldMap, function(value) {
					if (!value.literalValue	) {
						caseFieldsToQuery.push(value.fldValue);
					}
				});
				var caseObj = sfClient.fetchCaseValues(caseToRallyConfig.caseId, caseFieldsToQuery);

				// create rally artifact
				var rallyArtifact = {};
				angular.forEach(savedFieldMap, function(value, key) {
					rallyArtifact[key] = value.literalValue || caseObj[value.fldValue];
				});
				// call wsapi
				almClient.createArtifact($scope.selectedProjectOid, type, rallyArtifact).then(function(response) {
					if (response.data.CreateResult.Errors.length>0){
						alert('failed to create rally object : ' + response.data.CreateResult.Errors.join('\n   '))
					} else {
						sfClient.createLinkRecord({Case__c : caseToRallyConfig.caseId, artifactRef__c: response.data.CreateResult.Object._ref});
						$scope.refresh();
					}
				});
			};

			// setup projects
			almClient.fetchUserDefaults().then(function(userDefaults){
				almClient.fetchProjects().then(function(projects){
					$scope.projects = projects;
					if (projects.filter(function(project){ return project.ObjectID === userDefaults.projectOid }).length === 1) {
						$scope.selectedProjectOid = userDefaults.projectOid;
					} else if (projects.length > 0) {
						$scope.selectedProjectOid = projects[0].ObjectID;
					}
				});
			});
			// fetch linked artifacts
			$scope.refresh();
		}]);