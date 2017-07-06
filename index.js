'use strict';

var util = require('util');
var async = require('async');
var msRestAzure = require('ms-rest-azure');
var ComputeManagementClient = require('azure-arm-compute');
var StorageManagementClient = require('azure-arm-storage');
var NetworkManagementClient = require('azure-arm-network');
var ResourceManagementClient = require('azure-arm-resource').ResourceManagementClient;
var js = require('jsonpath');


_validateEnvironmentVariables();
var clientId = process.env['client-id'];
var domain = process.env['domain'];
var secret = process.env['secret'];
var subscriptionId = process.env['AZURE_SUBSCRIPTION_ID'];
var resourceClient, computeClient, storageClient, networkClient;
//Sample Config
var randomIds = {};
var location = 'westus';
var accType = 'Standard_LRS';
var resourceGroupName = _generateRandomId('testrg', randomIds);
var vmName = _generateRandomId('testvm', randomIds);
var storageAccountName = _generateRandomId('testac', randomIds);
var vnetName = _generateRandomId('testvnet', randomIds);
var subnetName = _generateRandomId('testsubnet', randomIds);
var publicIPName = _generateRandomId('testpip', randomIds);
var networkInterfaceName = _generateRandomId('testnic', randomIds);
var ipConfigName = _generateRandomId('testcrpip', randomIds);
var domainNameLabel = _generateRandomId('testdomainname', randomIds);
var osDiskName = _generateRandomId('testosdisk', randomIds);

// Ubuntu config
var publisher = 'Canonical';
var offer = 'UbuntuServer';
var sku = '14.04.3-LTS';
var osType = 'Linux';

var adminUsername = 'notadmin';
var adminPassword = 'Pa$$w0rd92';

msRestAzure.loginWithServicePrincipalSecret(clientId, secret, domain, function (err, credentials, subscriptions) {
  if (err) return console.log(err);
  resourceClient = new ResourceManagementClient(credentials, subscriptionId);
  computeClient = new ComputeManagementClient(credentials, subscriptionId);
  storageClient = new StorageManagementClient(credentials, subscriptionId);
  networkClient = new NetworkManagementClient(credentials, subscriptionId);
  
  async.series([
    // function (callback) {
    //   ///////////////////////////////////////////////////////////////////////////////////
    //   //Task1: Create VM. This is a fairly complex task. Hence we have a wrapper method//
    //   //named createVM() that encapsulates the steps to create a VM. Other tasks are   //
    //   //fairly simple in comparison. Hence we don't have a wrapper method for them.    //
    //   ///////////////////////////////////////////////////////////////////////////////////
    //   console.log('\n>>>>>>>Start of Task1: Create a VM named: ' + vmName);
    //   createVM(function (err, result) {
    //     if (err) {
    //       console.log(util.format('\n???????Error in Task1: while creating a VM:\n%s', 
    //         util.inspect(err, { depth: null })));
    //       callback(err);
    //     } else {
    //       console.log(util.format('\n######End of Task1: Create a VM is succesful.\n%s', 
    //         util.inspect(result, { depth: null })));
    //       callback(null, result);
    //     }
    //   });
    // },
    // function (callback) {
    //   /////////////////////////////////////////////////////////
    //   //Task2: Get Information about the vm created in Task1.//
    //   /////////////////////////////////////////////////////////
    //   console.log('\n>>>>>>>Start of Task2: Get VM Info about VM: ' + vmName);
    //   computeClient.virtualMachines.get(resourceGroupName, vmName, function (err, result) {
    //     if (err) {
    //       console.log(util.format('\n???????Error in Task2: while getting the VM Info:\n%s', 
    //         util.inspect(err, { depth: null })));
    //       callback(err);
    //     } else {
    //       console.log(util.format('\n######End of Task2: Get VM Info is successful.\n%s', 
    //         util.inspect(result, { depth: null })));
    //       callback(null, result);
    //     }
    //   });
    // },
    // function (callback) {
    //   ///////////////////////////
    //   //Task3: Poweroff the VM.//
    //   ///////////////////////////
    //   console.log('\n>>>>>>>Start of Task3: Poweroff the VM: ' + vmName);
    //   computeClient.virtualMachines.powerOff(resourceGroupName, vmName, function (err, result) {
    //     if (err) {
    //       console.log(util.format('\n???????Error in Task3: while powering off the VM:\n%s', 
    //         util.inspect(err, { depth: null })));
    //       callback(err);
    //     } else {
    //       console.log(util.format('\n######End of Task3: Poweroff the VM is successful.\n%s', 
    //         util.inspect(result, { depth: null })));
    //       callback(null, result);
    //     }
    //   });
    // },
    // function (callback) {
    //   ////////////////////////
    //   //Task4: Start the VM.//
    //   ////////////////////////
    //   console.log('\n>>>>>>>Start of Task4: Start the VM: ' + vmName);
    //   computeClient.virtualMachines.start(resourceGroupName, vmName, function (err, result) {
    //     if (err) {
    //       console.log(util.format('\n???????Error in Task4: while starting the VM:\n%s', 
    //         util.inspect(err, { depth: null })));
    //       callback(err);
    //     } else {
    //       console.log(util.format('\n######End of Task4: Start the VM is successful.\n%s', 
    //         util.inspect(result, { depth: null })));
    //       callback(null, result);
    //     }
    //   });
    // },
    function (callback) {
      //////////////////////////////////////////////////////
      //Task5: Lisitng All the VMs under the subscription.//
      //////////////////////////////////////////////////////
      console.log('\n>>>>>>>Start of Task5: List all vms under the current subscription.');
      computeClient.virtualMachines.listAll(function (err, result) {
        if (err) {
          console.log(util.format('\n???????Error in Task5: while listing all the vms under ' + 
            'the current subscription:\n%s', util.inspect(err, { depth: null })));
          callback(err);
        } else {
         result = js.query(result,'$.*.name')

          console.log(util.format('\n######End of Task5: List all the vms under the current ' + 
            'subscription is successful.\n%s', util.inspect( result, { depth: null })));
          callback(null, result);
        }
      });
    }
  ],
  //final callback to be run after all the tasks
  function (err, results) {
    if (err) {
      console.log(util.format('\n??????Error occurred in one of the operations.\n%s', 
        util.inspect(err, { depth: null })));
    } else {
      console.log(util.format('\n######All the operations have completed successfully. ' + 
        'The final set of results are as follows:\n%s', util.inspect(results, { depth: null })));
      console.log(util.format('\n\n-->Please execute the following script for cleanup:\nnode cleanup.js %s %s', resourceGroupName, vmName));
    }
    return;
  });
});

function _validateEnvironmentVariables() {
  var envs = [];
  if (!process.env['client-id']) envs.push('client-id');
  if (!process.env['domain']) envs.push('domain');
  if (!process.env['secret']) envs.push('secret');
  if (!process.env['AZURE_SUBSCRIPTION_ID']) envs.push('AZURE_SUBSCRIPTION_ID');
  if (envs.length > 0) {
    throw new Error(util.format('please set/export the following environment variables: %s', envs.toString()));
  }
}

function _generateRandomId(prefix, exsitIds) {
  var newNumber;
  while (true) {
    newNumber = prefix + Math.floor(Math.random() * 10000);
    if (!exsitIds || !(newNumber in exsitIds)) {
      break;
    }
  }
  return newNumber;
}
