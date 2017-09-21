"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mendixplatformsdk_1 = require("mendixplatformsdk");
var when = require("when");
var fs = require("fs");
var envvars = require("dotenv");
envvars.load();
var username = process.env.MXACCOUNT ? process.env.MXACCOUNT : "YOUR MENDIX USERNAME";
var apikey = process.env.APIKEY ? process.env.APIKEY : "YOUR MENDIX APIKEY";
var projectId = process.env.PROJECTID ? process.env.PROJECTID : "MENDIX PROJECT ID";
var projectName = process.env.PROJECTNAME ? process.env.PROJECTNAME : "MENDIX PROJECT NAME";
var branchName = process.env.BRANCHNAME ? process.env.BRANCHNAME : "BRANCH NAME"; // null for mainline
var revNo = process.env.REVISION ? parseInt(process.env.REVISION) : -1; // -1 for latest
var client = new mendixplatformsdk_1.MendixSdkClient(username, apikey);
var project = new mendixplatformsdk_1.Project(client, projectId, projectName);
var revision = new mendixplatformsdk_1.Revision(revNo, new mendixplatformsdk_1.Branch(project, branchName));
var model = null;
var domainModels;
var projectSecurity;
var _self = this;
fs.mkdirSync("out2");
// project.createWorkingCopy(revision)
//     .then(getProjectModel)
//     .then(model => this.model=model)
//     .then(() => loadProjectSecurity(this.model))
//     .then(projectSecurityResult => {
//         console.log('Received project security..')
//         this.projectSecurity = projectSecurityResult;
//     })
//     .then(() => loadDomainModels(this.model))
//     .then(domainModelArray => {
//         console.log('Received domain models..')
//         this.domainModels = domainModelArray;
//     })
//     .done(processModel)
function processModel() {
    console.log("Everything is loaded");
    var domainModels = _self.domainModels;
    var userRoles = _self.projectSecurity.userRoles;
    writeModuleRoles();
    writeEntities();
    console.log('Done, check the out folder.');
}
function getProjectModel(workingCopy) {
    console.log('Retrieving model..');
    var model = workingCopy.model();
    return when.promise(function (resolve, reject) {
        if (model) {
            resolve(model);
        }
        else {
            reject('What model?');
        }
    });
}
function loadProjectSecurity(model) {
    console.log('Loading project security..');
    var _model = model;
    return when.promise(function (resolve, reject) {
        if (!_model) {
            reject('model is undefined');
        }
        var iSecurity = _model.allProjectSecurities()[0];
        if (iSecurity) {
            iSecurity.load(function (security) { return resolve(security); });
        }
        else {
            reject("'security' is undefined");
        }
    });
}
function loadDomainModels(model) {
    console.log('Loading domain models..');
    var _model = model;
    var iDomainmodels = _model.allDomainModels();
    return when.all(iDomainmodels.map(function (iDomainmodel) { return mendixplatformsdk_1.loadAsPromise(iDomainmodel); }));
}
function writeModuleRoles() {
    console.log('Writing to roles.csv');
    var userRoles = _self.projectSecurity.userRoles;
    var output = '';
    output += ['User Role',
        'ModuleRole',
        "\r\n"].join(";");
    userRoles.forEach(function (userRole) {
        userRole.moduleRolesQualifiedNames.forEach(function (moduleRole) {
            output += [userRole.name, moduleRole, "\r\n"].join(";");
        });
    });
    var filename = project.name() + "_" + revision.num() + "roles.csv";
    var ws = fs.createWriteStream('./out/' + filename, { flags: "w" });
    ws.write(output);
    ws.end();
}
function writeEntities() {
    console.log('Writing to entities.csv');
    var userRoles = _self.projectSecurity.userRoles;
    var domainModels = _self.domainModels;
    var output = '';
    output += ['UserRole',
        'ModuleRole',
        'Module',
        'Entity',
        'Attribute',
        'Description',
        'XPath Constraint',
        'Accessrights',
        'AccessRule ID',
        "\r\n"].join(";");
    userRoles.forEach(function (userRole) {
        userRole.moduleRolesQualifiedNames.forEach(function (moduleRoleName) {
            domainModels.forEach(function (domainModel) {
                var moduleName = domainModel.qualifiedName;
                domainModel.entities.forEach(function (entity) {
                    var entityName = entity.name;
                    entity.accessRules.filter(function (accessRule) {
                        return accessRule.moduleRolesQualifiedNames.indexOf(moduleRoleName) >= 0;
                    }).forEach(function (accessRule) {
                        accessRule.memberAccesses.forEach(function (memberAccess) {
                            var memberAccessRights = memberAccess.accessRights;
                            if (memberAccess.attribute) {
                                var attributeName = memberAccess.attribute.name;
                                output += [userRole.name,
                                    moduleRoleName,
                                    moduleName,
                                    entityName,
                                    attributeName,
                                    accessRule.documentation.trim().replace(/\r?\n|\r/g, ''),
                                    accessRule.xPathConstraint.trim().replace(/\r?\n|\r/g, ''),
                                    memberAccessRights.name,
                                    accessRule.id,
                                    "\r\n"].join(";");
                            }
                            else if (memberAccess.association) {
                                var associationName = memberAccess.association.name;
                                output += [userRole.name,
                                    moduleRoleName,
                                    moduleName,
                                    entityName,
                                    associationName,
                                    accessRule.documentation.trim().replace(/\r?\n|\r/g, ''),
                                    accessRule.xPathConstraint.trim().replace(/\r?\n|\r/g, ''),
                                    memberAccessRights.name,
                                    accessRule.id,
                                    "\r\n"].join(";");
                            }
                        });
                    });
                });
            });
        });
    });
    var filename = project.name() + "_" + revision.num() + "_entities.csv";
    var ws = fs.createWriteStream('./out/' + filename, { flags: "w" });
    ws.write(output);
    ws.end();
}
