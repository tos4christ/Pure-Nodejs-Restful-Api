/*
* Primary file for the API
*
*/

// Dependencies
import server from './lib/server.mjs';
import {workers} from './lib/workers.mjs';
// import workers from './lib/workers.mjs';

// Declare the app
const app = {};

// Init function
app.init = function() {
    // Start the server
    server.init();

    // Start the workers
    workers.init();

}

// Execute
app.init();

export default app;
