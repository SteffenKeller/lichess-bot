# lichess-bot

A simple [lichess.org](https://lichess.org) chess bot implementing the [Stockfish](https://stockfishchess.org) 11 chess engine in a Node.js environment. The bot is accepting blitz and rapid challenges and is capable of independently challenging other bots. 

## How to get started

1. Install dependencies with ``npm install``
2. Update the ``config.js`` file with your API key and the lowercase (!) player name of the bot
3. Run ``npm start``

## Features

- If `CHALLANGE_RANDOM_BOTS` is set to `true`, the bot will regularly fetch online bots and challenge a random bot. The online bots are cached in the `bots.json` file.
- Received chat messages will be logged in the `chat.txt` file.
- The engine depth may be adjusted using the `ENGINE_DEPTH` config variable.
- The maximum number of simultaneous games can be set with the `MAX_ACTIVE_GAMES` config variable.

## Rating

The lichess bot [BufferUnderflow](https://lichess.org/@/BufferUnderflow) achieved a **Blitz rating of 2200** and a **Rapid rating of 2500**
