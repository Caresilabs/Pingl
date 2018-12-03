# Pingl
A Pingdom to Google Chat Relay Bot using Webhooks.

## Instructions

1. Set up a "webhook"-bot in your Google Chat room.
2. Copy app.config.template to app.config
3. Modify the values to your liking, and be sure to set a secure token.
4. Run `npm install`
5. Run the node app with: `./index.js`.

## Features

### Pingdom
Set the pingdom webhook to `YOURDOMAIN.com/pingl?token=TOKEN`.

### Echo
The bot can echo anything you say by doing a post call to `/echo`. The body should be in the following format:
`{ text: "Hello world!" }`

### Custom messages

Custom messages can be set up in app.config.

Supported replacement tokens are:

_Token - Example_
- `{name}` - My website
- `{hostname}` - www.example.com
- `{type}` - HTTP
- `{state}` - DOWN

