const CronJob = require('cron').CronJob;
const lichess = require('./lichess');
const config = require('./config');

// Cron job to challenge a random online bot
const challengeJob = new CronJob('*/5 * * * *', async function() {
    lichess.challengeRandomBot();
});
if (config.CHALLANGE_RANDOOM_BOTS === true) {
    challengeJob.start();
}

// Corn job to fetch online bots
const fetchOnlineJob = new CronJob('*/10 * * * *', async function() {
    lichess.fetchOnlineBots();
});
if (config.CHALLANGE_RANDOOM_BOTS === true) {
    fetchOnlineJob.start();
}

// Listen to incoming events
lichess.listenToIncomingEvents();
