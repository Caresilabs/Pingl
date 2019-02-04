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
        instance.queue = {};

        // init thresholds
        var defaultThreshold = 5;
        instance.thresholdsData = new Array(24);
        instance.thresholdsData.fill(defaultThreshold);
        if (instance.thresholds != null) {
            for (var t = 0; t < instance.thresholds.length; t++) {
                var threshold = instance.thresholds[t];
                var toHour = Math.min(threshold.toHour, 23);
                for (var interval = threshold.fromHour; interval != toHour; interval = (interval + 1) % 24) {
                    instance.thresholdsData[interval] = threshold.thresholdMinutes;
                }
            }
        }
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

    var queuedMessage = instance.queue[req.body.check_id];
    var currentStatus = req.body.current_state;

    if (queuedMessage == null && currentStatus == "DOWN") {
        instance.queue[req.body.check_id] = { message: req.body }
        var thresholdTime = instance.thresholdsData[new Date().getHours()] * 1000 * 60;
        setTimeout(updateMessage, thresholdTime, instance.instanceId, req.body.check_id);
        console.log('[Pingl] ' + req.body.check_name + ' is down, but queued for ' + thresholdTime + ' ms');
    } else if (currentStatus == "UP") {
        if (queuedMessage != null) {
            instance.queue[req.body.check_id] = null;
            console.log('[Pingl] ' + req.body.check_name + ' is up and removed from the queue');
        } else {
            sendPingdomMessage(instance, req.body);
        }
    }

    return res.sendStatus(OK_CODE);
});

function updateMessage(instanceId, checkId) {
    var instance = instances[instanceId];
    var queuedMessage = instance.queue[checkId];
    if (queuedMessage != null) {
        sendPingdomMessage(instance, queuedMessage.message);
        instance.queue[checkId] = null;
    }
}

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

