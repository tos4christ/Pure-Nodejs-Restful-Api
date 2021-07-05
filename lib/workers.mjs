/**
 * Worker related tasks
 */

// Dependencies
import path from "path";
import fs from 'fs';
import https from 'https';
import http from 'http';
import { URL } from "url";
import { data } from './data.mjs';
import helpers from './helpers.mjs'
import { lib as _logs } from './logs.mjs';
import util from 'util';
const debug  = util.debuglog('workers');

// Instantiate the workers object
export const workers = {};

// Lookup all checks, get their data, send to a validator
workers.gatherAllChecks = function() {
    // Get all the checks
    data.list('checks', function(err, checks) {
        if(!err && checks && checks.length > 0) {
            checks.forEach(check => {
                // Read in the check data
                data.read('checks', check, function(err, originalCheckData) {
                    if(!err && originalCheckData) {
                        // Pass it to the check validator, and let that function continue or log error as needed
                        workers.validateCheckData(originalCheckData);
                    } else {
                        debug("Error reading one of the check data");
                    }
                });
            });
        } else {
            debug("Error: Could not find any checks to process");
        }
    });
}
// Sanity-check the check-data
workers.validateCheckData = function(checkData) {
    checkData = typeof(checkData) == 'object' && checkData !== null ? checkData : {};
    checkData.id = typeof(checkData.id) == 'string' && checkData.id.trim().length == 20 ? checkData.id.trim() : false;
    checkData.userPhone = typeof(checkData.userPhone) == 'string' && checkData.userPhone.trim().length == 10 ? checkData.userPhone.trim() : false;
    checkData.protocol = typeof(checkData.protocol) == 'string' && ['http', 'https'].indexOf(checkData.protocol) > -1 ? checkData.protocol : false;
    checkData.url = typeof(checkData.url) == 'string' && checkData.url.trim().length > 0 ? checkData.url.trim() : false;
    checkData.method = typeof(checkData.method) == 'string' && ['post', 'get', 'put', 'delete'].indexOf(checkData.method) > -1 ? checkData.method : false;
    checkData.successCodes = typeof(checkData.successCodes) == 'object' && checkData.successCodes instanceof Array && checkData.successCodes.length > 0 ? checkData.successCodes : false;
    checkData.timeoutSeconds = typeof(checkData.timeoutSeconds) == 'number' && checkData.timeoutSeconds % 1 == 0 && checkData.timeoutSeconds >= 1 && checkData.timeoutSeconds <= 5 ? checkData.timeoutSeconds : false;

    // Set the keys that may not be set (if the workers have never seen this check before)
    checkData.state = typeof(checkData.state) == 'string' && ['up', 'down'].indexOf(checkData.state) > -1 ? checkData.state : 'down';
    checkData.lastChecked = typeof(checkData.lastChecked) == 'number' && checkData.lastChecked > 0  ? checkData.lastChecked : false;

    // If all the checks pass, pass the data along to the next step in the process
    let {id, userPhone, protocol, url, method, successCodes, timeoutSeconds} = checkData;
    if (id, userPhone, protocol, url, method, successCodes, timeoutSeconds) {
        workers.performCheck(checkData);
    } else {
        debug("Error: one of the checks is not properly formatted. Skipping it.");
    }
}

