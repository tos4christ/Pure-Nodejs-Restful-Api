import http from 'http';
import { AsyncLocalStorage } from 'async_hooks';

const asyncLocalStorage = new AsyncLocalStorage;

// const store = {id : 1};
// asyncLocalStorage.enterWith(store);
// // console.log(asyncLocalStorage.getStore());

// asyncLocalStorage.exit((store = asyncLocalStorage.getStore()) => {
//     return console.log(store);
// })

function logWithId(msg) {
    const id = asyncLocalStorage.getStore();
    console.log(`${id !== undefined ? id : '-'}`, msg);
};

let idSeq = 0;
http.createServer(async (req, res) => {
    const result = await asyncLocalStorage.run(idSeq++, () => {
        logWithId('start');
        // Carry out any asynchronous calls here
        setImmediate(() => {
            logWithId('finish');            
        });
        return true;
    })
    console.log(result);
    res.end();
}).listen(8080);
http.get('http://localhost:8080');
http.get('http://localhost:8080');
http.get('http://localhost:8080');
