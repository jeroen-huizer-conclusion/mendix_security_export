import {MendixSdkClient, Project, Revision, Branch, OnlineWorkingCopy, loadAsPromise} from 'mendixplatformsdk';
import {IModel, domainmodels, security} from 'mendixmodelsdk';
import when = require('when');
import fs = require('fs');
import envvars = require('dotenv');

// If you have a .env file in the project folder, settings are read from that
envvars.load();

// Otherwise, specify them here explicitly
const username = process.env.MXACCOUNT ? process.env.MXACCOUNT : "YOUR MENDIX USERNAME";
const apikey = process.env.APIKEY ? process.env.APIKEY : "YOUR MENDIX APIKEY";

const projectId = process.env.PROJECTID ? process.env.PROJECTID : "MENDIX PROJECT ID";
const projectName = process.env.PROJECTNAME ? process.env.PROJECTNAME : "MENDIX PROJECT NAME";

const branchName = process.env.BRANCHNAME ? process.env.BRANCHNAME : "BRANCH NAME"; // null for mainline
const revNo = process.env.REVISION ? parseInt(process.env.REVISION) : -1; // -1 for latest

const client = new MendixSdkClient(username, apikey);
const project = new Project(client, projectId, projectName);
const revision = new Revision(revNo, new Branch(project, branchName));

var model : IModel = null;
var domainModels : domainmodels.DomainModel[];
var projectSecurity: security.ProjectSecurity;

var _self = this;

// Output will be stored here
fs.mkdirSync("out");

console.log('Make sure that you close all of the output files..')
project.createWorkingCopy(revision)
    .then(getProjectModel)
    .then(model => this.model=model)
    .then(() => loadProjectSecurity(this.model))
    .then(projectSecurityResult => {
        console.log('Received project security..')
        this.projectSecurity = projectSecurityResult;
    })
    .then(() => loadDomainModels(this.model))
    .then(domainModelArray => {
        console.log('Received domain models..')
        this.domainModels = domainModelArray;
    })
    .done(processModel)

function processModel(){
    console.log(`Everything is loaded..`);

    var domainModels: domainmodels.DomainModel[] = _self.domainModels;
    var userRoles : security.UserRole[] = _self.projectSecurity.userRoles;

    writeModuleRoles();
    writeEntities();

    console.log('Done, check the out folder..')

}

/* Get the model from the workingcopy as a promise */
function getProjectModel(workingCopy: OnlineWorkingCopy): when.Promise<IModel> {
    console.log('Retrieving model..')
    var model = workingCopy.model();
    return when.promise<IModel>((resolve, reject) => {
        if (model){
            resolve(model);
        }
        else{
            reject('What model?');
        }
    });
}

/* Load a projectsecurity from the model as a promise */
function loadProjectSecurity(model: IModel): when.Promise<security.ProjectSecurity> {
    console.log('Loading project security..')
    var _model = model;
    return when.promise<security.ProjectSecurity>((resolve, reject) => {
        if(!_model){
            reject('model is undefined');
        }

        var iSecurity = _model.allProjectSecurities()[0];
        if (iSecurity) {
            iSecurity.load(security => resolve(security));
        } else {
            reject(`'security' is undefined`);
        }
    })
}

/* Load all domain models as a promise */
function loadDomainModels(model: IModel): when.Promise<domainmodels.DomainModel[]> {
    console.log('Loading domain models..')
    var _model = model;
    var iDomainmodels = _model.allDomainModels();
    return when.all<domainmodels.DomainModel[]>(iDomainmodels.map( iDomainmodel => loadAsPromise(iDomainmodel)));
}

function writeModuleRoles(){
    console.log('Writing security roles to csv..');
    var userRoles : security.UserRole[] = _self.projectSecurity.userRoles;

    var output = '';

    output+=['User Role',
    'ModuleRole',
    "\r\n"].join(";");

    userRoles.forEach(function(userRole){
        userRole.moduleRolesQualifiedNames.forEach(function(moduleRole){
            output+=[userRole.name, moduleRole, "\r\n"].join(";");
        })
    })

    var filename = project.name()+"_roles.csv";
    var ws = fs.createWriteStream('./out/'+filename, {flags: "w"});
    ws.write(output);
    ws.end();
}

function writeEntities(){
    console.log('Writing entities to csv..');

    var userRoles : security.UserRole[] = _self.projectSecurity.userRoles;
    var domainModels: domainmodels.DomainModel[] = _self.domainModels;

    var output = '';

    output+=[   'UserRole',
                'ModuleRole',
                'Module',
                'Entity',
                'Attribute',
                'Description',
                'XPath Constraint',
                'Accessrights',
                'AccessRule ID',
                "\r\n"].join(";");

    userRoles.forEach(function(userRole){
        userRole.moduleRolesQualifiedNames.forEach(function(moduleRoleName){

            domainModels.forEach(function(domainModel){
                var moduleName = domainModel.qualifiedName;

                domainModel.entities.forEach(function(entity){
                    var entityName = entity.name;

                    entity.accessRules.filter(function(accessRule){
                        return accessRule.moduleRolesQualifiedNames.indexOf(moduleRoleName) >= 0;
                    }).forEach(function(accessRule){
                        accessRule.memberAccesses.forEach(function(memberAccess){

                            var memberAccessRights = memberAccess.accessRights;

                            if(memberAccess.attribute){
                                var attributeName = memberAccess.attribute.name;

                                output+=[   userRole.name,
                                            moduleRoleName,
                                            moduleName,
                                            entityName,
                                            attributeName,
                                            accessRule.documentation.trim().replace(/\r?\n|\r/g,''),
                                            accessRule.xPathConstraint.trim().replace(/\r?\n|\r/g,''),
                                            memberAccessRights.name,
                                            accessRule.id,
                                            "\r\n"].join(";");

                            } else if(memberAccess.association){

                                var associationName = memberAccess.association.name;

                                output+=[   userRole.name,
                                            moduleRoleName,
                                            moduleName,
                                            entityName,
                                            associationName,
                                            accessRule.documentation.trim().replace(/\r?\n|\r/g,''),
                                            accessRule.xPathConstraint.trim().replace(/\r?\n|\r/g,''),
                                            memberAccessRights.name,
                                            accessRule.id,
                                            "\r\n"].join(";");
                            }
                        })

                    })
                })
            })
        })
    })

    var filename = project.name()+"_entities.csv";

    var ws = fs.createWriteStream('./out/'+filename, {flags: "w"});
    ws.write(output);
    ws.end();
}
