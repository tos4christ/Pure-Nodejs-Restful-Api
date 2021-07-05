/**
 * Server-related tasks
 */
// Dependencies
import http from 'http';
import https from 'https';
import { URL } from 'url';
import { StringDecoder } from 'string_decoder';
import { environmentToExport } from './config.mjs';
import fs from 'fs';
import router from './routers.mjs';
import helpers from './helpers.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import util from 'util';
const debug = util.debuglog("server");

// Instantiate the server module Object
const server = {};

// Instantiating the HTTP server
server.httpServer = http.createServer((req, res) => {
    server.unifiedServer(req, res);
});

// Instantiate the HTTPS server
server.httpsServerOptions = {
    'key' : fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'/../https/key.pem')),
    'cert' : fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)),'/../https/cert.pem'))
};
server.httpsServer = https.createServer(server.httpsServerOptions,(req, res) => {
    server.unifiedServer(req, res);
});

// All the server logic for both http and https server
server.unifiedServer = function(req, res) {
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
            'payload' : helpers.parseJsonToObject(buffer),
            'baseUrl' : baseURL
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

            // If the response is 200, print green else print red
            if(statusCode==200) {
                debug('\x1b[32m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' +statusCode);
            } else {
                debug('\x1b[31m%s\x1b[0m', method.toUpperCase() + ' /' + trimmedPath + ' ' +statusCode);
            }
            
        });
    });
}

// Init function
server.init = () => {
    // Start the server, and have it listen on port 3000
    server.httpServer.listen(environmentToExport.httpPort, () => {
        console.log('\x1b[31m%s\x1b[0m', 'Server is listening on port ' + environmentToExport.httpPort + ' in ' + environmentToExport.envName + ' mode');
    });

    // Start the HTTPS server
    server.httpsServer.listen(environmentToExport.httpsPort, () => {
        
        console.log('\x1b[36m%s\x1b[0m', 'Server is listening on port ' + environmentToExport.httpsPort + ' in ' + environmentToExport.envName + ' mode');
    });
}

export default server;
