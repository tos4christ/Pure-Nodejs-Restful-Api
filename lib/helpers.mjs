/*
* Helpers for various tasks
*/

// Dependencies
import crypto from 'crypto';
import { environmentToExport as config } from '../config.mjs';

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

export default helpers;
