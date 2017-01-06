/**
 * Created by Johnson on 2017-01-05.
 */
const {startWebSocketServer} = require("./websocket_server");
const startHTTPServer = require("./http_server");
const fs = require("fs");

// read configuration
fs.readFile("../game.json", "utf-8", (err, data)=> {
    if (err) {
        console.error(err);
        return;
    }
    const config = JSON.parse(data);

    // start various servers
    console.log("game configuration retrieved");
    const server = startHTTPServer(config.port);
    startWebSocketServer(config.wsPath, server);
});