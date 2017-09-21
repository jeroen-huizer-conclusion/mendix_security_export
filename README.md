# mendix_security_export
Full export of the project security for a Mendix project

## Description
Generates an overview of the accessrights on each attribute for each user role.

## Dependencies
* Node.JS must be installed
* Typescript 2 or higher must be installed 

## Usage
* Fork/download the repository
* In the command prompt: navigate to the repository
* npm install
* Create a .env file and set up your project
  * MXACCOUNT=your mx username
  * APIKEY=your mx api key
  * PROJECTID=ID of the mendix project
  * PROJECTNAME=name of the mendix project
  * BRANCHNAME=name of your branch, put null for mainline
  * REVISION=revision number, put -1 for latest in selected branch
* run the script with npm start
* check the out folder for the results
