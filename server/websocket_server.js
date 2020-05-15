/**
 * Created by Johnson on 2017-01-05.
 */
const {subscription, subscribe, newGame, unsubscribe, games, getCounter, addName, removeName} = require(
    "./states");
const m = require(
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
    // let us know if they are an AI client or not
    if (msg.ai) {
        ws.ai = true;
    } else {
        // list game for new client
        // AI doesn't need to know other games
        send(m.makeList());
        // update player list for everyone
        wss.clients.forEach((client)=> {
            client.send(m.makeConnect());
        });
    }
}
function handleDisconnect(ws) {
    unsubscribe(ws);
    removeName(ws);
    wss.clients.forEach((client)=> {
        client.send(m.makeConnect());
    });
}
function handleCreate(ws, msg) {
    console.log("trying to create");
    // create new game
    newGame(msg);
    // also list games
    if (ws) {
        ws.send(m.makeCreate(getCounter()));
    }
    // list game: broadcast to all
    wss.clients.forEach((client)=> {
        client.send(m.makeList());
        // tell all AI agents about new AI game if necessary
        if (msg.ai && client.ai) {
            client.send(m.makeCreate(getCounter()));
        }
    });
}
function handleMove(sendError, msg) {
    console.log("trying to move");
    console.log(msg.location);
    const gameID = msg.game;
    if (!games[gameID]) {
        return sendError(m.makeError(`Game ${gameID} not created yet`));
    }
    if (!has(msg, "player") || !has(msg, "name") || !has(msg, "location")) {
        return sendError(m.makeError(`Move missing player, name, or location`));
    }
    const validMove = games[gameID].move(msg.player, msg.name, msg.location);
    // send to all who are subscribed to this game
    subscription[gameID].forEach((client)=> {
        client.send(m.makeMove(validMove, msg.player, msg.location));
    });
    if (games[gameID].isGameOver()) {
        const winStatus = m.makeWin(games[gameID].getWinStatus());
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
        return send(m.makeError(`Game ${gameID} not created yet`));
    }
    if (!msg.name) {
        return send(m.makeError("No name specified in join request"));
    }
    // requires players to have connected first to join
    const player = games[gameID].join(msg.name);
    if (!player) {
        return send(m.makeError("Unable to join game " + gameID));
    }
    // this client subscribed to this game
    if (ws) {
        subscribe(gameID, ws);
    }
    send(m.makeJoin({
        size: games[gameID].size,
        game: gameID,
        player,
    }));
    // update everyone who's subscribed to this game that something happened
    subscription[gameID].forEach((client)=> {
        client.send(m.makeState(games[gameID]));
    });
}
function handleLeave(ws) {
    unsubscribe(ws);
}
function handleState(send, msg) {
    console.log("trying to get state for game");
    console.log(msg.game);
    const gameID = msg.game;
    if (!games[gameID]) {
        return send(m.makeError(`Game ${gameID} not created yet`));
    }
    return send(m.makeState(games[gameID]));
}
function handleBoard(send, msg) {
    console.log("trying to get board for game");
    const gameID = msg.game;
    if (!games[gameID]) {
        return send(m.makeError(`Game ${gameID} not created yet`));
    }
    return send(m.makeBoard(games[gameID]));
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
            console.log("message");
            console.log(msg);
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
            case "leave": {
                return handleLeave(ws);
            }
            case "state": {
                return handleState(ws.send.bind(ws), msg);
            }
            case "board": {
                return handleBoard(ws.send.bind(ws), msg);
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