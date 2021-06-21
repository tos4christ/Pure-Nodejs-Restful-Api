/*
* Primary file for the API
*
*/

// Dependencies
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { StringDecoder } from 'string_decoder';
import { environmentToExport } from './config.mjs';
import fs from 'fs';
import router from './lib/routers.mjs';
import helpers from './lib/helpers.mjs';

// Instantiating the HTTP server
const httpServer = http.createServer((req, res) => {
    unifiedServer(req, res);
})
// Start the server, and have it listen on port 3000
httpServer.listen(environmentToExport.httpPort, () => {
    console.log('Server is listening on port ' + environmentToExport.httpPort + ' in ' + environmentToExport.envName + ' mode');
})

// Instantiate the HTTPS server
const httpsServerOptions = {
    'key' : fs.readFileSync('./https/key.pem'),
    'cert' : fs.readFileSync('./https/cert.pem')
};
const httpsServer = https.createServer(httpsServerOptions,(req, res) => {
    unifiedServer(req, res);
})

// Start the HTTPS server
httpsServer.listen(environmentToExport.httpsPort, () => {
    console.log('Server is listening on port ' + environmentToExport.httpsPort + ' in ' + environmentToExport.envName + ' mode');
})

// All the server logic for both http and https server
const unifiedServer = function(req, res) {
    // Get the URL and parse it
    const baseURL = `http://${req.headers.host}/`;
    const parsedUrl = new URL(req.url, baseURL);

    // Get the path from the URL
    const { pathname } = parsedUrl;
    const trimmedPath = pathname.replace(/^\/+|\/+$/g,'');

    // Get the query string as an object
    const { searchParams } = parsedUrl;
    
    // Get the HTTP method
    const { method } = req;

    // Get the headers as an object
    const { headers } = req;

    //  Get the payload, if any
    const decoder = new StringDecoder('utf-8');
    let buffer = '';

    // handle the data event on req object
    req.on('data', function(data) {
        buffer += decoder.write(data);
    });
    // handle the end event on req object
    req.on('end',  function() {
        buffer += decoder.end();

        // Chose handler request should go to, it goes to not found if no match
        const chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : router['notFound'];

        // Construct the data object
        const data = {
            'trimmedPath' : trimmedPath,
            'searchParams' : searchParams,
            'method' : method,
            'headers' : headers,
            'payload' : helpers.parseJsonToObject(buffer)
        };

        // Route the request to the handler specified in the router
        chosenHandler(data, function(statusCode, payload) {
            // Use the status code called back by the handler or use the default status code
            statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
            // Use the payload caled back by the handler, or default to an emoty object
            payload = typeof(payload) == 'object' ? payload : {};

            // Conver the payload to a string
            const payloadString = JSON.stringify(payload);

            // Return the response
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);

            // Log the request path
            console.log(`Returning this response: ${statusCode}, ${payloadString}`);
        });
    });
}
