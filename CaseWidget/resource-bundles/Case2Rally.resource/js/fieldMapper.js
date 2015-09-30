// requires jquery

/* (c) 2009-2014 Rally Software Development Corp. All rights reserved. */
var rally;

/* check to see if rally was created by something else */
if (!rally) {
  rally = {};
}

rally.user_refs = {};

/* initialize rally javascript for dealing with Rally connections */
rally.init = function () {
  rally.getRallyConnectionInformation();
};

rally.protocol_version = 'v2.0';    // Number based version
rally.rsc_version = "2014.02";      // Date based version
rally.pageSize = 200;

rally.AFFECTED_CUST_LEN = 32768;

/* connection properties for making REST calls to Rally
 with URL sugar for building Rally URLs */
// rally.username = "";
// rally.password = "";
rally.baseUrl = "";
rally.workspace = "";
rally.webserviceUrl = "";
rally.detailUrl = "";
rally.allowRequirements = "";

rally.almGetCallCache = {};
rally.almGet = function(url, success, failure, sync) {
    var requestUrl = url,
      ajaxConfig = rally.buildAjaxConfig('GET', requestUrl, success, failure, sync);
    if (rally.almGetCallCache[requestUrl]){
      success( rally.almGetCallCache[requestUrl] );
    } else {
      j$.ajax(ajaxConfig);  
    }
  }

rally.buildAjaxConfig = function(method, url, success, failure, sync) {
  return {
      type: method,
      url: url,
      success: function(data){
        rally.almGetCallCache[url] = data;
        success(data);
      },
      failure: failure,
      dataType : 'json',
      // headers : {zsessionid: rally.apiKey}
      headers : rally.requestHeader,
      async : !sync
    };  
}

/* fetch rally connection information from Rally Setup object */
rally.getRallyConnectionInformation = function () {

  var exception_message =
    "The Rally Support Manager is not fully configured. " +
    "Please contact your Salesforce administrator and confirm you have a RSM Setup object created.";
  // rally.username = '';
  // rally.password = '';
  rally.baseUrl = 'https://rally1.rallydev.com';
  rally.workspace = 'Rally';
  rally.webserviceUrl = rally.baseUrl + ':443/slm/webservice/' + rally.protocol_version;
  rally.schemaUrl = rally.baseUrl + ':443/slm/schema/' + rally.protocol_version;
  rally.detailUrl = rally.baseUrl + '/slm/detail';
  // if ((rally.username.length == 0) || (rally.password.length == 0) || (rally.baseUrl.length == 0)) {
  //   throw(exception_message);
  // }
  rally.allowRequirements = '';

  var rallyInfo = sforce.connection.query(
    "select rallyUrl__c, Name," +
      "Allow_Requirements__c from Case2Rally_Setup__c order by Name Asc"
  );
  var rallyRecords = rallyInfo.getArray("records");
  var exception_message =
    "The Rally Support Manager is not fully configured. " +
      "Please contact your Salesforce administrator and confirm you have a RSM Setup object created.";

  if (rallyRecords.length > 0) {
    rally.baseUrl = rallyRecords[0].rallyUrl__c;
    rally.workspace = rallyRecords[0].Name;
    rally.webserviceUrl = rally.baseUrl + ':443/slm/webservice/' + rally.protocol_version;
    rally.detailUrl = rally.baseUrl + '/slm/detail';
    if (rally.baseUrl.length == 0) {
      throw(exception_message);
    }
    rally.allowRequirements = rallyRecords[0].Allow_Requirements__c;
  }
  else {
    throw(exception_message);
  }
};

rally.getSFUserInfo = function () {
  var user = sforce.connection.getUserInfo();
  return(user);
};

/* Connection utilities */
rally.requestHeader = {};
rally.authStr = "";

/* this function relies on sforce being around. This adds a header to the
 remoteFunction call as Rally uses Basic Authentication mechanisms.
 */
rally.basicAuthenticationString = function () {
  if (rally.authStr.length > 0) {
    return(rally.authStr);
  }
  var b64Str = new sforce.Base64Binary(rally.username + ':' + rally.password);
  rally.authStr = "Basic " + b64Str.toString();
  return(rally.authStr);
};

rally.agentHeader = function (operation, qryEncode) {
  // var authStr = rally.basicAuthenticationString();
  // var user = rally.getSFUserInfo();
  // var userInfo = user.userName + ":" + user.userEmail + ":" + user.organizationName + ":" + user.organizationId +
  //   ":" + user.userType + ":" + user.profileId;
  var encoding = "text/javascript";
  if (qryEncode) {
    encoding = "application/x-www-form-urlencoded";
  }
  rally.requestHeader =
  {
    // "Authorization": authStr,
    
    "Content-Type": encoding,
    "X-RallyIntegrationName": "Rally Support Manager",
    "X-RallyIntegrationVersion": rally.rsc_version,
    "X-RallyIntegrationVendor": "Rally Software",
    // "X-RallyIntegrationOS": "SalesForce",
    // "X-RallyIntegrationPlatform": userInfo,
    "X-RallyIntegrationLibrary": operation,
    "zsessionid": rally.apiKey
  };
};

/* Determine type of artifact based on its ref */
rally.getArtifactType = function (ref) {
  var type = "";
  var re = /(\w+)\/[\d\-]+(.js)*$/;
  var arr = ref.match(re);
  if (arr.length > 1) {
    type = arr[1];
  }
  return(type);
};

/* get the oid from an artifact ref) */
rally.getArtifactOid = function (ref) {
  var oid = "";
  var re = /\w+\/([\d\-]+)(.js)*$/;
  var arr = ref.match(re);
  if (arr.length > 1) {
    oid = arr[1];
  }
  return(oid);
};

/* inject content presumable into a div identified by injectTag */
rally.injectContent = function (injectTag, content) {
  var injectPt = document.getElementById(injectTag);
  injectPt.innerHTML = content;
};

rally.workspaceRef = "";
rally.getWorkspaceOid = function (name) {
  rally.getWorkspaceOid.WSName = name;
  rally.agentHeader("Find Workspace");

  var onSuccess = function(data) {
    rally.workspaceRef = data.QueryResult.Results[0]._ref;
    rally.workspaceOid = data.QueryResult.Results[0].ObjectID;
    rally.workspaceSchemaVersion = data.QueryResult.Results[0].SchemaVersion;
  };
  var onFailure = function(data) {
    console.log(data);
  };
  rally.almGet(rally.webserviceUrl + '/workspace?fetch=ObjectID,SchemaVersion', onSuccess, onFailure, true);
  //rally.almGet(rally.webserviceUrl + '/workspace?query=(Name = "' + name + '")&fetch=true', onSuccess, onFailure)

  // sforce.connection.remoteFunction({
  //     url: rally.webserviceUrl + "/subscription.js?query=&fetch=true",
  //     method: 'GET',
  //     requestHeaders: rally.requestHeader,
  //     async: false,
  //     onSuccess: rally.getWorkspaceOid.successResponse,
  //     onFailure: rally.getWorkspaceOid.failureResponse }
  // );
};

// rally.getWorkspaceOid.successResponse = function (response) {
//   var jsResponse = YAHOO.lang.JSON.parse(response);
//   var projectNode = "";
//   docStr = rally.getWorkspaceOid.checkResponseErrors(jsResponse);

//   if (docStr.length > 0) {
//     alert("Error retrieving Workspace data: " + docStr);
//     return;
//   }

//   rally.workspaceRef = "";
//   var workspaces = jsResponse.QueryResult.Results[0].Workspaces;
//   for (var i = 0; i < workspaces.length; i++) {
//     if (workspaces[i]._refObjectName == rally.getWorkspaceOid.WSName) {
//       rally.workspaceRef = workspaces[i]._ref;
//     }
//   }
//   if (rally.workspaceRef.length == 0) {
//     alert("Error: Workspace " + rally.workspace + " does not exist.");

//   }

// };

rally.getWorkspaceOid.checkResponseErrors = function (jsResponse) {
  var data = "";
  if (jsResponse.QueryResult.Errors.length > 0) {
    data = jsResponse.QueryResult.Errors[0];
  }
  if (jsResponse.QueryResult.Results.length == 0) {
    data = "Workspace " + rally.workspace + " is not a valid Rally Workspace";
  }
  return data;
};

