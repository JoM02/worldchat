const Redis = require('ioredis');

const redisClient = new Redis({
    host: process.env.REDIS_HOST || 'worldchat-redis',
    port: 6379,
    retryStrategy: function (times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});

// Handle connection errors
redisClient.on('error', (err) => {
    console.error('Redis client error:', err);
});

class CacheService {
    async get(key) {
        try {
            console.log(`Getting key: ${key}`);
            const value = await redisClient.get(key);
            if (value === null) {
                console.log(`Key ${key} not found in Redis.`);
                return null; // Return null if the key does not exist
            }
            console.log(`Got value: ${value}`);
            return JSON.parse(value); // Parse the JSON string
        } catch (err) {
            console.error('Error getting data from Redis:', err);
            return null; // Return null on error
        }
    }

    async set(key, value, expirationInSeconds) {
        try {
            console.log(`Setting key: ${key} with value: ${JSON.stringify(value)} for ${expirationInSeconds} seconds`);
            await redisClient.set(key, JSON.stringify(value), 'EX', expirationInSeconds);
            console.log(`Set key: ${key} successfully`);
        } catch (err) {
            console.error('Error setting data in Redis:', err);
        }
    }

    async del(key) {
        try {
            console.log(`Deleting key: ${key}`);
            await redisClient.del(key);
            console.log(`Deleted key: ${key} successfully`);
        } catch (err) {
            console.error('Error deleting data from Redis:', err);
        }
    }
}

module.exports = new CacheService();