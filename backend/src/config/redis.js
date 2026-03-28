const IORedis = require("ioredis");

const connection = new IORedis({
    host: "redis", 
    port: 6379,
    maxRetriesPerRequest: null
});

module.exports = connection;