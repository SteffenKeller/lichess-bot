const workerpool = require('workerpool');

exports.calculateMove = function (moves) {
    return new Promise(async function (resolve, reject) {
        const pool = workerpool.pool(__dirname + '/engineWorker.js');
        pool.exec('calculateMove', [moves])
            .then(function (move) {
                resolve(move);
            })
            .catch(function (err) {
                reject(err);
                console.error(err);
            })
            .then(function () {
                pool.terminate(); // terminate all workers when done
            });
    })
}
