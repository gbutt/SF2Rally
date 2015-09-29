var case2rally = function(config) {

	var almGetCallCache = {};

	var parseOidFromUrl = function(url) {
		return url.substring(url.lastIndexOf('/')+1);
	}

	var almGet = function(url, success) {
		var	requestUrl = (url.substring(0,4) === 'http') ? url : config.almBaseUrl+url,
			ajaxConfig = buildAjaxConfig('GET', requestUrl, success);
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
			  success: function(data){
			  	almGetCallCache[url] = data;
			  	success(data);
			  },
			  dataType : 'json',
			  headers : {zsessionid: config.apiKey}
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
	var getAlmWorkspaces = function(callback) {
		var url = 'workspace?workspace=null&order=Name&fetch=ObjectID';
		almGet(url,function(data) {
			var results = data.QueryResult.Results, 
				workspaceCache = [];
			j$.each(results, function(k, v) {
				var name = v._refObjectName;
				var oid = v.ObjectID;
				workspaceCache.push({'name':name, 'oid':oid})
			})
			callback(workspaceCache);
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

	var getAlmTypeDefinitions = function(workpaceOid, callback) {
		var	url = 'typedefinition?workspace=/workspace/'+workpaceOid+'&order=Name&pagesize=200&fetch=ObjectID&query=((Name = "Defect") OR (Name = "Hierarchical Requirement"))';
		almGet(url, function(data) {
			var results = data.QueryResult.Results,
				typeDefinitions = [];
			j$.each(results, function(k, v) {
				var name = v._refObjectName;
				if (name == 'Hierarchical Requirement') {
					name = 'User Story';
				}
				var oid = v.ObjectID;
				if (name == 'User Story' || name == 'Defect') {
					typeDefinitions.push({'name':name, 'oid':oid});
				}
			})
			callback(typeDefinitions);
		});
	}

	

	return {
		getAlmWorkspaces : getAlmWorkspaces
		,getAlmProjects : getAlmProjects
		,getUserDefaults : getUserDefaults
		,getAlmTypeDefinitions : getAlmTypeDefinitions
	};

};