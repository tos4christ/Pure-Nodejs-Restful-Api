/*
* Helpers for various tasks
*/

// Dependencies
import crypto from 'crypto';
import { environmentToExport as config } from '../config.mjs';
import https from 'https';
import querystring from 'querystring';

// Create helpers Object for helper functions
const helpers = {};

// Create SHA256 hash
helpers.hash = password => {
    if (typeof(password) == 'string' && password.length > 0) {
        const hash = crypto.createHmac('sha256', config.hashingSecret).update(password).digest('hex');
        return hash;
    } else {
        return false;
    }
};

// Parse a JSON string to an object in all cases , without throwing
helpers.parseJsonToObject = function(buffer) {
    try {
        const obj = JSON.parse(buffer);
        return obj;
    } catch(e) {
        return {};
    }
}

// Create a string of random alphanumeric characters, of a given length
helpers.createRandomString = function(strLength) {
    strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : false;
    if(strLength) {
        // Define all the possible characters that could go into a string
        const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

        // Start the final string
        let str = '';
        for(let i = 1; i <= strLength; i++) {
            // Get a random character from the possibleCharacter string
            const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
            // Append this character to the final string
            str += randomCharacter;
        }
        return str;
    } else {
        return false;
    }
}

// Send an SMS message via Twilio
helpers.sendTwilioSms = function(phone, msg, callback, countryCode = '+1') {
    // Validate parameters
    phone = typeof(phone) == 'string' && phone.trim().length == 10 ? phone.trim() : false;
    msg = typeof(msg) == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;

    if(phone && msg) {
        // Configure the request payload
        const payload = {
            'From' : config.twilio.fromPhone,
            'To' : (countryCode+phone),
            'Body' : msg
        };

        // Stringigy the payload
        const stringPayload = querystring.stringify(payload);

        // Configure the request details
        const requestDetails = {
            'protocol' : 'https',
            'hostname' : 'api.twilio.com',
            'method' : 'POST',
            'path' : '/2010-04-01/Accounts/'+config.twilio.accountSid+'/Messages.json',
            'auth' : config.twilio.accountSid+':'+config.twilio.authToken,
            'headers' : {
                'Content-Type' : 'application/x-www-form-urlencoded',
                'Content-Length' : Buffer.byteLength(stringPayload)
            }
        };

        // Instantiate the request object
        const req = https.request(requestDetails, function(res) {
            // Grab the status of the sent request
            const status = res.statusCode;
            // Callback successfully if the request went through
            if(status == 200 || status == 201) {
                callback(false);
            } else {
                callback('Status code returned was '+status);
            }
        });

        // Bind to the error event so it doesn't get thrown
        req.on('error', function(e) {
            callback(e);
        });

        // Add the payload
        req.write(stringPayload);

        // End the request
        req.end();




    } else {
        callback(400, {'Error' : 'Given parameters are missing or invalid'});
    }
}

export default helpers;
