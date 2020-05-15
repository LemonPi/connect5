const fs = require("fs");
const websocket = require("./src/websocket");
const ai = require("./src/agent/session");

let serverURL = "ws:";
// read configuration
fs.readFile("../game.json", "utf-8", (err, data) => {
    if (err) {
        console.error(err);
        return;
    }
    const config = JSON.parse(data);

    // start various servers
    console.log("game configuration retrieved");
    serverURL += "//" + config.host + ":" + config.port + config.wsPath;

    if (process.argv[2]) {
        ai.setDifficulty(process.argv[2]);
    }
    websocket.startWebSocket(serverURL);
});
