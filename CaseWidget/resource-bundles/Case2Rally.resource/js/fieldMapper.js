// requires https://www.rallydev.com/integrations/rsc/yui/2.6.0/build/yahoo/yahoo-min.js
// requires https://www.rallydev.com/integrations/rsc/yui/2.6.0/build/json/json-min.js

/* (c) 2009-2013 Rally Software Development Corp. All rights reserved. */
  if (!rally) {
    rally = {};
  }
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
            console.log(value.Attributes);
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
      this.artifactFieldMap = YAHOO.lang.JSON.parse(mapStr);
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
        var jsResponse = YAHOO.lang.JSON.parse(response);
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