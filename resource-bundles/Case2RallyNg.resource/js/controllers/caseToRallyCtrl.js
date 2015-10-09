(function(){
angular.module('caseToRallyControllers', ['sfServices', 'almServices', 'app.config'])
	.controller('CaseToRallyCtrl', ['$scope', 'sfClientService', 'almClientService', 'appConfig', '$q', 
		function($scope, sfClientService, almClientService, appConfig, $q){

			var resolveServices = function() {
				var almPromise = almClientService.getInstance();
				var sfPromise = sfClientService.getInstance();
				return $q.all({almClient: almPromise, sfClient: sfPromise});
			};

			var bindListArtifacts = function(sfClient, almClient) {
				$scope.removeLink = function(artifact, type) {
					if (!!artifact) {
						if (type === 'defect') {
							var index = $scope.defects.indexOf(artifact);
							$scope.defects.splice(index, 1);
						} else if (type === 'userStory') {
							var index = $scope.userStories.indexOf(artifact);
							$scope.userStories.splice(index, 1);
						}
						sfClient.deleteLinkRecord(artifact.LinkId);
					}
				};
				$scope.refresh = function() {
					var oidToLinkIdMap = {};
					sfClient.getLinkRecords(appConfig.caseId).then(function(linkRecords){
						var oids = [];
						angular.forEach(linkRecords, function(record) {
							var oid = almClient.parseOidFromUrl(record.ArtifactRef__c);
							oidToLinkIdMap[oid] = record.Id;
							oids.push(oid);
						});
						return almClient.fetchArtifacts(oids);
					}).then(function(artifacts) {
						angular.forEach(artifacts.rallyDefects.concat(artifacts.rallyStories), function(artifact){
							artifact.LinkId = oidToLinkIdMap[artifact.ObjectID];
						});
						return artifacts;
					}).then(function(artifacts){
						$scope.defects = artifacts.rallyDefects;
						$scope.userStories = artifacts.rallyStories;
					});
				};

				$scope.refresh();
			};

			var bindCreateArtifact = function(sfClient, almClient) {
				var fetchAlmProjects = function() {
					var deferred = $q.defer();
					$q.all({
						userDefaults: almClient.fetchUserDefaults(),
						projects: almClient.fetchProjects(),
					}).then(function(results) {
						var userDefaults = results.userDefaults,
							projects = results.projects,
							selectedProjectOid = undefined;
						if (projects.filter(function(project){ return project.ObjectID === userDefaults.projectOid }).length === 1) {
							selectedProjectOid = userDefaults.projectOid;
						} else if (projects.length > 0) {
							selectedProjectOid = projects[0].ObjectID;
						}

						deferred.resolve( {
							projects: projects,
							selectedProjectOid: selectedProjectOid,
						});
					});
					return deferred.promise;
				};

				$scope.createArtifact = function(type) {
					// get defect mapping
					var savedFieldMap = JSON.parse(appConfig.setupRecord[type + '_Field_Map__c'] || '{}');

					// get merge fields from case
					var caseFieldsToQuery = [];
					angular.forEach(savedFieldMap, function(value) {
						if (!value.literalValue	) {
							caseFieldsToQuery.push(value.fldValue);
						}
					});
					sfClient.fetchCaseValues(appConfig.caseId, caseFieldsToQuery).then(function(caseObj){
						var rallyArtifact = {};
						angular.forEach(savedFieldMap, function(value, key) {
							rallyArtifact[key] = value.literalValue || caseObj[value.fldValue];
						});
						var almType = (type == 'Defect' ? 'Defect' : 'HierarchicalRequirement');
						return almClient.createArtifact($scope.selectedProjectOid, almType, rallyArtifact);
					}).then(function(response) {
						var linkRecord = {
							Case__c : appConfig.caseId, 
							artifactRef__c: response.data.CreateResult.Object._ref
						};
						return sfClient.createLinkRecord(linkRecord);
						
					}).then(function(result){
						$scope.refresh();
					});
				};

				fetchAlmProjects().then(function(results){
					$scope.projects = results.projects;
					$scope.selectedProjectOid = results.selectedProjectOid;
				});	
			};

			resolveServices().then(function(services) {
				var sfClient = services.sfClient,
					almClient = services.almClient;
					
				$scope.RallyUrl = appConfig.setupRecord.rallyUrl__c;
				bindListArtifacts(sfClient, almClient);
				bindCreateArtifact(sfClient, almClient);
			});
		}]);
})();