const { Queue } = require("bullmq");
const connection = require("../config/redis");

const reconciliationQueue = new Queue("reconciliationQueue", {
  connection
});

module.exports = reconciliationQueue;