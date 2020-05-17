const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");
const {games} = require("./states");
const {has} = require("./util");
const {makeCreate, makeList, makeError, makeMove, makeWin, makeJoin} = require("./messages");
const {handleCreate, handleMove, handleJoin, handleState} = require("./websocket_server");

const resourceRoot = "./";

const mimeTypes = {
    "html": "text/html",
    "jpeg": "image/jpeg",
    "jpg" : "image/jpeg",
    "png" : "image/png",
    "js"  : "text/javascript",
    "css" : "text/css",
    "svg" : "image/svg+xml",
    "json": "application/json",
    "wav" : "audio/wav",
};

function handleHTTPAPI(res, action, q) {
    // game hasn't been created yet
    const gameID = q.game;
    if (!gameID) {
        return res.end(makeError("Game id not specified!"));
    }

    switch (action) {

    case "/api/create": {
        handleCreate(null, q);
    }
        // falls through
    case "/api/join": {
        res.writeHead(200, {"Content-Type": "application/json"});
        return handleJoin(res.end.bind(res), null, q);
    }
    case "/api/move": {
        res.writeHead(200, {"Content-Type": "application/json"});
        if (!has(q, "player") || !has(q, "name") || !has(q, "r") || !has(q, "c")) {
            return res.end(makeError(`Move request missing player, r, or c query string`));
        }
        q.player = Number(q.player);
        q.location = {
            r: Number(q.r),
            c: Number(q.c)
        };
        const validMove = handleMove(res.end.bind(res), q);
        return res.end(makeMove(validMove, player, location));
    }
    case "/api/state": {
        // get current state of game
        res.writeHead(200, {"Content-Type": "application/json"});
        return handleState(res.end.bind(res), q);
    }
    default:
        res.writeHead(404);
        return res.end();
    }
}
function startHTTPServer(port) {
    // REST API
    const server = http.createServer((req, res)=> {
        const parsedURL = url.parse(req.url, true);
        let action = parsedURL.pathname;
        const q = parsedURL.query;

        console.log("action: " + action);

        // HTTP API
        if (action.startsWith("/api/")) {
            return handleHTTPAPI(res, action, q);
        } else if (action === "/ws") {
            // websocket API, ignore
            return;
        }

        // serve client files rather than server files
        let clientRouting = "client";
        if (action === "/") {
            // route to client
            action += "index.html";
        } else if (action.startsWith("/out/")) {
            clientRouting = "";
        }

        // default to serving static client files if not api
        const filename = path.join(resourceRoot, clientRouting, action);
        fs.stat(filename, function (err, stats) {
            if (err || stats.isFile() === false) {
                console.log(err);
                res.writeHead(404);
                res.end();
                return;
            }
            const mimeType = mimeTypes[path.extname(filename).split(".")[1]];

            if (mimeType === undefined) {
                throw Error(`undefined mapping for mime type ${path.extname(filename).split(".")[1]}`);
            }

            res.writeHead(200, {'Content-Type': mimeType});

            const fileStream = fs.createReadStream(filename);
            fileStream.pipe(res);
        });
    });

    server.listen(port, ()=> {
        console.log("HTTP server listening on " + port);
    });

    return server;
}


module.exports = startHTTPServer;