rally.getWorkspaceOid.failureResponse = function (response, request) {
  rally.genericFailureHandler(response, request);
  rally.exit();
};

rally.projectTree = "";
rally.getProjectTree = function (workspaceRef) {
  rally.agentHeader("Project Tree");

  var total_results = 0;
  var current_record_count = 0;
  var start_record = 1;

  var successResponse = function(response) {
    var jsResponse = YAHOO.lang.JSON.parse(response);
    var docStr = "";

    docStr = checkResponseErrors(jsResponse);
    if (docStr.length > 0) {
      alert("Error retrieving Workspace data: " + docStr.toString());
      return;
    }
    if (rally.projectTree === "" ) {
      rally.projectTree = jsResponse.QueryResult;
      total_results = jsResponse.QueryResult.TotalResultCount;
    }
    else {
      var new_array = rally.projectTree.Results.concat(jsResponse.QueryResult.Results);
      rally.projectTree.Results = new_array;
    }
    current_record_count += jsResponse.QueryResult.Results.length;
  };

  var checkResponseErrors = function(jsResponse) {
    var data = "";
    if (jsResponse.QueryResult.Errors.length > 0) {
      data = jsResponse.QueryResult.Errors[0];
    }
    return data;
  };

  var failureResponse = function(response, request) {
    rally.genericFailureHandler(response, request);
    rally.exit();
  };

  do {
    sforce.connection.remoteFunction({
        url: rally.webserviceUrl + '/project.js?query=' + escape('(State+=+"Open")') + '&workspace=' + escape(workspaceRef) + "&fetch=false&order=Name&pagesize=" + rally.pageSize + "&start=" + start_record,
        method: 'GET',
        requestHeaders: rally.requestHeader,
        async: false,
        onSuccess: successResponse,
        onFailure: failureResponse }
    );
    start_record = current_record_count + 1;
  }
  while (current_record_count < total_results);
};

rally.getProjectTree.successResponse = function (response) {
  var jsResponse = YAHOO.lang.JSON.parse(response);
  var docStr = "";
  var projectNode = "";

  docStr = rally.getProjectTree.checkResponseErrors(jsResponse);
  if (docStr.length > 0) {
    alert("Error retrieving Workspace data: " + docStr.toString());
    return;
  }
  rally.projectTree = jsResponse.QueryResult;
};

rally.getProjectTree.checkResponseErrors = function (jsResponse) {
  var data = "";
  if (jsResponse.QueryResult.Errors.length > 0) {
    data = jsResponse.QueryResult.Errors[0];
  }
  return data;
};

rally.getProjectTree.failureResponse = function (response, request) {
  rally.genericFailureHandler(response, request);
  rally.exit();
};

rally.getProjectTree.render = function () {
  var project = rally.rsc.getCookie(rally.rsc.projectCookie);
  window.console && console.log(" -- project from cookie", project );
  
  //var contentStr = '<select name="project" onChange="rally.getProjectTree.setCookie()">';
  var contentStr = '<select name="project" onChange="rally.getProjectTree.getReleases()">';

  for (var i = 0; i < rally.projectTree.Results.length; i++) {
    var selected = "";
    if (project == rally.projectTree.Results[i]._ref) {
      selected = "selected";
    }
    contentStr += '<option value="' + rally.projectTree.Results[i]._ref + '" ' + selected + '>&nbsp;&nbsp;' +
      rally.projectTree.Results[i]._refObjectName + '</option>';
  }
  contentStr += '</select>';
  if ( project === null ) { project = rally.projectTree.Results[0]._ref; }
  window.console && console.log(" -- project before releases is ", project);
  
  rally.getProjectTree.getReleases(project);
  return(contentStr);
};

rally.getProjectTree.setCookie = function () {
  var project = document.forms[0].project;
  var selection = project.options[project.selectedIndex].value;
  rally.rsc.setCookie(rally.rsc.projectCookie, selection);
};
/* find the releases every time a project is chosen */
rally.releases = {};
rally.getProjectTree.getReleases = function (projectRef) {
  window.console && console.log("rally.getReleases");
  rally.releases = {};
  if (!projectRef && document.forms[0]) {
    var project = document.forms[0].project;
    projectRef = project.options[project.selectedIndex].value;
  }
window.console && console.log(" -- project dropdown is ", project );
window.console && console.log(" -- selected project ref is ", projectRef );
  var type = "Release";

  rally.agentHeader("Name Search: " + type);
  var url = rally.webserviceUrl + '/' + type + '.js?workspace=' + escape(rally.workspaceRef) +
      "&project=" + escape(projectRef) +
      "&projectScopeDown=false&fetch=Project,Name&order=Name&pagesize=" + 
      rally.pageSize;
  
  window.console && console.log( "-- release query url: ", url );
  sforce.connection.remoteFunction({
      url: url,
      method: 'GET',
      requestHeaders: rally.requestHeader,
      async: true,
      onSuccess: rally.getProjectTree.getReleases.successResponse,
      onFailure: rally.getProjectTree.getReleases.failureResponse }
  );
};

rally.getProjectTree.getReleases.successResponse = function (response) {
  var jsResponse = YAHOO.lang.JSON.parse(response);
  var docStr = "";

  var docStr = rally.getProjectTree.getReleases.checkResponseErrors(jsResponse);

  if (docStr.length > 0) {
    alert("Error retrieving item data: " + docStr.toString());
    return;
  }

  window.console && console.log("-- release query response", jsResponse.QueryResult);
  var results = jsResponse.QueryResult.Results;
  if (results && results.length > 0) {
    for (var i = 0; i < results.length; i++) {
      rally.releases[results[i]._refObjectName] = results[i];
    }
  }
  window.console && console.log("-- available releases", rally.releases);
  rally.getProjectTree.setCookie();
};

rally.getProjectTree.getReleases.checkResponseErrors = function (jsResponse) {
  var data = "";
  if (jsResponse.QueryResult.Errors.length > 0) {
    data = jsResponse.QueryResult.Errors[0];
  }
  return data;
};

rally.getProjectTree.getReleases.failureResponse = function (response, request) {
  rally.genericFailureHandler(response, request);
  rally.exit();
};
/* end */

/* get users */
rally.getUsers = function() {
  window.console && console.log("rally.getUsers");
  rally.users = {}; // key will be username
  var type = "User";
  var us_field_map = new rally.usfm().fm;
  var d_field_map = new rally.dfm().fm;
  
  var default_story_owner_name = us_field_map.lookupArtifactFieldLiteral("Owner");
  var default_defect_owner_name = d_field_map.lookupArtifactFieldLiteral("Owner");

    window.console && console.log("default owners", default_story_owner_name, default_defect_owner_name);
    var query = '( ( UserName = "' + default_story_owner_name + '" ) OR ( UserName = "' + default_defect_owner_name + '" ) )';
    window.console && console.log("query", query);
    
  rally.agentHeader("UserSearch" + type);
  sforce.connection.remoteFunction({
        url: rally.webserviceUrl + '/' + type + '.js?workspace=' + escape(rally.workspaceRef) + "&order=UserName&pagesize=" + rally.pageSize + "&fetch=UserName&query=" + escape(query),
        method: 'GET',
        requestHeaders: rally.requestHeader,
        async: true,
        onSuccess: rally.getUsers.successResponse,
        onFailure: rally.getUsers.failureResponse
  });
};

rally.getUsers.successResponse = function (response) {
  var jsResponse = YAHOO.lang.JSON.parse(response);
  docStr = rally.getUsers.checkResponseErrors(jsResponse);

    if (docStr.length > 0) {
        alert("Error retrieving User data: " + docStr);
        return;
    }

    var results = jsResponse.QueryResult.Results;
    for (var i=0; i<results.length; i++ ) {
      window.console && console.log( "user result", results[i], results[i].UserName, results[i]._ref );
      rally.user_refs[results[i].UserName] = results[i]._ref;
    }
};
  
rally.getUsers.checkResponseErrors = function (response) {
    var data = "";
  try {
      data = response.OperationResult.Errors[0];
  } catch (ex) {
      return(data);
  }
  return data;
};

/* artifact properties for getArtifact */
rally.artifactID = "";
rally.artifactName = "";
rally.artifactDescription = "";
rally.artifactState = "";
rally.artifactRelease = "";
rally.artifactWorkspace = "";
rally.artifactProject = "";
rally.artifactOwner = "";
rally.artifactCaseID = "";

