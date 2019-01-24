#!/usr/bin/env node

'use strict';

// ======================================== //
// Author: Simon Bothén
// Prototype for Pingdom -> Google Chat
// ======================================== //

const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const app = express().use(bodyParser.json());
const format = require('string-format')
const request = require('request');

const OK_CODE = 200;
const UNAUTHORIZED_CODE = 401;

let config = JSON.parse(fs.readFileSync('app.config'));
let instances = {};

(function init() {
    for (var i = 0, len = config.instances.length; i < len; i++) {
        let instance = JSON.parse(fs.readFileSync(config.instances[i]));
        instances[instance.instanceId] = instance;
        console.log('[Pingl] installed: ' + instance.instanceId);
    }
})();

var server = app.listen(config.port, () => {
    console.log('[Pingl] is listening!');
    for (var key in instances) {
        let instance = instances[key];
        sendToGoogleChat(instance, getRandomArrayItem(instance.messages.botStart), null);
    }
});

app.post('/pingl', (req, res) => {
    let instance = authorize(req.query.instanceId, req.query.token);
    if (!instance) {
        return res.sendStatus(UNAUTHORIZED_CODE);
    }

    sendPingdomMessage(instance, req.body);

    return res.sendStatus(OK_CODE);
});

app.post('/echo', (req, res) => {
    let instance = authorize(req.query.instanceId, req.query.token);
    if (!instance) {
        return res.sendStatus(UNAUTHORIZED_CODE);
    }

    sendToGoogleChat(instance, req.body.text, null);

    return res.sendStatus(OK_CODE);
});

app.post('/shutdown', (req, res) => {
    let instance = authorize(req.query.instanceId, req.query.token);
    if (!instance) {
        return res.sendStatus(UNAUTHORIZED_CODE);
    }

    process.exit();
    return res.sendStatus(OK_CODE);
});

function sendPingdomMessage(instance, pingdomData) {
    let formatData = {
            name: pingdomData.check_name,
            state: pingdomData.current_state,
            type: pingdomData.check_type,
            hostname: pingdomData.check_params.hostname
    };

    let template = getRandomArrayItem(getChatTemplatesFromState(instance, pingdomData.current_state));
    let chatMessage = format(template, formatData);

    sendToGoogleChat(instance, chatMessage,
        function (error, response, body) {
            if (!error && response.statusCode == OK_CODE) {
                console.log(body);
            }
        }
    );
}

function getChatTemplatesFromState(instance, state) {
    if (state == "UP") {
        return instance.messages.up;
    } else {
        return instance.messages.down;
    }
}

function sendToGoogleChat(instance, text, callback) {
    if (text != null && text != "") {
        request.post(instance.googleChatUrl, {json: {text: text}}, callback);
    }
}

function authorize(id, token) {
    let instance = instances[id];

    // check if verification token is correct
    if (instance && token == instance.token) {
        return instance;
    }
    return null;
}

function getRandomArrayItem(array) {
    return array[Math.floor(Math.random()*array.length)];
}

function onShutdown() {
    var waiting = Object.keys(instances).length;
    for (var key in instances) {
        let instance = instances[key];
        sendToGoogleChat(instance, getRandomArrayItem(instance.messages.botShutdown), function () {
            if (--waiting <= 0) {
                process.exit();
            }
        });
    }
};

// listen for TERM signal .e.g. kill
process.on('SIGTERM', onShutdown);

// listen for INT signal e.g. Ctrl-C
process.on('SIGINT', onShutdown);

