# Pingl
A Pingdom to Google Chat Relay Bot using Webhooks.

## Instructions

1. Set up a "webhook"-bot in your Google Chat room.
2. Copy app.config.template to app.config
2a. Modify the values to your liking
3. Run `npm install`
4. Run the node app with: `./index.js`.

## Features

### Pingdom
Set the pingdom webhook to `YOURDOMAIN.com/pingl?token=TOKEN`.

### Echo
The bot can echo anything you say by doing a post call to `/echo`. The body should be:
`{ text: "Hello world!" }`

### Custom messages

Custom messages can be set up in app.config.

Supported replacement tokens are:

{name} - My website
{hostname} - www.example.com
{type} - HTTP
{state} - DOWN

