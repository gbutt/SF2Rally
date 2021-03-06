var almClient = function(config) {

	var almGetCallCache = {};

	var parseOidFromUrl = function(url) {
		return url.substring(url.lastIndexOf('/')+1);
	}

	var almPost = function(url, dataObject, success) {
		var	requestUrl = (url.substring(0,4) === 'http') ? url : config.almBaseUrl+url;
		var ajaxConfig = buildAjaxConfig('POST', requestUrl, success);
		ajaxConfig.data = JSON.stringify(dataObject);
		ajaxConfig.contentType = 'application/json';

		j$.ajax(ajaxConfig);
	}

	var almGet = function(url, success) {
		var	requestUrl = (url.substring(0,4) === 'http') ? url : config.almBaseUrl+url;
		var ajaxConfig = buildAjaxConfig('GET', requestUrl, function(data) {
		  	almGetCallCache[url] = data;
		  	success(data);
	  	});

		if (almGetCallCache[requestUrl]){
		 	success( almGetCallCache[requestUrl] );
		} else {
			j$.ajax(ajaxConfig);
		}
	}

	var buildAjaxConfig = function(method, url, success) {
		return {
			  type: method,
			  url: url,
			  dataType : 'json',
			  headers : {zsessionid: config.apiKey},
			  success: success
			};	
	}

	// load user defaults for workspace oid and project oid
	// cache results in userDefaults
	var getUserDefaults = function(callback) {
		almGet('user:current', function(data) {
			var partialUrl = data.User.UserProfile._ref+'?fetch=ObjectID,DefaultProject,DefaultWorkspace';
			almGet(partialUrl, function(data) {
				var projectOid = data.UserProfile.DefaultProject.ObjectID;
				var workspaceOid = data.UserProfile.DefaultWorkspace.ObjectID;

				var userDefaults = {
					projectOid: projectOid 
					,workspaceOid: workspaceOid
				};
				callback(userDefaults);
			})
		});
	}

	// load all workspaces
	// cache results in workspaceCache
	var getAlmWorkspaces = function(success) {
		var url = 'workspace?workspace=null&order=Name&fetch=ObjectID';
		almGet(url,function(data) {
			var results = data.QueryResult.Results, 
				workspaceCache = [];
			j$.each(results, function(k, v) {
				var name = v._refObjectName;
				var oid = v.ObjectID;
				workspaceCache.push({'name':name, 'oid':oid})
			})
			success(workspaceCache);
		});
	}

	var getAlmWorkspaceByName = function(workspaceName, success) {
		var url = 'workspace?workspace=null&query=(Name = "'+workspaceName+'")&fetch=ObjectID,SchemaVersion';
		almGet(url,function(data) {
			var results = data.QueryResult.Results;
			if (results.length !== 1) {
				throw "Bad workspace name";
			}

			success(results[0]);
		});
	}

	// load all projects for the specified workspace
	// cache results in projectCache
	var getAlmProjects = function(workspaceOid, callback) {			
		var	urlBase = 'project?workspace=/workspace/'+workspaceOid+'&order=Name&fetch=ObjectID';
		almGet(urlBase+'&pagesize=200', function(data) {

			// create results handler
			var totalRecords = data.QueryResult.TotalResultCount,
				localProjects = [];
			var resultsHandler = function(data) {
				j$.each(data.QueryResult.Results, function(k,v) {
					var name = v._refObjectName;
					var oid = v.ObjectID;
					localProjects.push({'name':name, 'oid':oid})
				});
				// issue callback once we have all projects
				if (localProjects.length >= totalRecords) {
					callback(localProjects);
				}
			};
			resultsHandler(data);

			// fetch additional projects
			if (totalRecords > 200) {
				var iterations = Math.floor(totalRecords/200);
				for (var i = iterations; i > 0; i--) {
					var start = 200*i+1;
					almGet(urlBase+'&start='+start+'&pagesize=200&fetch=ObjectID', resultsHandler);
				};
			}
		})
	}

	var getTypeDefByName = function(workspaceName, typeElementName, success){
		getAlmWorkspaceByName(workspaceName, function(workspace){
			almGet('https://rally1.rallydev.com/slm/schema/v2.0/workspace/' + workspace.ObjectID + '/' + workspace.SchemaVersion, function(data){
				j$.each(data.QueryResult.Results, function(key, val){
					if (val.ElementName === typeElementName){
						success(val);
					}
				});
			});
		});
	}

	var createArtifact = function(projectOid, typeDef, artifact, callback) {
		var url = typeDef+'/create';
		var artifactBody = {}
		artifact.Project = '/project/' + projectOid;
		artifactBody[typeDef] = artifact;
		almPost(url, artifactBody, callback);
	}

	var buildExpression = function(oids){
		var expression = "";
		j$.each(oids, function(key, val){
			var newExp = '(ObjectID = ' + val + ')';
			if (key > 0){
				newExp = '(' + expression + ' OR ' + newExp + ')';
			}
			expression = newExp;
		});
		return expression;
	}
	
	var fetchArtifacts = function(oidArray, workspaceOid, success){
		almGet('artifact?types=Defect,HierarchicalRequirement&fetch=Name,Owner,DisplayName,Project,State,ScheduleState,Discussion,Attachments,ObjectID&workspace=/workspace/'+ workspaceOid + '&pagesize=200&query=' + buildExpression(oidArray), function (data){
			var result = {
				rallyDefects: [],
				rallyStories: []
			};
			j$.each(data.QueryResult.Results, function(key, value){
				if (value._type === 'Defect'){
					result.rallyDefects.push(value);
				} else {
					result.rallyStories.push(value);
				}
			});
			success(result);
		});
	}

	return {
		getAlmWorkspaces : getAlmWorkspaces
		,getAlmWorkspaceByName : getAlmWorkspaceByName
		,getAlmProjects : getAlmProjects
		,getUserDefaults : getUserDefaults
		,createArtifact : createArtifact
		,fetchArtifacts : fetchArtifacts
		,parseOidFromUrl : parseOidFromUrl
		,getTypeDefByName : getTypeDefByName
	};

};