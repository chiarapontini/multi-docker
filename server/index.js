const keys = require('./keys');

// Express app setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());  //allow request from different domain respect to that one of api
app.use(bodyParser.json()); //parse incoming body request and parse it in json

//Postgres (SQL database) client set up
const {Pool} = require('pg');
let connectionOptions = {
    user: keys.pgUser,
    password: keys.pgPassword,
    host: keys.pgHost,
    port: keys.pgPort,
    database: keys.pgDatabase
};
const pgClient = new Pool(connectionOptions);
pgClient.on('error', () => console.log('Lost pg connection'));

//create table "values" with a single column called number that stores all indexes searched by user
pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .then(() => console.log('Created table values'))
    .catch((err) => console.log('Error during create values table'));

//Redis client set up
const redis = require('redis');
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000 //try reconnection after 1 sec
});
const redisPublisher = redisClient.duplicate();

//Express route handlers

app.get('/', (req, res)=> {
   res.send('Hi!');
});

//get all indexes searches
app.get('/values/all', async (req, res) => {
    console.log('GET all values');
    pgClient.query('SELECT * from values').then(values =>  res.send(values.rows));
});

//get all index-fibonacci values
app.get('/values/current', async (req, res) => {
    redisClient.hgetall('values', (err, values) => {  //get all hashMap values
        res.send(values);
    });
});

app.post('/values', (req, res) => {
    let index = req.body.index;
    if(parseInt(index) > 40){
        return res.status(422).send('Index too high');
    }
    redisClient.hset('values', index, 'Nothing yet!'); //worker will replace it with real index
    redisPublisher.publish('insert', index);  //to activate worker
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]); //save index search history in postgres
    res.send({working:true});
});

app.listen(5000, err => {
    console.log('Listening on port 5000');
});