/* these attributes are for defects only */
rally.defectState = "";
rally.defectPriority = "";
rally.defectSeverity = "";
rally.defectResolution = "";

/* get a single Rally Artifact Information */
rally.getArtifact = function (oid) {
  rally.agentHeader("getArtifact");
  var pattern = new RegExp(/.js$/);
  if (!pattern.test(oid)) {
    oid += ".js";
  }
  sforce.connection.remoteFunction({
      url: oid + '?fetch=true',
      method: 'GET',
      requestHeaders: rally.requestHeader,
      async: false,
      onSuccess: rally.getArtifact.successResponse,
      onFailure: rally.getArtifact.failureResponse }
  );
};

rally.getArtifact.successResponse = function (response) {
  var jsResponse = YAHOO.lang.JSON.parse(response);
  var docStr = "";
  var base = "";
  var baseElement;

  try {
    docStr = rally.getArtifact.checkResponseErrors(jsResponse);
  }
  catch (ex) {
    throw(ex);
  }

  if (docStr.length > 0) {
    alert(docStr);
    throw(docStr);
  }

  try {
    baseElement = jsResponse.HierarchicalRequirement;
  }
  catch (ex) {
    baseElement = jsResponse.Defect;
  }

  if (baseElement == undefined) {
    baseElement = jsResponse.Defect;
  }

  rally.artifactID = baseElement.FormattedID;
  rally.artifactName = baseElement.Name;
  rally.artifactDescription = baseElement.Description;
  rally.artifactState = baseElement.ScheduleState;
  rally.artifactOwner = baseElement.Owner;
  if (baseElement.SalesforceCase) {
    rally.artifactCaseID = baseElement.SalesforceCase.LinkID;
  }

  try {
    rally.artifactRelease = baseElement.Release._refObjectName;
  }
  catch (ex) {
    rally.artifactRelease = "Unscheduled";
  }

  try {
    rally.artifactWorkspace = baseElement.Workspace._refObjectName;
  }
  catch (ex) {
    rally.artifactWorkspace = "None";
  }

  try {
    rally.artifactProject = baseElement.Project._refObjectName;
  }
  catch (ex) {
    rally.artifactProject = "Parent Project";
  }

  rally.defectState = baseElement.State;
  rally.defectResolution = baseElement.Resolution;
  rally.defectPriority = baseElement.Priority;
  rally.defectSeverity = baseElement.Severity;
};

rally.getArtifact.checkResponseErrors = function (response) {
  var data = "";
  try {
    data = response.OperationResult.Errors[0];
  }
  catch (ex) {
    return(data);
  }
  return data;
};

rally.getArtifact.failureResponse = function (response, request) {
  rally.genericFailureHandler(response, request);
};

/* Get all rally artifacts that match the criteria */
rally.getRallyArtifacts = function (project, keywords, artifactType, artifactSearchType, start, pageSize) {
  var queryStr = rally.getRallyArtifacts.buildQuery(trim(keywords), artifactSearchType);
  var newStr = "";
  switch (artifactType) {
    case "defect":
    {
      queryStr = rally.getRallyArtifacts.cleanQuery(queryStr);
      rally.getDefects(queryStr, start, pageSize, project);
      break;
    }
    case "defect_state":
    {
      queryStr = rally.getRallyArtifacts.addState(queryStr);
      queryStr = rally.getRallyArtifacts.cleanQuery(queryStr);
      rally.getDefects(queryStr, start, pageSize, project);
      break;
    }
    case "userstory":
    {
      queryStr = rally.getRallyArtifacts.cleanQuery(queryStr);
      rally.getRequirements(queryStr, start, pageSize, project);
      break;
    }
  }
};

/* build xml query based on criteria */
rally.getRallyArtifacts.buildQuery = function (keywords, searchType) {
  var queryStr = "";
  var newStr = "";

  // Keep people from trying to use wildcards in criteria
  var scratch_keywords = keywords.replace(/\%/g, "");
  switch (searchType) {
    case "name":
    {
      if (scratch_keywords.length > 0) {
        var wordArr = scratch_keywords.split(" ");
        if (wordArr.length > 1) {
          queryStr = "(";
        }
        for (var i = 0; i < wordArr.length; i++) {
          if (i > 1) {
            newStr = "(" + queryStr + ")";
            queryStr = newStr;
          }
          if (i != 0) {
            queryStr += " and ";
          }
          queryStr += '(Name contains "' + wordArr[i] + '")';
        }
        if (wordArr.length > 1) {
          queryStr += ")";
        }
      }
      break;
    }
    case "name_descript":
    {
      if (scratch_keywords.length > 0) {
        var wordArr = scratch_keywords.split(" ");
        if (wordArr.length > 1) {
          queryStr = "(";
        }
        for (var i = 0; i < wordArr.length; i++) {
          if (i > 1) {
            newStr = "(" + queryStr + ")";
            queryStr = newStr;
          }
          if (i != 0) {
            queryStr += " and ";
          }
          queryStr += '(((Name contains "' + wordArr[i] + '") or (Description contains "' + wordArr[i] + '")) or (Notes contains "' + wordArr[i] + '"))';
        }
        if (wordArr.length > 1) {
          queryStr += ")";
        }
      }
      break;
    }
    case "id":
    {
      if (scratch_keywords.length > 0) {
        var re = /^(\d+)$/;
        var arr = scratch_keywords.match(re);
        if (arr == null) {
          alert('You can only have digits in the criteria when looking for IDs');
          scratch_keywords = 0;
        }
        queryStr += '(FormattedID = "' + scratch_keywords + '")';
      }
      break;
    }
  }
  return queryStr;
};

rally.getRallyArtifacts.addState = function (queryStr) {
  var newStr = "";
  if (queryStr.length > 0) {
    newStr = "(" + queryStr;
    newStr += ' and (State != "Closed"))';
  }
  else {
    newStr = '(State != "Closed")';
  }
  return(newStr);
};

rally.getRallyArtifacts.cleanQuery = function (queryStr) {
  /* var newStr = queryStr.replace(/ /g,"+"); */
  var newStr = encodeURIComponent(queryStr);
  queryStr = "query=" + newStr;
  return(queryStr);
};

/* common section header used by getDefects and getRequirements. Used in displaying results. */
rally.sectionHeaderContent = function (artifactType) {
  var contentStr = '<table style="font-size: 100%" class="list">\n';
  if (artifactType == "defect") {
    contentStr += '<tr class="headerRow"><th class="actionColumn">Action</th><th>Rally ID</th><th>Name</th><th>Description</th><th>Priority</th><th>Severity</th><th>Defect State</th><th>Resolution</th><th>State</th><th>Release Target</th>';
  }
  else {
    contentStr += '<tr class="headerRow"><th class="actionColumn">Action</th><th>Rally ID</th><th>Name</th><th>Description</th><th>State</th><th>Release Target</th>';
  }
  contentStr += '</tr>\n';
  return(contentStr);
};

/* get all Rally Defects that match criteria */
rally.getDefects = function (queryStr, start, pageSize, project) {
  rally.agentHeader("getDefects");
  sforce.connection.remoteFunction({
      url: rally.webserviceUrl + '/defect.js?' +
        queryStr + '&project=' + escape(project) + '&workspace=' + escape(rally.workspaceRef) + '&order=&start=' + start +
        '&pagesize=' + pageSize + '&fetch=true',
      method: 'GET',
      requestHeaders: rally.requestHeader,
      async: false,
      onSuccess: rally.getDefects.successResponse,
      onFailure: rally.getDefects.failureResponse }
  );
};

