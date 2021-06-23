/*
* Create the router to match paths to their handlers
*/

// Import the dependencies
import handlers from './handlers.mjs';

// Define a request router
const router = {
    'ping': handlers.ping,
    'users': handlers.users,
    'notFound': handlers.notFound,
    'tokens' : handlers.tokens,
    'checks' : handlers.checks
}

export default router;
