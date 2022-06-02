const fetch = require('node-fetch');
const engine = require('./engine');
const config = require('./config');
const {parser: jsonlParser} = require('stream-json/jsonl/Parser');
const fs = require('fs');

// Number of current active games
let activeGames = 0

// Color reference of the active games
let gameColor = {}

exports.fetchOnlineBots = function () {
    let bots = []
    fetch(`https://lichess.org/api/bot/online`,{
        headers: { 'Authorization': 'Bearer '+config.API_KEY}})
        .then(res => {
            if (res.status !== 200) {
                console.log(`Status ${res.status} on Endpoint /api/bot/online`)
            }
            res.body
                .pipe(jsonlParser())
                .on('data', function (json) {
                    bots.push(json.value);
                })
                .on('error', console.error)
                .on('finish', () => {
                    const obj = {
                        bots: bots
                    }
                    const json = JSON.stringify(obj);
                    fs.writeFile('bots.json', json, 'utf8', () => {
                        console.log(`${bots.length} other bots online`)
                    });
                });
        });
}

exports.challengeRandomBot = function () {
    if (activeGames >= config.MAX_ACTIVE_GAMES) {
        return
    }
    fs.readFile('bots.json', 'utf8', function readFileCallback(err, data){
        if (err){
            console.log(err);
        } else {
            let obj = JSON.parse(data);
            let bots = obj.bots;
            let filteredBots = [];
            // Filter the bots by rating
            for (const bot of bots) {
                if (bot.perfs.blitz.rating > 1600
                    && bot.perfs.rapid.rating > 1600
                    && bot.perfs.blitz.rating < 2500
                    && bot.perfs.rapid.rating < 2500
                    && bot.tosViolation !== true) {
                    filteredBots.push(bot)
                }
            }
            if (filteredBots.length === 0) {
                return
            }
            // Randomly choose blitz or rapid
            // Blitz
            let clockLimit = 300
            let clockIncrement = 3
            let random_boolean = Math.random() < 0.5;
            if (random_boolean) {
                // Rapid
                clockLimit = 600
                clockIncrement = 5
            }
            // Select a random bot to challenge
            const randomBot = filteredBots[Math.floor(Math.random()*filteredBots.length)];
            console.log('Challenging '+randomBot.id);
            fetch(`https://lichess.org/api/challenge/${randomBot.id}`, {
                method: 'post',
                headers: { 'Authorization': 'Bearer '+config.API_KEY},
                body: new URLSearchParams({
                    'rated': true,
                    'clock.limit': clockLimit,
                    'clock.increment': clockIncrement
                })})
                .then(function (res) {
                    if (res.status !== 200) {
                        console.log(`Status ${res.status} on Endpoint /api/challenge/...`)
                    }
                })
                .catch(function (error) {
                    console.log(error)
                })
        }
    });
}

exports.listenToIncomingEvents = function() {
    console.log('Listening for incoming events...')
    fetch(`https://lichess.org/api/stream/event`,{
        headers: { 'Authorization': 'Bearer '+config.API_KEY}})
        .then(res => {
            if (res.status !== 200) {
                console.log(`Status ${res.status} on Endpoint /api/stream/event`)
            }
            res.body
                .pipe(jsonlParser())
                .on('data', function (json) {
                    handleIncomingEvent(json.value);
                })
        });
}

function handleIncomingEvent(json) {
    if (json.type === 'gameStart') {
        // Listen to game state
        activeGames += 1;
        console.log('Active Games: '+activeGames);
        listenToGameState(json.game.id);
    } else if (json.type === 'gameFinish') {
        activeGames -= 1;
        delete gameColor[json.game.id]
        console.log(json);
        console.log('Active Games: '+activeGames);
    } else if (json.type === 'challenge') {
        // Handle the incoming challenge
        handleIncomingChallenge(json.challenge);
    } else {
        console.log('Unhandled incoming event: '+json.type);
    }
}

