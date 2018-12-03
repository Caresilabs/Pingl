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

var server = app.listen(config.port, () => {
    console.log('[Pingl] is listening!');
    sendToGoogleChat(getRandomArrayItem(config.messages.botStart), null);
});

app.post('/pingl', (req, res) => {

    let isAuthorized = authorize(req.query.token);
    if (isAuthorized != true) {
        return res.sendStatus(UNAUTHORIZED_CODE);
    }

    sendPingdomMessage(req.body);

    return res.sendStatus(OK_CODE);
});

app.post('/echo', (req, res) => {

    let isAuthorized = authorize(req.query.token);
    if (!isAuthorized) {
        return res.sendStatus(UNAUTHORIZED_CODE);
    }

    sendToGoogleChat(req.body.text, null);

    return res.sendStatus(OK_CODE);
});

function sendPingdomMessage(pingdomData) {
    let formatData = {
            name: pingdomData.check_name,
            state: pingdomData.current_state,
            type: pingdomData.check_type,
            hostname: pingdomData.check_params.hostname
    };

    let template = getRandomArrayItem(getChatTemplatesFromState(pingdomData.current_state));
    let chatMessage = format(template, formatData);

    sendToGoogleChat(chatMessage,
        function (error, response, body) {
            if (!error && response.statusCode == OK_CODE) {
                console.log(body);
            }
        }
    );
}

function getChatTemplatesFromState(state) {
    if (state == "UP") {
        return config.messages.up;
    } else {
        return config.messages.down;
    }
}

function sendToGoogleChat(text, callback) {
    if (text != null && text != "") {
        request.post(config.googleChatUrl, {json: {text: text}}, callback);
    }
}

function authorize(token) {
    // check if verification token is correct
    return token == config.token;
}

function getRandomArrayItem(array) {
    return array[Math.floor(Math.random()*array.length)];
}

function onShutdown() {
    sendToGoogleChat(getRandomArrayItem(config.messages.botShutdown), function () {
        process.exit();
    });
};

// listen for TERM signal .e.g. kill
process.on('SIGTERM', onShutdown);

// listen for INT signal e.g. Ctrl-C
process.on('SIGINT', onShutdown);

