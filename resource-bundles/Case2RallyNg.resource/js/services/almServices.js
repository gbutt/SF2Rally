(function(){
	angular.module('almServices', []).
		factory('almClientService', ['sfClientService', '$http', 'appConfig', '$q',
			function(sfClientService,$http,appConfig,$q) {
				var resolveServices = function() {
					return sfClientService.getInstance();
				};

				var buildInstance = function() {
					var deferred = $q.defer();
					resolveServices().then(function(sfClient) {
						return sfClient.fetchSetupRecord();
					}).then(function(setupRecord) {
						appConfig.setupRecord = setupRecord;
						var almConfig = {
							rallyUrl: appConfig.setupRecord.rallyUrl__c,
							apiKey: appConfig.setupRecord.apiKey__c,
							wsapiVersion: 'v2.0',
							workspaceName: appConfig.setupRecord.Name,
						};
						deferred.resolve( almClient(almConfig,$http, angular, $q) ); 
					});
					return deferred.promise;
				};

				var clientInstance = undefined;
				return {
					getInstance: function() {
						var deferred = $q.defer();
						
						if (!!clientInstance) {
							deferred.resolve( clientInstance );
						} else {
							buildInstance().then(function(almClient) {
								clientInstance = almClient;
								deferred.resolve( clientInstance );
							});
						}
						return deferred.promise;
					}
				};
			}]);


	var almClient = function(config, $http, angular, $q) {
		var rallyUrl = config.rallyUrl,
			apiKey = config.apiKey
			wsapiVersion = config.wsapiVersion,
			wsapiBaseUrl = rallyUrl+'/slm/webservice/'+wsapiVersion+'/',
			schemaBaseUrl = rallyUrl+'/slm/schema/'+wsapiVersion+'/',
			workspace = {Name: config.workspaceName}
		;
		$http.defaults.headers.common = {
			zsessionid: apiKey,	
		};
		$http.defaults.headers.post = {
			'Content-Type': 'application/json'
		};

		var exports = {};
		exports.parseOidFromUrl = function(url) {
			return url.substring(url.lastIndexOf('/')+1);
		}

		var almPost = function(url, data, config) {
			var	requestUrl = (url.substring(0,4) === 'http') ? url : wsapiBaseUrl+url;
			return $http.post(requestUrl, data, config);
		};

		var almGet = function(url, config) {
			var	requestUrl = (url.substring(0,4) === 'http') ? url : wsapiBaseUrl+url;
			var ajaxConfig = {
				cache: true,
			};
			angular.extend(ajaxConfig, config);
			return $http.get(requestUrl, ajaxConfig);
		};

		var buildOidQuery = function(oids){
			var expression = "";
			var oidsLength = oids.length;
			for (var i = 0; i < oidsLength; i++) {
				var val = oids[i];
				var newExp = '(ObjectID = ' + val + ')';
				if (i > 0){
					newExp = '(' + expression + ' OR ' + newExp + ')';
				}
				expression = newExp;
			};
			return expression;
		};

		var getAlmWorkspaceByName = function() {
			var url = 'workspace';
			var params = {
				workspace:'null',
				query:'(Name = "'+workspace.Name+'")',
				fetch:'ObjectID,SchemaVersion,Name'
			}
			return almGet(url, {params: params}).then(function(response) {
				var results = response.data.QueryResult.Results;
				if (results.length !== 1) {
					throw "Bad workspace name";
				}
				workspace = results[0];
				return workspace;
			});
		};

		exports.fetchArtifacts = function(oids){
			return getAlmWorkspaceByName().then(function(workspace){
				var url = 'artifact';
				var params = {
					types:'Defect,HierarchicalRequirement',
					fetch:'Name,Owner,DisplayName,Project,State,ScheduleState,Discussion,Attachments,ObjectID',
					workspace:'/workspace/'+workspace.ObjectID,
					pagesize:200,
					query:buildOidQuery(oids),
				};
				return almGet(url, {params: params, cache: false});
			}).then(function(response) {
				var result = {
					rallyDefects: [],
					rallyStories: []
				};
				for (var i = response.data.QueryResult.Results.length - 1; i >= 0; i--) {
					var value = response.data.QueryResult.Results[i];
					if (value._type === 'Defect'){
						result.rallyDefects.push(value);
					} else {
						result.rallyStories.push(value);
					}
				};
				return result;
			});
		};

		exports.fetchUserDefaults = function(){
			return getAlmWorkspaceByName().then(function(workspace){
				var url = 'user:current';
				var params = {
					workspace: '/workspace/'+workspace.ObjectID
				}
				return almGet(url, {params: params});
			}).then(function(response) {
				var url = response.data.User.UserProfile._ref;
				var params = {
					fetch:'ObjectID,DefaultProject,DefaultWorkspace'
				}
				return almGet(url, {params:params});
			}).then(function(response) {
				var projectOid = (response.data.UserProfile.DefaultProject||{}).ObjectID;
				var workspaceOid = (response.data.UserProfile.DefaultWorkspace||{}).ObjectID;
				return {
					projectOid: projectOid 
					,workspaceOid: workspaceOid
				};
			});
		};

		exports.fetchProjects = function(){
			var deferred = $q.defer();
			getAlmWorkspaceByName().then(function(workspace){
				var params = {
					order: 'Name',
					fetch: 'ObjectID,Name',
					workspace: '/workspace/'+ workspace.ObjectID,
					pageSize: 200,
				}
				return almGet('project', {params: params});
			}).then(function (response){
				// create results handler
				var totalRecords = response.data.QueryResult.TotalResultCount,
					localProjects = [];
				var resultsHandler = function(response) {
					angular.forEach(response.data.QueryResult.Results, function(project) {
						localProjects.push(project);
					});
					if (localProjects.length === totalRecords) {
						deferred.resolve( localProjects );
					}
				};
				resultsHandler(response);

				// fetch additional projects
				if (totalRecords > 200) {
					var iterations = Math.floor(totalRecords/200);
					for (var i = iterations; i > 0; i--) {
						var paramsClone = {
							start: 200*i+1,
						};
						angular.extend(paramsClone, params);
						almGet('project', {params: paramsClone}).then(resultsHandler);
					};
				}
			});
			return deferred.promise;
		};

		exports.fetchTypeDefSchemaByName = function(artifactType) {
			var promise = getAlmWorkspaceByName().then(function(workspace){
				return almGet(schemaBaseUrl+'workspace/' + workspace.ObjectID + '/' + workspace.SchemaVersion);
			}).then(function(response){
				return response.data.QueryResult.Results.filter(function(v){
					return v.ElementName === artifactType;
				})[0];
			});
			return promise;
		};

		exports.createArtifact = function(projectOid, typeDef, artifact) {
			var url = typeDef+'/create';
			var artifactBody = {}
			artifact.Project = '/project/' + projectOid;
			artifactBody[typeDef] = artifact;
			return almPost(url, artifactBody);
		};

		return exports;
	};
})();