function handleIncomingChallenge(challenge) {
    if (challenge.challenger.id === config.BOT_PLAYER_ID) {
        return
    }
    if (activeGames >= config.MAX_ACTIVE_GAMES) {
        console.log('Declined challenge from '+challenge.challenger.name+' due to max game limit');
        // Decline challenge
        fetch(`https://lichess.org/api/challenge/${challenge.id}/decline`, {
            method: 'post',
            headers: { 'Authorization': 'Bearer '+config.API_KEY},
            body: new URLSearchParams({
                'reason': 'later',
            })})
            .then(function (res) {
                if (res.status !== 200) {
                    console.log(`Status ${res.status} on Endpoint /api/challenge/.../decline`)
                }
            })
            .catch(function (error) {
                console.log(error)
            })
    } else if (challenge.speed === 'blitz' || challenge.speed === 'rapid') {
        console.log('Accepted challenge from '+challenge.challenger.name);
        // Accept challenge
        fetch(`https://lichess.org/api/challenge/${challenge.id}/accept`, {
            method: 'post',
            headers: { 'Authorization': 'Bearer '+config.API_KEY}})
            .then(function (res) {
                if (res.status !== 200) {
                    console.log(`Status ${res.status} on Endpoint /api/challenge/.../accept`)
                }
            })
            .catch(function (error) {
                console.log(error)
            })
    } else {
        console.log('Declined challenge from '+challenge.challenger.name+' due unsupported variant');
        // Decline challenge
        fetch(`https://lichess.org/api/challenge/${challenge.id}/decline`, {
            method: 'post',
            headers: { 'Authorization': 'Bearer '+config.API_KEY},
            body: new URLSearchParams({
                'reason': 'variant',
            })})
            .then(function (res) {
                if (res.status !== 200) {
                    console.log(`Status ${res.status} on Endpoint /api/challenge/.../decline`)
                }
            })
            .catch(function (error) {
                console.log(error)
            })
    }
}

function listenToGameState(gameId) {
    fetch(`https://lichess.org/api/bot/game/stream/${gameId}`,{
        headers: { 'Authorization': 'Bearer '+config.API_KEY}})
        .then(res => {
            if (res.status !== 200) {
                console.log(`Status ${res.status} on Endpoint /api/bot/game/stream/...`)
            }
            res.body
                .pipe(jsonlParser())
                .on('data', async function (json) {
                    if (json.value.type === 'gameFull') {
                        if (json.value.white.id === config.BOT_PLAYER_ID) {
                            gameColor[json.value.id] = 'w'
                        } else if (json.value.black.id === config.BOT_PLAYER_ID) {
                            gameColor[json.value.id] = 'b'
                        }
                    }
                    await handleGameStateResponse(gameId, json.value);
                })
        });
}

async function handleGameStateResponse(gameId, json) {
    if (json['type'] === 'gameFull') {
        // Full game data. All values are immutable, except for the state field.
        await calculateNextMove(gameId, json.state.moves);
    } else if (json['type'] === 'gameState') {
        // Current state of the game. Immutable values not included.
        // Do not calculate a move if it is not our turn
        if (gameColor[gameId] === 'w' && json.moves.split(' ').length % 2 === 1) {
            return
        } else if (gameColor[gameId] === 'b' && json.moves.split(' ').length % 2 === 0) {
            return
        }
        if (json.status === 'started') {
            await calculateNextMove(gameId, json.moves);
        }
    } else if (json['type'] === 'chatLine') {
        // Chat message sent by a user (or the bot itself) in the room "player" or "spectator".
        fs.appendFileSync('chat.txt', json.username+': '+json.text+'\n');
    }
}

async function calculateNextMove(gameId, moves) {
    // Calculate an AI move
    let move = await engine.calculateMove(moves);
    fetch(`https://lichess.org/api/bot/game/${gameId}/move/${move}`, {
        method: 'post',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer '+config.API_KEY}})
        .then(res => res.json())
        .then(function (json) {
            if (json.ok !== true) {
                console.log(json)
            }
        });
}
