import cluster from 'cluster';
import net from 'net';
// Sending message from worker to master
// if (cluster.isMaster) {

//   // Keep track of http requests
//   let numReqs = 0;
//   setInterval(() => {
//     console.log(`numReqs = ${numReqs}`);
//   }, 1000);

//   // Count requests
//   function messageHandler(msg) {
//     if (msg.cmd && msg.cmd === 'notifyRequest') {
//       numReqs += 1;
//     }
//   }

//   // Start workers and listen for messages containing notifyRequest
//   const numCPUs = require('os').cpus().length;
//   for (let i = 0; i < numCPUs; i++) {
//     cluster.fork();
//   }

//   for (const id in cluster.workers) {
//     cluster.workers[id].on('message', messageHandler);
//   }

// } else {

//   // Worker processes have a http server.
//   http.Server((req, res) => {
//     res.writeHead(200);
//     res.end('hello world\n');

//     // Notify master about the request
//     process.send({ cmd: 'notifyRequest' });
//   }).listen(8000);
// }


// Disconnecting and killing a worker properly
let timeout;
if (cluster.isMaster) {
    const worker = cluster.fork();    
  
    worker.on('listening', (address) => {
      worker.send('shutdown');
      // worker.disconnect();
    });
  
    worker.on('disconnect', () => {
        console.log('its being killed here')
      clearTimeout(timeout);
    });
    // Use the boolean value worker.exitedAfterDisconnect to check if it was a voluntary exit or not
    cluster.on('exit', (worker, code, signal) => {
        if(worker.exitedAfterDisconnect === true) {
            console.log("Oh it was just a voluntary - no need to worry");
        }
    })
  
  } else if (cluster.isWorker) {
      console.log(cluster.worker.id, 'this is the i');
    const server = net.createServer((socket) => {
      // Connections never end
    });
  
    server.listen(8000);
  
    process.on('message', (msg) => {
      if (msg === 'shutdown') {
        // Initiate graceful close of any connections to server
        timeout = setTimeout(() => {
            cluster.worker.kill();
          }, 2000);
      }
    });
  }