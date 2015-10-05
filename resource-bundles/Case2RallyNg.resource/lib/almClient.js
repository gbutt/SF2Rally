var almClient = function(config, $http, angular, $q) {
	var rallyUrl = config.rallyUrl,
		apiKey = config.apiKey
		wsapiVersion = config.wsapiVersion,
		wsapiBaseUrl = rallyUrl+'/slm/webservice/'+wsapiVersion+'/',
		schemaBaseUrl = rallyUrl+'/slm/schema/'+wsapiVersion+'/',
		workspace = {Name: config.workspaceName}
	;

	var parseOidFromUrl = function(url) {
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
		var promise = almGet(url, {params: params}).
			then(function(response) {
				var results = response.data.QueryResult.Results;
				if (results.length !== 1) {
					throw "Bad workspace name";
				}
				workspace = results[0];
				return workspace;
			});
		return promise;
	};

	var fetchArtifacts = function(oids){
		var promise = getAlmWorkspaceByName().then(function(workspace){
			var url = 'artifact';
			var params = {
				types:'Defect,HierarchicalRequirement',
				fetch:'Name,Owner,DisplayName,Project,State,ScheduleState,Discussion,Attachments,ObjectID',
				workspace:'/workspace/'+workspace.ObjectID,
				pagesize:200,
				query:buildOidQuery(oids),
			};
			return almGet(url, {params: params, cache: false}).then(function(response) {
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
		});
		return promise;
	};

	var fetchUserDefaults = function(){
		var promise = getAlmWorkspaceByName().then(function(workspace){
			var url = 'user:current';
			var params = {
				workspace: '/workspace/'+workspace.ObjectID
			}
			return almGet(url, {params: params}).then(function(response) {
				var url = response.data.User.UserProfile._ref;
				var params = {
					fetch:'ObjectID,DefaultProject,DefaultWorkspace'
				}
				return almGet(url, {params:params}).then(function(response) {
					var projectOid = response.data.UserProfile.DefaultProject.ObjectID;
					var workspaceOid = response.data.UserProfile.DefaultWorkspace.ObjectID;
					return {
						projectOid: projectOid 
						,workspaceOid: workspaceOid
					};
				});
			});
		});
		return promise;
	};

	var fetchProjects = function(){
		var deferred = $q.defer();
		var promise = getAlmWorkspaceByName().then(function(workspace){
			var params = {
				order: 'Name',
				fetch: 'ObjectID,Name',
				workspace: '/workspace/'+ workspace.ObjectID,
				pageSize: 200,
			}
			return almGet('project', {params: params}).then(function (response){
				// create results handler
				var totalRecords = response.data.QueryResult.TotalResultCount,
					localProjects = [];
				var resultsHandler = function(response) {
					angular.forEach(response.data.QueryResult.Results, function(project) {
						localProjects.push(project)
					});
				};
				resultsHandler(response);

				// fetch additional projects
				if (totalRecords > 200) {
					var iterations = Math.floor(totalRecords/200);
					var promiseArray = [];
					for (var i = iterations; i > 0; i--) {
						var paramsClone = {
							start: 200*i+1,
						};
						angular.extend(paramsClone, params);
						promiseArray.push(
							almGet('project', {params: paramsClone}).then(resultsHandler)
						);
					};
					return $q.all(promiseArray).then(function(){
						deferred.resolve( localProjects );
					})
				} else {
					deferred.resolve( localProjects );
				}
			});
		});
		return deferred.promise;
	};

	var createArtifact = function(projectOid, typeDef, artifact) {
		var url = typeDef+'/create';
		var artifactBody = {}
		artifact.Project = '/project/' + projectOid;
		artifactBody[typeDef] = artifact;
		return almPost(url, artifactBody);
	};

	return {
		fetchArtifacts: fetchArtifacts,
		parseOidFromUrl: parseOidFromUrl,
		fetchUserDefaults: fetchUserDefaults,
		fetchProjects: fetchProjects,
		createArtifact: createArtifact,
	};
};