rally.getDefects.successResponse = function (response) {
  var jsResponse = YAHOO.lang.JSON.parse(response);
  var docStr = rally.getDefects.checkResponseErrors(jsResponse);

  if (docStr.length > 0) {
    var content = "<pre>" + docStr + "</pre>";
    rally.injectContent("resultsOutput", content);
    return;
  }

  var results = jsResponse.QueryResult.Results;
  var contentStr = rally.sectionHeaderContent();
  if (results.length > 0) {
    for (var i = 0, len = results.length; i < len; i++) {
      var defectOid = results[i].ObjectID;
      var detailUrl = rally.detailUrl + '/df/' + defectOid;

      var artifactID = results[i].FormattedID;
      var artifactName = results[i].Name;
      var artifactDescription = results[i].Description;
      var artifactState = results[i].ScheduleState;
      var artifactRelease = "";

      if (results[i].Release == null) {
        artifactRelease = "Unscheduled";
      }
      else {
        artifactRelease = results[i].Release._refObjectName;
      }

      var ellipsis = "";
      if (artifactDescription.length > 100) {
        ellipsis = "...";
      }

      contentStr += '<tr class="dataRow">\n';
      contentStr += '<td class="actionColumn">' + "<a class='actionLink' href='#' onClick='rally.associateCaseDefect(" + defectOid + ")'>Associate</a></td>\n";
      contentStr += '<td class="dataCell"><a class="actionLink" href="#" onClick="window.open(\'' + detailUrl + '\'); return true;">' + artifactID + "</a></td>\n";
      contentStr += '<td class="dataCell">' + artifactName + '</td>\n';
      contentStr += '<td class="dataCell">' + artifactDescription.substr(0, 100) + ellipsis + '</td>\n';
      contentStr += '<td class="dataCell">' + artifactState + '</td>\n';
      contentStr += '<td class="dataCell">' + artifactRelease + '</td>\n';
      contentStr += "</tr>\n";
    }
    contentStr += "</table>\n";
  }
  else {
    contentStr = "<pre>No match found.</pre>";
  }
  rally.injectContent("resultsOutput", contentStr);
};

rally.getDefects.checkResponseErrors = function (response) {
  var data = "";
  var typ = typeof(response.OperationResult);
  if (typeof(response.OperationResult) == "undefined") {
    return(data);
  }
  if (response.OperationResult.Errors.length > 0) {
    data = response.OperationResult.Errors[0];
  }
  return data;
};

rally.getDefects.failureResponse = function (response, request) {
  var message = rally.genericFailureResponse(response, request, false);
  var content = "<pre>" + message + "</pre>";
  rally.injectContent("resultsOutput", content);
};

/* get all Hierarchical Requirements that match the criteria */
rally.getRequirements = function (queryStr, start, pageSize, project) {
  rally.agentHeader("getRequirements");
  sforce.connection.remoteFunction({
      url: rally.webserviceUrl + '/hierarchicalrequirement.js?' +
        queryStr + '&project=' + escape(project) + '&workspace=' + escape(rally.workspaceRef) + '&order=&start=' + start +
        '&pagesize=' + pageSize + '&fetch=true',
      method: 'GET',
      requestHeaders: rally.requestHeader,
      async: true,
      onSuccess: rally.getRequirements.successResponse,
      onFailure: rally.getRequirements.failureResponse }
  );
};

rally.getRequirements.successResponse = function (response) {
  var jsResponse = YAHOO.lang.JSON.parse(response);
  var docStr = rally.getRequirements.checkResponseErrors(jsResponse);

  if (docStr.length > 0) {
    var content = "<pre>" + docStr + "</pre>";
    rally.injectContent("resultsOutput", content);
    return;
  }

  var results = jsResponse.QueryResult.Results;
  var contentStr = rally.sectionHeaderContent();
  if (results.length > 0) {
    for (var i = 0, len = results.length; i < len; i++) {
      var requirementOid = results[i].ObjectID;
      var detailUrl = rally.detailUrl + '/ar/' + requirementOid;

      var artifactID = results[i].FormattedID;
      var artifactName = results[i].Name;
      var artifactDescription = results[i].Description;
      var artifactState = results[i].ScheduleState;
      var artifactRelease = "";

      if (results[i].Release == null) {
        artifactRelease = "Unscheduled";
      }
      else {
        artifactRelease = results[i].Release._refObjectName;
      }

      var ellipsis = "";
      if (artifactDescription.length > 100) {
        ellipsis = "...";
      }

      contentStr += '<tr class="dataRow">\n';
      contentStr += '<td class="actionColumn">' + "<a class='actionLink' href='#' onClick='rally.associateCaseRequirement(" + requirementOid + ")'>Associate</a></td>\n";
      contentStr += '<td class="dataCell"><a class="actionLink" href="#" onClick="window.open(\'' + detailUrl + '\'); return true;">' + artifactID + "</a></td>\n";
      contentStr += '<td class="dataCell">' + artifactName + '</td>\n';
      contentStr += '<td class="dataCell">' + artifactDescription.substr(0, 100) + ellipsis + '</td>\n';
      contentStr += '<td class="dataCell">' + artifactState + '</td>\n';
      contentStr += '<td class="dataCell">' + artifactRelease + '</td>';
      contentStr += "</tr>\n";
    }
    contentStr += "</table>\n";
  }
  else {
    contentStr = "<pre>No match found.</pre>";
  }
  rally.injectContent("resultsOutput", contentStr);
};

rally.getRequirements.checkResponseErrors = function (response) {
  var data = "";
  var typ = typeof(response.OperationResult);
  if (typeof(response.OperationResult) == "undefined") {
    return(data);
  }
  if (response.OperationResult.Errors.length > 0) {
    data = response.OperationResult.Errors[0];
  }
  return data;
};

rally.getRequirements.failureResponse = function (response, request) {
  var message = rally.genericFailureResponse(response, request, false);
  var content = "<pre>" + message + "</pre>";
  rally.injectContent("resultsOutput", content);
};

/* Associate Defect a defect with the given case */
rally.associateCaseDefect = function (defectOID) {
  if (artifactRef.length > 0) {
    var answer = confirm("This case is already associated with Rally. Are you sure you want to replace the existing association?");
    if (answer) {
      rally.associateDefect(ID, defectOID);
      rally.redirect();
    }
    else {

    }
  }
  else {
    rally.associateDefect(ID, defectOID);
    rally.redirect();
  }
};

rally.associateDefect = function (SFCaseID, defectOID) {
  var refUrl = rally.webserviceUrl + "/defect/" + defectOID + '.js';
  var skip = 0;

  if (SFCaseID.length > 0) {
    rally.updateSFCase(SFCaseID, refUrl);
  }

  // It matters that this happens just before Rally is updated to get the most current info.
  rally.getArtifact(refUrl);
  var defectEntry = rally.associateDefect.updateDefect(refUrl, SFCaseID, caseNumber);
  rally.agentHeader("associateDefect");
  sforce.connection.remoteFunction({
      url: refUrl,
      mimeType: "text/plain",
      method: 'POST',
      requestHeaders: rally.requestHeader,
      requestData: defectEntry,
      async: false,
      onSuccess: rally.associateDefect.successResponse,
      onFailure: rally.genericFailureHandler }
  );

  if (SFCaseID.length > 0) {
    rally.getCaseInfo(SFCaseID);
    rally.discussion("associate", refUrl, SFCaseID, caseNumber, rally.caseOwner, rally.caseCreator, rally.caseAttachment, rally.caseDescription);
  }
};


rally.associateDefect.successResponse = function (response) {
  var jsResponse = YAHOO.lang.JSON.parse(response);
  var docStr = rally.associateDefect.checkResponseErrors(jsResponse);
  if (docStr.length > 0) {
    alert("Error updating Rally Custom Fields: " + docStr);
  }

};

rally.associateDefect.checkResponseErrors = function (response) {
  var data = "";
  if (response.OperationResult.Errors.length > 0) {
    data = response.OperationResult.Errors[0];
  }
  return data;
};

rally.associateDefect.updateDefect = function (refUrl, caseId, caseNumber) {
  var message = "";
  var defectPayload = {"Defect": {"_ref": refUrl }};
  var affectedCustomers = "";
  rally.stats.getStats(refUrl);

  if (rally.stats.customers.length > rally.AFFECTED_CUST_LEN) {
    affectedCustomers = rally.stats.customers.substr(0, rally.AFFECTED_CUST_LEN - 3);
    affectedCustomers += '...';
  }
  else {
    affectedCustomers = rally.stats.customers;
  }

  defectPayload.Defect.NumberofCases = rally.stats.num_cases;
  defectPayload.Defect.AffectedCustomers = affectedCustomers;
  if (caseId.length > 0 && rally.artifactCaseID == "") {
    defectPayload.Defect.SalesforceCase = {};
    defectPayload.Defect.SalesforceCase.LinkID = caseId;
    defectPayload.Defect.SalesforceCase.DisplayString = caseNumber;

  }
  else if ((caseId.length > 0 && rally.artifactCaseID != "") || rally.stats.num_cases > 0) {
    //nothing
  }
  else {
    defectPayload.Defect.SalesforceCase = {};
    defectPayload.Defect.SalesforceCase.LinkID = "";
    defectPayload.Defect.SalesforceCase.DisplayString = "";
  }
  message = YAHOO.lang.JSON.stringify(defectPayload);
  return (message);
};

