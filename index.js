//var request = require('request');
const axios = require('axios');

if (!process.env.BASE_URL ||
    !process.env.USRERNAME ||
    !process.env.PASSWORD ||
    !process.env.RABBITMQ_NODE
    ) {
        console.log("Need all enviroment variables");
        process.exit();
    }

const BASE_URL = process.env.BASE_URL;

//this user should be admin user
const USER_AUTH = {
    'username': process.env.USRERNAME,
    'password': process.env.PASSWORD
}

const qAndExchanges = require('./qAndExchanges.json');

const ARGS_MAP = {
    "q": {
        "auto_delete": false,
        "durable": true,
        "arguments": { "x-queue-type": "quorum" },
        "node": process.env.RABBITMQ_NODE 
    },
    "exchange_tp": {
        "type": "topic",
        "auto_delete": false,
        "durable": true,
        "internal": false,
        "arguments": {}
    },
    "exchange_dr": {
        "type": "direct",
        "auto_delete": false,
        "durable": true,
        "internal": false,
        "arguments": {}
    },
    "exchange_fn": {
        "type": "fanout",
        "auto_delete": false,
        "durable": true,
        "internal": false,
        "arguments": {}
    },
    "binding": {
        "routing_key": "",
        "arguments": {}
    }
};


const getApiUrlAndArgs = function (obj) {
    let { type, q, exchange, key } = obj;
    if (type === "q") {
        return {
            url: `/api/queues/%2F/${q}`,
            data: ARGS_MAP[type]
        }

    }
    if (type === "exchange_tp" || type == "exchange_dr" || type == "exchange_fn") {
        return {
            url: `/api/exchanges/%2F/${exchange}`,
            data: ARGS_MAP[type]
        }
    }
    if (type == "binding") {
        return {
            url: `/api/bindings/%2F/e/${exchange}/q/${q}`,
            data: {
                "routing_key": key,
                "arguments": {}
            }
        }
    }
}



const getConfig = function (obj) {
    let { url, data } = getApiUrlAndArgs(obj);
    console.log(url, data)
    return {
        method: obj.type == "binding" ? 'post' : 'put',
        url: BASE_URL + url,
        auth: { ...USER_AUTH },
        headers: { 'content-type': 'application/json' },
        data: JSON.stringify(data)
    };
};

const createObjectRabbit = async function (obj) {
    return await axios(getConfig(obj));
};

const createQExchangesBindings = function () {
    return Promise.all(qAndExchanges.map(x => {
        return createObjectRabbit({ exchange: x.exchange, type: x.type })
            .then(_ => Promise.all(x.queues.map(y => createObjectRabbit({
                q: y.q,
                type: y.type
            }))))
            .then(_ => Promise.all(x.queues.map(y => createObjectRabbit({
                key: y.key,
                q: y.q,
                exchange: x.exchange,
                type: "binding"
            }))))
            .then(_ => console.log("All objects created"))
            .catch(err => console.log(err))
    }))
};
createQExchangesBindings()
    .then(_ => console.log("All exchanges, queues and bindgins created"))
    .then(err => console.log(err))


// createObjectRabbit({ exhange: "testEx", type: "exchange_tp" })
//     .then(res => console.log("*******", res.data))
//     .catch(err => console.log("-------", err))

// createObjectRabbit({ q: "test1", type: "q" })
//     .then(res => console.log("*******", res.data))
//     .catch(err => console.log("-------", err))

// createObjectRabbit({ key: "my.key", q: "test1", exchange: "testEx", type: "binding" })
//     .then(res => console.log("*******", res.data))
//     .catch(err => console.log("-------", err))
