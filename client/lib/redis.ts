
import Redis from 'ioredis';


let isRedisAvailable = true;

const getRedisClient = () => {
    let client: Redis;

    const commonOptions = {
        maxRetriesPerRequest: 0,
        enableOfflineQueue: false, // Don't queue commands if Redis is down
        connectTimeout: 5000,
    };

    if (process.env.REDIS_URL) {
        client = new Redis(process.env.REDIS_URL, commonOptions);
    } else if (process.env.REDIS_HOST) {
        client = new Redis({
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            ...commonOptions,
        });
    } else {
        client = new Redis(commonOptions);
    }

    client.on('error', (err) => {
        if (isRedisAvailable) {
            console.error('Redis Client Error. Disabling Redis for this session:', err.message);
            isRedisAvailable = false;
        }
    });

    client.on('connect', () => {
        isRedisAvailable = true;
    });

    return client;
};

// Singleton pattern for Next.js to avoid too many connections in dev
const globalForRedis = global as unknown as { redis: Redis };

export const redis = globalForRedis.redis || getRedisClient();

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export const checkRedisAvailable = () => isRedisAvailable;