/* Associate Requirement with the given case. */
rally.associateCaseRequirement = function (requirementOID) {
  if (artifactRef.length > 0) {
    var answer = confirm("This case is already associated with Rally. Are you sure you want to replace the existing association?");
    if (answer) {
      rally.associateRequirement(ID, requirementOID);
      rally.redirect();
    }
    else {

    }
  }
  else {
    rally.associateRequirement(ID, requirementOID);
    rally.redirect();
  }
};

rally.associateRequirement = function (SFCaseID, requirementOID) {
  var refUrl = rally.webserviceUrl + "/hierarchicalrequirement/" + requirementOID + '.js';


  if (SFCaseID.length > 0) {
    rally.updateSFCase(SFCaseID, refUrl);
  }
  rally.getArtifact(refUrl);
  var requirementEntry = rally.associateRequirement.updateRequirement(refUrl, SFCaseID, caseNumber);
  rally.agentHeader("associateRequirement");
  sforce.connection.remoteFunction({
      url: refUrl,
      mimeType: "text/plain",
      method: 'POST',
      requestHeaders: rally.requestHeader,
      requestData: requirementEntry,
      async: false,
      onSuccess: rally.associateRequirement.successResponse,
      onFailure: rally.genericFailureHandler }
  );

  if (SFCaseID.length > 0) {
    rally.getCaseInfo(SFCaseID);
    rally.discussion("associate", refUrl, SFCaseID, rally.caseNumber, rally.caseOwner, rally.caseCreator, rally.caseAttachment, rally.caseDescription);
  }
};

rally.associateRequirement.successResponse = function (response) {
  var jsResponse = YAHOO.lang.JSON.parse(response);
  var docStr = rally.associateRequirement.checkResponseErrors(jsResponse);
  if (docStr.length > 0) {
    alert("Error updating Rally Custom Fields: " + docStr);
  }

};

rally.associateRequirement.checkResponseErrors = function (response) {
  var data = "";
  if (response.OperationResult.Errors.length > 0) {
    data = response.OperationResult.Errors[0];
  }
  return data;
};

rally.associateRequirement.updateRequirement = function (refUrl, caseId, caseNumber) {
  var affectedCustomers = "";
  rally.stats.getStats(refUrl);

  if (rally.stats.customers.length > rally.AFFECTED_CUST_LEN) {
    affectedCustomers = rally.stats.customers.substr(0, rally.AFFECTED_CUST_LEN - 3);
    affectedCustomers += '...';
  }
  else {
    affectedCustomers = rally.stats.customers;
  }

  var requirementPayload = '{"HierarchicalRequirement": {"_ref":"' + refUrl + '",';
  requirementPayload += '"NumberofCases":' + rally.stats.num_cases + ',' +
    '"AffectedCustomers":"' + affectedCustomers + '"';
  if (caseId.length > 0 && rally.artifactCaseID == "") {
    requirementPayload +=
      ',"SalesforceCase":{"LinkID":"' + caseId + '","DisplayString":"' + caseNumber + '"}}}';
  }
  else if ((caseId.length > 0 && rally.artifactCaseID != "") || rally.stats.num_cases > 0) {
    requirementPayload += "}}";
  }
  else {
    requirementPayload += ',"SalesforceCase":{"LinkID":"","DisplayString":""}}}';
  }
  return requirementPayload;
};

/* update artifact ref of SF case */
rally.updateSFCase = function (SFCaseID, refUrl) {
  var _tmpcase = new sforce.SObject('Case');
  _tmpcase.Id = SFCaseID;
  _tmpcase.RALLYSM__Rally_Artifact_Ref__c = refUrl;

  var result = sforce.connection.update([_tmpcase]);
};

if (!rally.tagCases) {
  rally.tagCases = {};
}

rally.tagCases.updateCaseTag = function (caseId, caseTag) {
  var _tmpcase = new sforce.SObject('Case');
  _tmpcase.Id = caseId;
  _tmpcase.RALLYSM__Notification_Tag__c = caseTag;
  return(_tmpcase);
};

rally.tagCases.getAnnouncementTags = function () {
  var tagArr = [];
  var caseDesc = sforce.connection.describeSObject("Case");
  var caseFields = caseDesc.fields;
  for (var i = 0; i < caseFields.length; i++) {
    if (caseFields[i].name == "RALLYSM__Notification_Tag__c") {
      return(caseFields[i].picklistValues);
    }
  }
  return(tagArr);
};

rally.tagCases.tagExists = function (term) {
  var tagArr = rally.tagCases.getAnnouncementTags();
  for (var i = 0; i < tagArr.length; i++) {
    if (tagArr[i].value == term) {
      return(true);
    }
  }
  return(false);
};

rally.discussion = function (action, artifactURL, caseID, caseNumber, caseOwner, caseCreator, caseAttachments, caseDescription) {
  rally.agentHeader("addDiscussion");
  // Instead of changing this interface here, assume there is a rally.caseAccountName
  var message = rally.discussion.message(action, artifactURL, caseID, caseNumber, rally.caseAccountName, caseOwner, caseCreator, caseAttachments, caseDescription);
  var conversationUrl = rally.webserviceUrl + "/conversationpost/create.js";
  sforce.connection.remoteFunction({
      url: conversationUrl,
      mimeType: "text/plain",
      method: 'POST',
      requestHeaders: rally.requestHeader,
      requestData: message,
      async: false,
      onSuccess: rally.discussion.successResponse,
      onFailure: rally.genericFailureHandler }
  );
};

rally.discussion.message = function (action, artifactURL, caseID, caseNumber, caseAccountName, caseOwner, caseCreator, caseAttachments, caseDescription) {
  var message = "";
  var obj = {};
  obj.ConversationPost = {};
  obj.ConversationPost.Artifact = { "_ref": artifactURL };
  if (action == "disassociate") {
    obj.ConversationPost.Text = "<b>Rally Support Manager:</b> disassociated from Salesforce <b>Case:</b> " + caseNumber;
  }
  else {
    var description = "";
    if (caseDescription.length > 0) {
      description = caseDescription.replace(/\r\n|\n|\r/g, "<br>");
    }
    var accountName = "";
    if (caseAccountName.length == 0) {
      accountName = "not specified";
    }
    else {
      accountName = caseAccountName;
    }
    obj.ConversationPost.Text = "<b>Rally Support Manager:</b> associated to Salesforce <b>Case:</b> <a href='https://na1.salesforce.com/" + caseID + "'>" + caseNumber + "</a>" +
      ", <b>Account:</b> " + accountName +
      ", <b>Owner:</b> " + caseOwner +
      ", <b>Creator:</b> " + caseCreator +
      ", <b>Attachments:</b> " + caseAttachments +
      ", <b>Description:</b> " + description;
  }
  message = YAHOO.lang.JSON.stringify(obj);
  return(message);
};

rally.discussion.successResponse = function (response) {

};

/* properties for stats to send to Rally to update an artifact and
 give a picture to rally of the aggregate activity in SF */
rally.stats = {};
rally.stats.num_of_cases = 0;
rally.stats.customers = "";

rally.stats.getStats = function (refUrl) {
  var wildCardUrl = rally.getArtifactOid(refUrl);
  var assocs = sforce.connection.query("select b.Name from Case a, a.account b where a.RALLYSM__Rally_Artifact_Ref__c like '%/" + wildCardUrl + "%'");
  var assocRecords = assocs.getArray("records");
  var customers = [];

  rally.stats.clearStats();
  for (var i = 0; i < assocRecords.length; i++) {
    rally.stats.num_cases += 1;
    var accntName = assocRecords[i].Account ? assocRecords[i].Account.Name : "";
    if (accntName.length > 0) {
      customers[accntName] = 1;
    }
  }
  for (var i in customers) {
    if (rally.stats.customers.length > 0) {
      rally.stats.customers += "|" + i;
    }
    else {
      rally.stats.customers = i;
    }
  }

};

