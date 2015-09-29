var case2rally = function(config) {
			
	var userDefaults = {};
	var workspaceCache = [];
	var projectCache = {};
	var typeDefinitions = [];

	var parseOidFromUrl = function(url) {
		return url.substring(url.lastIndexOf('/')+1);
	}

	var almGet = function(url, success) {
		var ajaxConfig = buildAjaxConfig('GET', url, success);
		j$.ajax(ajaxConfig);
	}

	var buildAjaxConfig = function(method, url, success) {
		var ajaxConfig = {
		  type: method,
		  url: config.almBaseUrl+url,
		  success: success
		};
		if (config.jsonp) {
			ajaxConfig.dataType = 'jsonp';
			ajaxConfig.jsonp = 'jsonp';
		} else {
			ajaxConfig.dataType = 'json';
			headers = {zsessionid: config.apiKey};
		}
		return ajaxConfig;
	}

	// load user defaults for workspace oid and project oid
	// cache results in userDefaults
	var getUserDefaults = function(callback) {
		if (userDefaults.workspaceOid === undefined) {
			almGet('user:current', function(data) {
				var partialUrl = data.User.UserProfile._ref.replace(config.almBaseUrl,'');
				almGet(partialUrl, function(data) {
					var projectOid = parseOidFromUrl( data.UserProfile.DefaultProject._ref );
					var workspaceOid = parseOidFromUrl( data.UserProfile.DefaultWorkspace._ref );
					userDefaults = {
						projectOid: projectOid 
						,workspaceOid: workspaceOid
					};
					callback(userDefaults);
				})
			})
		} else {
			callback(userDefaults);
		}
	}

	// load all workspaces
	// cache results in workspaceCache
	var getAlmWorkspaces = function(callback) {
		if(workspaceCache.length == 0) {
			var url = 'workspace?workspace=null&order=Name';
			almGet(url,function(data) {
				var results = data.QueryResult.Results;
				j$.each(results, function(k, v) {
					var name = v._refObjectName;
					var oid = parseOidFromUrl( v._ref );
					workspaceCache.push({'name':name, 'oid':oid})
				})
				callback(workspaceCache);
			});
		} else {
			callback(workspaceCache);
		}
	}

	// load all projects for the specified workspace
	// cache results in projectCache
	var getAlmProjects = function(workspaceOid, callback) {
		var localProjects = projectCache[workspaceOid];
		if(localProjects === undefined) {
			localProjects = [];
			projectCache[workspaceOid] = localProjects;

			var urlBase = 'workspace/'+workspaceOid+'/projects?order=Name';
			if (config.jsonp) {
				urlBase = 'projects?workspace=/workspace/'+workspaceOid+'&order=Name';
			}
			almGet(urlBase+'&pagesize=200', function(data) {

				// create results handler
				var totalRecords = data.QueryResult.TotalResultCount;
				var resultsHandler = function(data) {
					j$.each(data.QueryResult.Results, function(k,v) {
						var name = v._refObjectName;
						var oid = parseOidFromUrl( v._ref );
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
						almGet(urlBase+'&start='+start+'&pagesize=200', resultsHandler);
					};
				}
			})
		} else {
			callback(localProjects);
		}
	}

	var getAlmTypeDefinitions = function(workpaceOid, callback) {
		if (typeDefinitions.length == 0) {
			var url = 'workspace/'+workpaceOid+'/typedefinitions&order=Name&pagesize=200';
			if (config.jsonp) {
				url = 'typedefinitions?workspace=/workspace/'+workpaceOid+'&order=Name&pagesize=200';
			}
			almGet(url, function(data) {
				var results = data.QueryResult.Results;
				j$.each(results, function(k, v) {
					var name = v._refObjectName;
					if (name == 'Hierarchical Requirement') {
						name = 'User Story';
					}
					var oid = parseOidFromUrl( v._ref );
					if (name == 'User Story' || name == 'Defect') {
						typeDefinitions.push({'name':name, 'oid':oid});
					}
				})
				callback(typeDefinitions);
			});
		} else {
			callback(typeDefinitions);
		}
	}

	

	return {
		getAlmWorkspaces : getAlmWorkspaces
		,getAlmProjects : getAlmProjects
		,getUserDefaults : getUserDefaults
		,getAlmTypeDefinitions : getAlmTypeDefinitions
	};

};