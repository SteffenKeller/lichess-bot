const stockfish = require('stockfish');
const workerpool = require('workerpool');
const config = require('./config');

workerpool.worker({
    calculateMove: calculateMove
});

function calculateMove(moves) {
    return new Promise(async function (resolve, reject) {
        const engine = stockfish();
        engine.onmessage = async function (msg) {
            if (typeof (msg === "string") && msg.match("bestmove")) {
                let message = msg.split(' ')
                await engine.postMessage("stop");
                resolve(message[1]);
            }
        };
        await engine.postMessage("uci");
        await engine.postMessage("ucinewgame");
        await engine.postMessage("isready");
        await engine.postMessage("position startpos moves " + moves);
        await engine.postMessage("go depth "+config.ENGINE_DEPTH);
    })
}