// Performs the check, send the original checkData and the outcome of the check process, to the next step in the process
workers.performCheck = function(originalCheckData) {
    // Prepare the initial check outcome
    const checkOutcome = {
        'error' : false,
        'responseCode' : false
    };

    // Mark that the outcome has not been sent yet
    let outcomeSent = false;

    // Parse the hostname and the path out of the original check data
    const parsedUrl = new URL(originalCheckData.url);
    const hostName = parsedUrl.hostname;
    const path = parsedUrl.pathname; // Using path and not pathname cos we want the query string
    
    // Construct the request
    const requestDetails = {
        'protocol' : originalCheckData.protocol+':',
        'hostname' : hostName,
        'method' : originalCheckData.method.toUpperCase(),
        'path' : path,
        'timeout' : originalCheckData.timeoutSeconds * 1000
    }

    // Instantiate the request object (using either the http or https module)
    const _moduleToUse = originalCheckData.protocol == 'http' ? http : https;
    const req = _moduleToUse.request(requestDetails, function(res) {
        // Grab the status of the sent request
        const status = res.statusCode;

        // Update the checkOutcome and pass the data along
        checkOutcome.responseCode = status;
        if(!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind to the error event so it doesnt get thrown
    req.on('error', function(e) {
        // Update the checkOutcome and pass the data along
        checkOutcome.error = {
            'error' : true,
            'value' : e
        }
        if(!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind to the timeout event
    req.on('timeout', function(e) {
        // Update the checkOutcome and pass the data along
        checkOutcome.error = {
            'error' : true,
            'value' : 'timeout'
        }
        if(!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // End the request
    req.end();
}

// Process the check outcome and update the check data as needed, an trigger an alert to the user
// Special logic for accomodating a check that has never been tested before (don't alert that one)
workers.processCheckOutcome = function(originalCheckData, checkOutcome) {
    // Decide if the check is considered up or down
    const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

    // Decide if an alert is warranted
    const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

    // Log the outcome
    const timeOfCheck = Date.now();
    workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);
 
    // Update the check data
    const newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked =timeOfCheck;

    // Save the updates
    data.update('checks',newCheckData.id, newCheckData, function(err) {
        if(!err) {
            // Send the new check data to the next phase in the process if needed.
            if(alertWarranted) {
                workers.alertUserToStatusChange(newCheckData);
            } else {
                debug('Check outcome has not changed, no alert needed');
            }
        } else {
            debug("Error trying")
        }
    });
}

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = function(newCheckData) {
    const msg = 'Alert: Your check for'+newCheckData.method.toUpperCase()+' '+newCheckData.protocol+'://'+newCheckData.url+' is currently '+newCheckData.state;
    helpers.sendTwilioSms(newCheckData.userPhone, msg, function(err) {
        if(!err) {
            debug("Success: User was alerted to a status change in their check, via sms: ", msg);
        } else {
            debug("Error: Could not send sms alert to user who had a state change in their check");
        }
    })
}

// Logger function
workers.log = function(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) {
    // Form the log data
    const logData = {
        'check' : originalCheckData,
        'outcome' : checkOutcome,
        'state' : state,
        'alert' :alertWarranted,
        'time' : timeOfCheck
    };

    // Convert data to a string
    const logString = JSON.stringify(logData);

    // Determine the name of the log file
    const logFileName = originalCheckData.id;

    // Append the log string to the file
    _logs.append(logFileName, logString, function(err) {
        if(!err) {
            debug("Logging to file succeeded");
        } else {
            debug("logging to file failed");
        }
    });
};

// Timer to execute the worker-process once per minute
workers.loop = function() {
    setInterval(function() {
        workers.gatherAllChecks();
    }, 1000 * 60);
}

// Function to rotate (compress) log files
workers.rotateLogs = function() {
    // List all the (non compressed) log files
    _logs.list(false, function(err, logs) {
        if(!err && logs && logs.length > 0) {
            logs.forEach(logName => {
                // Compress the data to a different file
                const logId = logName.replace('.log', '');
                const newFileId = logId+'-'+Date.now();
                _logs.compress(logId, newFileId, function(err) {
                    if(!err) {
                        // Truncate the log
                        _logs.truncate(logId, function(err) {
                            if(!err) {
                                debug("Success truncating lof file");
                            } else {
                                debug("Error truncating logFile");
                            }
                        })
                    } else {
                        debug("Error compressing one of the log files", err);
                    }
                });
            })
        } else {
            debug("Error : could not find any logs to rotate");
        }
    })
}


// Timer to execute the log rotation process once per day
workers.logRotationLoop = function() {
    setInterval(function() {
        workers.rotateLogs();
    }, 1000 * 60 * 60 * 24);
}

// Init script
workers.init = function() {

    // Send to console, in yellow
    console.log('\x1b[32m%s\x1b[0m', 'Background workers are running');

    // Execute all the checks immediately
    workers.gatherAllChecks();

    // Call the loop so the checks will execute later on
    workers.loop();

    // Compress all the logs immediately
    workers.rotateLogs();

    // Call the compression loop so logs will be compressed later on
    workers.logRotationLoop();
}

// Get the URL and parse it
// const baseURL = `http://${req.headers.host}/`;
// const parsedUrl = new URL(req.url, baseURL);


