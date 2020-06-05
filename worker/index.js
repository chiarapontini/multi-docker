//worker module watch at redis new index
//pull new indexes and calculate new fibonacci value for this index
// and save it back to redis in a hashMap

const keys = require('./keys');
const redis = require('redis');

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});

const sub = redisClient.duplicate();

function fib(index) {
    if(index < 2) return 1;
    return fib(index - 1) + fib(index -2)
}

sub.on('message', (channel, message) => { //receiving index message from redis
    redisClient.hset('values', message, fib(parseInt(message)))  //hashMap with index as key and fibonacci number as value
});

sub.subscribe('insert');  //any time someone insert index in redis, it take it an save in the hashMap the fibonacci number