rally.stats.clearStats = function () {
  rally.stats.num_cases = 0;
  rally.stats.customers = "";
};

/* properties to hold onto for the case based on caseId lookup.
 This is lookedup instead of inlined APEX substitution because it is
 possible that the description has multiple lines which makes for bad
 javascript.
 */
rally.caseDescription = "";
rally.caseAccountName = "";
rally.caseNumber = 0;
rally.caseOwner = "";
rally.caseCreator = "";
rally.caseAttachment = 0;
rally.caseArtifactRef = "";
rally.caseRecord = "";
rally.caseId = "";
rally.getCaseInfo = function (caseId, fieldList) {
  var requiredCaseFields = ["CaseNumber", "Subject", "Description", "RALLYSM__Rally_Artifact_Ref__c"];
  var caseSQL = "";
  if (fieldList == "" || fieldList == undefined) {
    caseSQL = "select CaseNumber, Subject, Description, RALLYSM__Rally_Artifact_Ref__c ";
  }
  else {
    for (var j = 0; j < requiredCaseFields.length; j++) {
      var fld = requiredCaseFields[j];
      var fldpat = "\\W*" + fld + "\\W*";
      var regStr = new RegExp(fldpat, "i");
      var matchStr = regStr.test(fieldList);
      if (matchStr == false) {
        fieldList += ", " + requiredCaseFields[j];
      }
    }
    caseSQL = "select " + fieldList;
  }

  var caseInfo = sforce.connection.query(caseSQL + ", d.Name, b.Name, e.Name from Case a, a.account b, a.owner d, a.createdby e where Id = '" + caseId + "'");
  var caseRecords = caseInfo.getArray("records");
  var attachInfo = sforce.connection.query("select Name from attachment where parentId = '" + caseId + "'");
  var attachRecords = attachInfo.getArray("records");
  try {
    var emailAttachInfo = sforce.connection.query("select HasAttachment from EmailMessage where parentId = '" + caseId + "'");
    var emailAttachRecords = emailAttachInfo.getArray("record");
  }
  catch (e) {
    var emailAttachRecords = [];
  }

  rally.caseRecord = caseRecords[0];
  rally.caseNumber = caseRecords[0].CaseNumber;
  rally.caseSubject = caseRecords[0].Subject;
  rally.caseDescription = caseRecords[0].Description ? caseRecords[0].Description : "";
  rally.caseAccountName = caseRecords[0].Account ? caseRecords[0].Account.Name : "";
  rally.caseOwner = caseRecords[0].Owner ? caseRecords[0].Owner.Name : "";
  rally.caseCreator = caseRecords[0].CreatedBy ? caseRecords[0].CreatedBy.Name : "";
  rally.caseAttachment = "No";
  if (attachRecords.length > 0 || emailAttachRecords.length > 0) {
    rally.caseAttachment = "Yes";
  }
  rally.caseArtifactRef = caseRecords[0].RALLYSM__Rally_Artifact_Ref__c;
  rally.caseId = caseId;

};

/* simple encoding to pass to Rally in Rally XML where passed SF info
 may contain bad characters (from an XML perspective). Ampersand is the only known
 bad one currently.
 */
