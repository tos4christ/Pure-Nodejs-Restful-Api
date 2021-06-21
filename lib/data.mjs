/*
* Library for storing and editing data
*/

// Dependencies
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import helpers from './helpers.mjs';


// Container for the module (to be exported)
const data = {};


// Base directory of the data folder
data.baseDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '/../.data/');
// Write data to a file
data.create = function(dir, file, data, callback) {
    // Open the file for writing
    fs.open(`${this.baseDir}${dir}\\${file}.json`,'wx',function(err,filedescriptor) {
        if(!err && filedescriptor) {
            // Convert data to string
            const stringData = JSON.stringify(data);

            // Write to file and close it
            fs.writeFile(filedescriptor, stringData, function(err) {
                if(!err) {
                    fs.close(filedescriptor, function(err) {
                        if(!err) {
                            callback(false);
                        } else {
                            callback('Error closing new file');
                        }
                    })
                } else {
                    callback('Error writing to new file');
                }
            });
        } else {
            callback('Could not create new file, it may already exist')
        }
    })
}

// Read data from a file
data.read = function(dir, file, callback) {
    fs.readFile(`${this.baseDir}${dir}\\${file}.json`, 'utf8', function(err, data) {
        if (!err && data) {
            const parsedData = helpers.parseJsonToObject(data);
            callback(false, parsedData);
        } else {
            callback(err, data);
        }
    });
}

// Update data inside a file
data.update = function(dir, file, data, callback) {
    // Open the file for writing
    fs.open(`${this.baseDir}${dir}\\${file}.json`, 'r+', function(err, filedescriptor) {
        if(!err && filedescriptor) {
            // Convert data to string
            const stringData = JSON.stringify(data);

            // Truncate the file
            fs.ftruncate(filedescriptor, function(err) {
                if(!err) {
                    // Write to file now and close it
                    fs.writeFile(filedescriptor, stringData, function(err) {
                        if(!err) {
                            fs.close(filedescriptor, function(err) {
                                if(!err) {
                                    callback(false);
                                } else {
                                    callback('Error closing this file');
                                }
                            })
                        } else {
                            callback('Error writing to existing file');
                        }
                    })

                } else {
                    callback('Error truncating file');
                }
            })
        } else {
            callback('Could not open the file for updating, it may not exist yet');
        }
    })
}

// Delete a file
data.delete = function(dir, file, callback) {
    // Unlink the file
    fs.unlink(`${this.baseDir}${dir}\\${file}.json`, function(err) {
        if(!err) {
            callback(200);
        } else {
            callback(500, {'Error' : 'Error deleting the file');
        }
    })
}

// Export the module
export { data };
