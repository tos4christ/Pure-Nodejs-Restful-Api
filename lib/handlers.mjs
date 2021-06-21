/*
* These are the request handlers
*/

// Dependencies
import { data } from './data.mjs';
import helpers from './helpers.mjs';

// Assign the data module to _data constant
const _data = data;

// Define the handlers
const handlers = {};

// Users
handlers.users = function(data, callback) {
    const acceptableMethods = ['POST', 'GET', 'PUT', 'DELETE'];
    if(acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method.toLowerCase()](data, callback);
    } else {
        callback(405);
    }
}

// Container for the users submethods
handlers._users = {};

// Users ~ post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = function(data, callback) {
    // Check that all required fields are checked out
    const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 6 ? data.payload.password.trim() : false;
    const tosAgreement = typeof(data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement == true ? true : false;

    console.log(data.payload, 'the firstname');
    if (firstName && lastName && phone && password && tosAgreement) {
        // Make sure that the user does not already exist
        _data.read('users', phone, function(err, data) {
            if (err) {
                // Hash the password
                const hashedPassword = helpers.hash(password);
                if (hashedPassword) {
                    // Create the user object
                    const userObject = {
                        firstName,
                        lastName,
                        phone,
                        'hashedPassword' : hashedPassword,
                        tosAgreement
                    }
                    // Store the user in the users directory
                    _data.create('users', phone, userObject, function(err) {
                        if (!err) {
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, {'Error' : 'Could not create the new user'});
                        }
                    });
                } else {
                    callback(500, {'Error' : 'Could not hash the user\'s password'} );
                }

            } else {
                // User already exists
                callback(400, {'Error': 'A user with that phone number already exists'})
            }
        })
    } else {
        callback(400, {'Error': 'Missing required fields'});
    }
}

// Users ~ get
// Required data: phone
// Optional data: none
// @TODO Only let an authenticated user access their own object and not any one else.
handlers._users.get = function(data, callback) {
    // Check that the phone number is valid
    const phone = typeof(data.searchParams.get('phone')) == 'string' && data.searchParams.get('phone').trim().length == 10 ? data.searchParams.get('phone') : false;
    if (phone) {
        // Look up user
        _data.read('users', phone, function(err, data) {
            if(!err && data) {
                // Remove the hashed password before returning it to the requester
                delete data.hashedPassword;
                callback(200, data);
            } else {
                callback(404);
            }
        })

    } else {
        callback(400, {'Error' : 'Missing the required field'});
    }
}

// Users ~ put
// Required data: phone
// Optional data: firstName, lastName, phone (at least one must be specified)
// @TODO Only let an authenticated user access their own object and not any one else.
handlers._users.put = function(data, callback) {
    // Check for the required field
    const phone = typeof(data.payload.phone) == 'string' && data.payload.phone.trim().length == 10 ? data.payload.phone : false;

    // Check for the optional fields
    const firstName = typeof(data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    const lastName = typeof(data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    const password = typeof(data.payload.password) == 'string' && data.payload.password.trim().length > 6 ? data.payload.password.trim() : false;
    
    // Error if the phone is invalid
    if(phone) {
        // Error if nothing is sent to update
        if (firstName || lastName || password) {
            // Look up the user
            _data.read('users', phone, function(err, userData) {
                if (!err && userData) {
                    // Update the fields necessary
                    if (firstName) {
                        userData.firstName = firstName;
                    }
                    if (lastName) {
                        userData.lastName = lastName;
                    }
                    if (password) {
                        userData.hashedPassword = helpers.hash(password);
                    }
                    // Store the new updates
                    _data.update('users', phone, userData, function(err) {
                        if(!err) {
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, {'Error' : 'Could not update the user'});
                        }
                    })
                } else {
                    callback(400, {'Error' : 'The specified user does not exist'});
                }
            })
        } else {
            callback(400, {'Error' : 'Nothing to update'});
        }
        
    } else {
        callback(400, {'Error' : 'Missing required field'});
    }

}

// Users ~ delete
// Required data: phone
// @TODO Cleanup (delete) any other data files associated with this user
// @TODO Only let an authenticated user delete their own object and not any one else.
handlers._users.delete = function(data, callback) {
    // Check that the phone number is valid
    const phone = typeof(data.searchParams.get('phone')) == 'string' && data.searchParams.get('phone').trim().length == 10 ? data.searchParams.get('phone') : false;
    if (phone) {
        // Look up user
        _data.read('users', phone, function(err, data) {
            if(!err && data) {
                _data.delete('users', phone, function(err) {
                    if(!err) {
                        callback(200);
                    } else {
                        callback(500, {'Error' : 'Could not delete the specified user'});
                    }
                });
            } else {
                callback(400, {'Error' : 'Could not find the specified user'});
            }
        });
    } else {
        callback(400, {'Error' : 'Missing the required field'});
    }
}

// Not found handler
handlers.notFound = function(data, callback) {
    callback(404);
}

// Ping handler
handlers.ping = function(data, callback) {
    callback(200);
}

// Export the module
export default handlers;
