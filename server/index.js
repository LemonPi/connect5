/**
 * Created by Johnson on 2017-01-05.
 */
const {startWebSocketServer} = require("./websocket_server");
const startHTTPServer = require("./http_server");

const server = startHTTPServer(process.env.PORT || 80);
startWebSocketServer('/ws', server);