rally.encodeXML = function (str) {
  if ((str == undefined) || (str.length == 0)) {
    return("");
  }
  var newstr = str.replace(/\&/g, "&amp;");
  newstr = newstr.replace(/\</g, "&lt;");
  newstr = newstr.replace(/\>/g, "&gt;");
  newstr = newstr.replace(/\"/g, "&quot;");
  newstr = newstr.replace(/\'/g, "&apos;");
  return(newstr);
};

/* redirect browser for IE or FF (they behave differently with regards to IFrames */
rally.redirect = function () {
  if (window.ActiveXObject) {
    parent.location.href = top.retUrl;
  }
  else {
    top.location = top.retUrl;
  }
};

/* Handle user wanting to update case detail */
rally.updateCaseDetail = function (caseId, developmentState, targetRelease) {
  var caseObjs = [];
  caseObjs.push(rally.updateCaseDetail.updateCase(caseId, developmentState, targetRelease));
  var result = sforce.connection.update(caseObjs);
  rally.redirect();
};

rally.updateCaseDetail.updateCase = function (caseId, developmentState, targetRelease) {
  var _tmpcase = new sforce.SObject('Case');
  _tmpcase.Id = caseId;
  _tmpcase.RALLYSM__Development_Status__c = developmentState;
  _tmpcase.RALLYSM__Release_Target__c = targetRelease;
  return(_tmpcase);
};

rally.busy = function (state) {
  if (state) {
    document.body.style.cursor = "wait";
  }
  else {
    document.body.style.cursor = "auto";
  }
  return(true);
};

rally.checked = "";
rally.checkAll = function (formName, checkedVal) {
  var allValue = "";
  if (checkedVal == "rally.checked") {
    if (rally.checked == "") {
      allValue = true;
    }
    else {
      allValue = !rally.checked;
    }
  }
  else {
    allValue = document.forms[formName].allbox.checked;
  }
  for (var i = 0; i < document.forms[formName].elements.length; i++) {
    var e = document.forms[formName].elements[i];
    if ((e.name != 'allbox') && (e.type == 'checkbox')) {
      e.checked = allValue;
    }
  }
  rally.checked = allValue;

};

rally.cleanURL = function (caseId, baseUrl, url) {
  if (url.length == 0) {
    return(url);
  }
  var oldBase = "";
  if (url.match(/^(http|https)\:\/\/([^\/\:]+)/)) {
    oldBase = RegExp.$1 + "://" + RegExp.$2;
  }
  if (oldBase == baseUrl) {
    return(url);
  }
  var newUrl = url.replace(oldBase, baseUrl);
  rally.updateSFCase(caseId, newUrl);
  return(newUrl);
};


rally.rsc = {};
rally.rsc.projectCookie = "rscProject";
rally.rsc.setCookie = function (cookie, cookieValue) {
  document.cookie = cookie + "=" + escape(cookieValue);
};

rally.rsc.getCookie = function (cookie) {
  cookies = document.cookie.split(';');
  for (var i = 0; i < cookies.length; i++) {
    cookie_arr = cookies[i].split('=');
    cookie_name = cookie_arr[0].replace(/^\s+|\s+$/g, '');
    if (cookie_name == cookie) {
      return(unescape(cookie_arr[1].replace(/^\s+|\s+$/g, '')));
    }
  }
  return(null);
};

rally.genericFailureHandler = function (response, request, alertflag) {
  var message = response;
  var messages = {};
  messages.InvalidCred = {message: "Invalid Rally Credentials", searchPhrase: "Invalid Login Credentials"};
  messages.LockedAccount = {message: "Rally user account is locked", searchPhrase: "User account is locked"};
  messages.ExpiredPassword = {message: "Rally user password has expired", searchPhrase: "Password has expired"};
  if (request.status == 401) {
    var invalidCredFlag = response.search(messages.InvalidCred.searchPhrase);
    var accountLockedFlag = response.search(messages.LockedAccount.searchPhrase);
    if (invalidCredFlag > 0) {
      message = messages.InvalidCred.message;
    }
    if (accountLockedFlag > 0) {
      message = messages.LockedAccount.message;
    }
  }
  if (request.status == 302) {
    var expiredFlag = response.search(messages.ExpiredPassword.searchPhrase);
    if (expiredFlag > 0) {
      message = messages.ExpiredPassword.message;
    }
  }
  // if alertflag wasn't passed in, then assume that it set true and an alert should be shown.
  if (typeof(alertflag) == "undefined") {
    alertflag = true;
  }
  if (alertflag) {
    alert("Error Connecting to Rally: " + message);
  }
  return(message);
};

rally.userUri = "";
rally.userRef = function () {
  if (rally.userUri !== "") {
    return rally.userUri;
  }

  var successResp = function (response) {
    var jsResponse = YAHOO.lang.JSON.parse(response);
    var docStr = rally.getDefects.checkResponseErrors(jsResponse);
    //if docStr has something there is an error - should we raise it?
    rally.userUri = jsResponse.User._ref;
    return rally.userUri;
  };

  // todo we should have a generic failure response
  var failureResp = function (response, request) {
    rally.getDefects.failureResponse(response, request);
  };

  rally.agentHeader("getUser");
  sforce.connection.remoteFunction({
      url: rally.webserviceUrl + '/user.js?' + "fetch=UserName",
      method: 'GET',
      requestHeaders: rally.requestHeader,
      async: false,
      onSuccess: successResp,
      onFailure: failureResp }
  );
  return false;
};

rally.hasRPMFlag = null;
rally.hasRPM = function () {
  if (rally.hasRPMFlag != null) {
    return(rally.hasRPMFlag);
  }
  try {
    var tmp = sforce.connection.describeSObject("RALLYRPM__Feedback__c");
  }
  catch (e) {
    rally.hasRPMFlag = false;
    return(rally.hasRPMFlag);
  }
  rally.hasRPMFlag = true;
  return(rally.hasRPMFlag);
};

// This is just a place holder function in case ecma decides to include an exit 1 day. We only have to change it once.
rally.exit = function () {
  exit();
}




// start fieldMapper.js
// requires jquery

/* (c) 2009-2013 Rally Software Development Corp. All rights reserved. */
  /*
   * rally field mapping
   */
  rally.fm = function () {
    /* artifact type */
    this.artifactType = "";

    this.SFQryField = "";

    /* Salesforce case schema (field name to type)*/
    this.caseSchema = {};

    /* rally type definition */
    this.rallySchema = null;
    /* rally attribute map */
    this.rallyAttributeMap = {};
    /* rally custom attribute map */
    this.rallyCustomAttrMap = {};

    this.artifactFieldMap = {};

    this.defaultFieldMap = {};

    /* default artifact field map if we mapping hasn't been set */
    this.initialArtifactFM = {};

    /* this tells us what fields we are interested in and what they should be called.
     * TODO: this should be generated from typedef but we are missing required */
    this.rallyFields = [];

    /* custom fields */
    this.rallyCustomFields = [];

    this.loaded = false;
    this.sfSchemaLoaded = false;
    this.artifactTypeDefLoaded = false;
    this.formName = "";
    this.fieldExceptions = / /;
    var stringAllowedValueMsg = "Text value shorter than 255 characters";

    init = function () {

    };
    this.init = init;


    /* get all of the case fields */
    this.getSFCaseFields = function () {
      var caseDescription = sforce.connection.describeSObject("Case");
      return(caseDescription);
    };

    /* build SF field type by name */
    this.getSFCaseFieldMap = function () {
      if (this.sfSchemaLoaded) {
        return;
      }
      var sfSchema = this.getSFCaseFields();
      for (var i = 0, len = sfSchema.fields.length; i < len; i++) {
        var nameRef = sfSchema.fields[i].name;
        //noinspection UnnecessaryLocalVariableJS
        var typeRef = sfSchema.fields[i].type;
        this.caseSchema[nameRef] = typeRef;
      }
      this.sfSchemaLoaded = true;

    };

    /* lookup SF field type by name */
    this.lookupSFFieldType = function (name) {
      if (!this.sfSchemaLoaded) {
        this.getSFCaseFieldMap();
      }
      return(this.caseSchema[name]);
    };

    /* create an attribute element name to index with in the rally schema for fast lookup */

    /* get the defect type */
    this.getArtifactTypeDef = function (workspaceRef) {
      var artifactAttrMap = {};
      var customAttrMap = {};
      var customAttrArr = [];
      var artifactSchema = {};
      var artifactType = this.artifactType;
      fieldExceptions = this.fieldExceptions;
      var mapTypeDef = function (schema) {
        for (var i = 0, len = schema.length; i < len; i++) {
          artifactAttrMap[schema[i].ElementName] = i;
          if ((schema[i].Custom) && (schema[i].AttributeType != "WEB_LINK")) // && (schema[i].Hidden))
          {
            if (schema[i].ElementName.search(this.fieldExceptions) == -1) {
              customAttrMap[schema[i].ElementName] = schema[i];
              customAttrArr.push({ "code": schema[i].ElementName, "label": schema[i].Name, "custom": 1, "required": 0, "literal": null });
            }
          }
        }

      };
      var checkResponseErrors = function (jsResponse) {
        var data = "";
        if (jsResponse.QueryResult.Errors.length > 0) {
          data = jsResponse.QueryResult.Errors[0];
        }
        return(data);
      };
      var successResponse = function (jsResponse) {
        var docStr = checkResponseErrors(jsResponse);

        if (docStr.length > 0) {
          alert("Error Rally " + artifactType + " TypeDefinition Error: " + docStr);
          return;
        }
        j$.each(jsResponse.QueryResult.Results, function(i, value){
          if (value.Name === artifactType){
            artifactSchema = value.Attributes;
          }
        });
      };
      var failureResponse = function (response, request) {
        rally.genericFailureHandler(response, request);
        self.close();
      };
      rally.agentHeader(artifactType + " TypeDef");
      
      rally.almGet(rally.schemaUrl + '/workspace/' + rally.workspaceOid + '/' + rally.workspaceSchemaVersion, successResponse, failureResponse, true);

      // sforce.connection.remoteFunction({
      //     url: rally.webserviceUrl + '/typedefinition.js?' + qryStr + '&workspace=' + workspaceRef,
      //     method: 'GET',
      //     requestHeaders: rally.requestHeader,
      //     requestData: qryStr,
      //     async: false,
      //     onSuccess: successResponse,
      //     onFailure: failureResponse }
      // );
      this.rallySchema = artifactSchema;
      mapTypeDef(this.rallySchema);
      this.rallyAttributeMap = artifactAttrMap;
      this.rallyCustomAttrMap = customAttrMap;
      this.rallyCustomFields = customAttrArr;
      if (artifactType == "Hierarchical Requirement") {
        packageAttr = this.getPackageStoryTypeDef(workspaceRef);
        this.rallyAttributeMap["Package"] = this.rallySchema.length - 1;
      }
      this.artifactTypeDefLoaded = true;

    };

    this.saveMapping = function (id) {
      var varstruct = {};
      var fields = this.rallyFields.concat(this.rallyCustomFields);
      j$.each(fields, function(i, field){
        var literalValue = "";
        var code = field.code;
        var row = {}
        row.fldValue = j$('[name="' + code + '_fld' + '"]').val();
        if (row.fldValue == "Default") {
          row.literalValue = j$('[name="' + code + '_literal' + '"]').val();
        }
        if (row.fldValue !== 'None'){
          varstruct[code] = row;  
        }
      });
      
      var packStr = JSON.stringify(varstruct);
      this.updateRS(id, packStr);

    };

    /* update rally setup object */
    this.updateRS = function (id, mapStr) {
      var _tmpobj = new sforce.SObject('Case2Rally_Setup__c');
      _tmpobj.Id = id;
      _tmpobj[this.SFQryField] = mapStr;

      var result = sforce.connection.update([_tmpobj]);
    };

    /* get the highest number RSO */
    this.getArtifactFieldMap = function () {
      var mapField = sforce.connection.query("select " + this.SFQryField + " from Case2Rally_Setup__c order by Name Asc");
      this.getArtifactFieldMapStr(mapField);

    };

    /* query RSO by ID */
    this.getArtifactFieldMapById = function (id) {
      var mapField = sforce.connection.query("select " + this.SFQryField + " from Case2Rally_Setup__c where Id = '" + id + "' order by Name Asc");
      this.getArtifactFieldMapStr(mapField);

    };

    /* take a results query and get the value which should be a JSON string */
    this.getArtifactFieldMapStr = function (qry) {
      var mapRecord = qry.getArray("records");
      var mapStr = mapRecord[0][this.SFQryField];
      this.mapArtifactFieldMapByStr(mapStr);

    };

    /* fill out the defect map */
    this.mapArtifactFieldMapByStr = function (mapStr) {
      if (mapStr == null) {
        this.artifactFieldMap = this.defaultFieldMap;
        return;
      }
      this.artifactFieldMap = JSON.parse(mapStr);
      this.loaded = true;
      for (var i in this.artifactFieldMap) {
        if (this.artifactFieldMap[i].custom) {
          this.rallyCustomFields.push(this.artifactFieldMap[i]);
        }
      }

    };

    /* returned the SF mapped field */
    this.lookupArtifactField = function (field) {
      if (!this.loaded) {
        this.getArtifactFieldMap();
      }
      return(this.artifactFieldMap[field].fldValue);
    };

    this.lookupArtifactFieldLiteral = function (field) {
      if (!this.loaded) {
        this.getArtifactFieldMap();
      }
      return(this.artifactFieldMap[field].literalValue);
    };

    this.lookupAttributeIndex = function (fieldCode) {
      if (!this.artifactTypeDefLoaded) {
        this.getArtifactTypeDef();
      }
      var idx = this.rallyAttributeMap[fieldCode];
      return(idx);
    };

    this.getRallyAttributeType = function (fieldCode) {
      if (fieldCode == "Name") {
        return("String");
      }
      if (fieldCode == "Description") {
        return("Text");
      }
      if (fieldCode == "Owner") {
        return("String");
      }
      if (fieldCode == "Release") {
        return("String");
      }
      if (!this.artifactTypeDefLoaded) {
        this.getArtifactTypeDef();
      }
      var idx = this.lookupAttributeIndex(fieldCode);
      if (idx == undefined) {
        return(idx);
      }
      var attrType = this.rallySchema[idx].AttributeType;
      switch (attrType) {
        case "RATING":
          attrType = "Picklist";
          break;
        case "STRING":
          attrType = "String";
          break;
        case "TEXT":
          attrType = "Text";
          break;
        case "DECIMAL":
          attrType = "Decimal";
          break;
        case "INTEGER":
          attrType = "Integer";
          break;
        case "WEB_LINK":
          attrType = "Web Link";
          break;
        case "BOOLEAN":
          attrType = "Boolean";
          break;
        case "DATE":
          attrType = "Date";
          break;
        default:
          attrType = "Unknown";
      }
      return(attrType);
    };

    this.getRallyAttrAllowedValues = function (fieldCode, attrType) {
      if (!this.artifactTypeDefLoaded) {
        this.getArtifactTypeDef();
      }
      if ((fieldCode == "Name") || (fieldCode == "Description")) {
        return("&nbsp;");
      }
      if ((attrType == "String") && (fieldCode != "Package")) {
        return(stringAllowedValueMsg);
      }

      var idx = this.lookupAttributeIndex(fieldCode);
      if (idx == undefined) {
        return(idx);
      }
      var attrStr = "";
      var attrVals = this.rallySchema[idx].AllowedValues;
      if (attrVals == "undefined") {
        return(attrStr);
      }
      for (var i = 0; i < attrVals.length; i++) {
        attrStr += attrVals[i].StringValue + ", ";
      }
      attrStr = attrStr.replace(/\, $/, "");
      attrStr = attrStr.replace(/^,/, "");
      if (attrStr.length == 0) {
        attrStr = "&nbsp;";
      }
      return(attrStr);
    };

    /* return a list of the SF Fields...useful in query of case */
    this.getMappedSFFieldList = function () {
      if (!this.loaded) {
        this.getArtifactFieldMap();
      }
      var fieldList = "";
      for (var i in this.artifactFieldMap) {
        if ((this.artifactFieldMap[i].fldValue != 'None') &&
          (this.artifactFieldMap[i].fldValue != 'Default') &&
          (fieldList.match(this.artifactFieldMap[i].fldValue) == null)) {
          fieldList += this.artifactFieldMap[i].fldValue + ',';
        }
      }
      fieldList = fieldList.replace(/\,$/, "");
      return(fieldList);
    };

    this.getPackageStoryTypeDef = function (workspaceRef) {
      var packageSchema = {};
      var rallyPackageSchema = {};
      mapTypeDef = function (schema) {
        var attrMap = {};
        for (var i = 0; i < schema.length; i++) {
          attrMap[schema[i].ElementName] = i;
        }
        return(attrMap);
      };
      checkResponseErrors = function (jsResponse) {
        var data = "";
        if (!jsResponse.TypeDefinition) {
          data = "Could not retrieve typedefinition for Requirement.";
        }
        return(data);
      };
      successResponse = function (response) {
        var jsResponse = JSON.parse(response);
        var docStr = checkResponseErrors(jsResponse);

        if (docStr.length > 0) {
          alert("Error Rally Story TypeDefinition Error: " + docStr);
          return;
        }

        rallyPackageSchema = jsResponse.TypeDefinition.Attributes;

      };
      failureResponse = function (response, request) {
        rally.rpm.genericFailureHandler(response, request, true);
        self.close();
      };
      rally.agentHeader("Story TypeDef");
      var qryStr = "";
      var result = sforce.connection.remoteFunction({
          url: rally.webserviceUrl + '/typedefinition/-51005.js?workspace=' + workspaceRef,
          method: 'GET',
          requestHeaders: rally.requestHeader,
          requestData: qryStr,
          async: false,
          onSuccess: successResponse,
          onFailure: failureResponse }
      );
      packageSchema = mapTypeDef(rallyPackageSchema);
      this.rallySchema.push(rallyPackageSchema[0]);
      return(packageSchema);
    };


    /* validate map settings */
    validate = function () {

    };

  };

  rally.dfm = function () {
    this.fm = new rally.fm();
    this.fm.defaultFieldMap = {"FoundInBuild": {"fldValue": "None", "literalValue": ""}, "Severity": {"fldValue": "None", "literalValue": ""}, "Priority": {"fldValue": "None", "literalValue": ""}, "Environment": {"fldValue": "Default", "literalValue": "Production"}, "Description": {"fldValue": "Description", "literalValue": ""}, "Name": {"fldValue": "Subject", "literalValue": ""}, "Package": {"fldValue": "None", "literalValue": ""}, "Owner": {"fldValue": "None", "literalValue": ""}, "Release": {"fldValue": "None", "literalValue": ""}};
    this.fm.initialArtifactFM = {"FoundInBuild": "None",
      "Severity": "None",
      "Priority": "None",
      "Environment": "Default",
      "Description": "Description",
      "Name": "Subject",
      "Package": "None",
      "Owner": "None", "Release": "None"};
    this.fm.rallyFields = [
      {"code": "FoundInBuild", "label": "Found In", "required": 0, "literal": null},
      {"code": "Severity", "label": "Severity", "required": 0, "literal": null},
      {"code": "Priority", "label": "Priority", "required": 0, "literal": null},
      {"code": "Environment", "label": "Environment", "required": 0, "literal": "Production"},
      {"code": "Description", "label": "Description", "required": 0, "literal": null},
      {"code": "Name", "label": "Name", "required": 1, "literal": null},
      {"code": "Package", "label": "Package", "required": 0, "literal": null},
      {"code": "Owner", "label": "Owner", "required": 0, "literal": null},
      {"code": "Release", "label": "Release", "required": 0, "literal": null}
    ];

    this.fm.fieldExceptions = /^(AffectedCustomers|NumberofCases)$/;
    this.fm.formName = "defectMapForm";
    this.fm.artifactType = "Defect";
    this.fm.SFQryField = "Defect_Field_Map__c";

  };

  rally.usfm = function () {
    this.fm = new rally.fm();
    this.fm.defaultFieldMap = {"Description": {"fldValue": "Description", "literalValue": ""},
      "Name": {"fldValue": "Subject", "literalValue": ""},
      "Package": {"fldValue": "None", "literalValue": ""},
      "Owner": {"fldValue": "None", "literalValue": ""},
      "Rank": {"fldValue": "None", "literalValue": ""}};
    this.fm.initialArtifactFM = {
      "Description": "Description",
      "Name": "Subject",
      "Package": "None",
      "Owner": "None",
      "Rank": "None"};
    this.fm.rallyFields = [
      {"code": "Description", "label": "Description", "required": 0, "literal": null},
      {"code": "Name", "label": "Name", "required": 1, "literal": null},
      {"code": "Package", "label": "Package", "required": 0, "literal": null},
      {"code": "Owner", "label": "Owner", "required": 0, "literal": null},
      {"code": "Rank", "label": "Rank", "required": 0, "literal": null}
    ];

    this.fm.fieldExceptions = /^(AffectedCustomers|NumberofCases|RequestingCustomers|NumberofRequests|Score|SalesforceFeature)/;
    this.fm.formName = "storyMapForm";
    this.fm.artifactType = "Hierarchical Requirement";
    this.fm.SFQryField = "Story_Field_Map__c";
  }