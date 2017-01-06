/**
 * Created by Johnson on 2017-01-05.
 */
const {subscription, subscribe, newGame, unsubscribe, games, getCounter, addName, removeName} = require(
    "./states");
const {makeConnect, makeCreate, makeList, makeError, makeMove, makeWin, makeJoin, makeState} = require(
    "./messages");
const {has, getUniqueID} = require("./util");
const WebSocketServer = require("ws").Server;

let wss = null;

// event handlers (broadcasting to other WebSocket clients)
function handleConnect(send, ws, msg) {
    console.log(msg.message);
    // name given when connected
    if (ws) {
        addName(ws, msg.name);
    }
    // only need to list game for this client and update player list for everyone
    send(makeList());
    wss.clients.forEach((client)=> {
        client.send(makeConnect());
    });
}
function handleDisconnect(ws) {
    unsubscribe(ws);
    removeName(ws);
    wss.clients.forEach((client)=> {
        client.send(makeConnect());
    });
}
function handleCreate(ws, msg) {
    console.log("trying to create");
    // create new game
    newGame(msg);
    // also list games
    if (ws) {
        ws.send(makeCreate(getCounter()));
    }
    // list game: broadcast to all
    wss.clients.forEach((client)=> {
        client.send(makeList());
    });
}
function handleMove(sendError, msg) {
    console.log("trying to move");
    console.log(msg.location);
    const gameID = msg.game;
    if (!games[gameID]) {
        return sendError(makeError(`Game ${gameID} not created yet`));
    }
    if (!has(msg, "player") || !has(msg, "name") || !has(msg, "location")) {
        return sendError(makeError(`Move missing player, name, or location`));
    }
    const validMove = games[gameID].move(msg.player, msg.name, msg.location);
    // send to all who are subscribed to this game
    subscription[gameID].forEach((client)=> {
        client.send(makeMove(validMove, msg.player, msg.location));
    });
    if (games[gameID].isGameOver()) {
        const winStatus = makeWin(games[gameID].getWinStatus());
        subscription[gameID].forEach((client)=> {
            client.send(winStatus);
        });
    }
    return validMove;
}
function handleJoin(send, ws, msg) {
    console.log("trying to join");
    console.log(msg.game);
    const gameID = msg.game;
    if (!games[gameID]) {
        return send(makeError(`Game ${gameID} not created yet`));
    }
    if (!msg.name) {
        return send(makeError("No name specified in join request"));
    }
    // requires players to have connected first to join
    const player = games[gameID].join(msg.name);
    if (!player) {
        return send(makeError("Unable to join game " + gameID));
    }
    // this client subscribed to this game
    if (ws) {
        subscribe(gameID, ws);
    }
    send(makeJoin({
        size: games[gameID].size,
        game: gameID,
        player,
    }));
    // update everyone who's subscribed to this game that something happened
    subscription[gameID].forEach((client)=> {
        client.send(makeState(games[gameID]));
    });
}
function handleState(send, msg) {
    console.log("trying to get state for game");
    console.log(msg.game);
    const gameID = msg.game;
    if (!games[gameID]) {
        return send(makeError(`Game ${gameID} not created yet`));
    }
    return send(makeState(games[gameID]));
}

function startWebSocketServer(wsPath, server) {
    // WebSocket interface (preferred alternative to polling)
    wss = new WebSocketServer({
        path: wsPath,
        server
    });

    console.log("WebSocket server opened");
    wss.on("connection", (ws)=> {
        // attach uid to it for easy hashing
        ws.uid = getUniqueID();
        ws.on("close", (code, reason)=> {
            console.log("client closed: %s %s", code, reason);
            handleDisconnect(ws);
        });

        ws.on("message", (message)=> {
            const msg = JSON.parse(message);

            switch (msg.type) {
            case "connect": {
                return handleConnect(ws.send.bind(ws), ws, msg);
            }
            case "create": {
                return handleCreate(ws, msg);
            }
            case "move": {
                return handleMove(ws.send.bind(ws), msg);
            }
            case "join": {
                return handleJoin(ws.send.bind(ws), ws, msg);
            }
            case "state": {
                return handleState(ws.send.bind(ws), msg);
            }
            default:
                break;
            }
        });
    });

    return wss;
}

module.exports = {
    handleCreate,
    handleMove,
    handleJoin,
    handleState,
    startWebSocketServer
};