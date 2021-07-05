import cluster from "cluster";
import { sign } from "crypto";
import http from 'http';
import os from 'os';

const numCPUs = os.cpus().length;

let workers = [];
if(cluster.isMaster) {
    MasterProcess();
} else {
    childProcess();
}

function childProcess() {
    console.log(`Worker ${process.pid} started`);
    // // Workers can share any TCP connection
    // // In this case it is an HTTP server
    // http.createServer((req, res) => {
    //     res.writeHead(200);
    //     res.end('hello world\n ');
    // }).listen(5000, () => console.log('server started listening', process.pid));

    // On Error method of a worker
    const callback = () => 'hello';
    process.on('error', callback);

    process.on('message', message => {
        console.log(`Worker ${process.pid} received message ${JSON.stringify(message)}`);
    });

    console.log(`Worker ${process.pid} sends message to Master`);
    process.send({msg: `Message from worker ${process.pid}`});

    console.log('this', cluster.worker.process.pid);
    console.log(`Worker ${process.pid} finished`);
    setTimeout(() => cluster.worker.disconnect(), 2000);

    cluster.worker.on('disconnect', (code, signal) => {
        if(signal) {
            console.log(`worker was killed by signal: ${signal}`);
        } else if(code !== 0) {
            console.log(`worker exited with error code: ${code}`);
        } else {
            console.log('worker success!');
        }
    })
}

function MasterProcess() {
    console.log(`Master ${process.pid} is running`);

    // Fork workers
    for(let i = 0; i < numCPUs; i++) {
        console.log(`Forking process number ${i}`);
        const worker = cluster.fork();
        workers.push(worker);

        // Listen for messages from worker
        worker.on('message', message => {
            console.log(`Master ${process.pid} receives message ${JSON.stringify(message)} from worker ${worker.process.pid}`)
        })
    }

    // Send message to the workers
    workers.forEach(worker => {
        console.log(`Master ${process.pid} sends message to worker ${worker.process.pid}...`);
        worker.send({msg: `Message from the master ${process.pid}`}, this);
    })

    // cluster.on('exit', (worker, code, signal) => {
    //     console.log(`worker ${worker.process.pid} died with this code ${code} and signal is ${signal}`);
    // });
    
}
