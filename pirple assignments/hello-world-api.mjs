/*
Author: Oluwatosin Fetuga
Projetc to create a simple Hello World server that 
returns a json message to the route /hello
*/

import http from 'http';
import { URL } from 'url';

// Create the router Handler object and the handler for each route as key value pair
const routeHandler = {};
// Hello route
routeHandler.hello = function(callback) {
    callback(200, {message: 'Hello World, this is Pirple Island'});
}
// Not found route
routeHandler.notFound = function(callback) {
    callback(404);
}

// Create the router object to hold the router handlers
const router = {
    'hello' : routeHandler.hello
};

const httpServer = http.createServer(function(req, res) {
    // Get the url and parse it
    const baseURL = `http://${req.headers.host}/`;
    const parsedUrl = new URL(req.url, baseURL);

    // Trim the url
    const { pathname } = parsedUrl;
    const trimmedPath = pathname.replace(/^\/+|\/+$/g,'');

    req.on('data', () => {
        return false;
    })

    req.on('end', function() {
        // Match the path to a router function or default to not found
        const chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : routeHandler.notFound;

        chosenHandler(function(statusCode, payload) {
            // Validate the statusCode
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

            // Validate the payload
            payload = typeof(payload) == 'object' ? payload : {};

            // Convert payload to a string
            const payloadString = JSON.stringify(payload);

            // Prepare the response with its headers and send it
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);
        });

    });
});

// Start the server to listen on port 3000
httpServer.listen(3000, () => {
    console.log('Server listening on port 3000');
});
