/**
 * Created by Johnson on 2017-01-05.
 */
const Game = require("./game");

let counter = 0;
// track all games
const games = {};
function newGame(data) {
    games[++counter] = new Game(data);
}
function getCounter() {
    return counter;
}
// gameID -> [clients subscribing to this game], index 0 and 1 represent the 2 players
const subscription = {};
function subscribe(game, client) {
    // game already has client joined
    if (!subscription[game]) {
        subscription[game] = [];
    }
    subscription[game].push(client);
}
function unsubscribe(client) {
    const gamesToRemove = [];
    for (let game in subscription) {
        if (subscription.hasOwnProperty(game)) {
            const subscriptionId = subscription[game].indexOf(client);
            if (subscriptionId < 0) {
                continue;
            } else if (subscriptionId === 0 || subscriptionId === 1) {
                gamesToRemove.push(game);
            } else {
                // just remove this subscriber
                subscription[game].splice(subscriptionId, 1);
            }
        }
    }
    console.log(`removing games ${gamesToRemove}`);
    gamesToRemove.forEach((gameId) => {
        delete games[gameId];
        delete subscription[gameId];
    });
}

const names = {};
function addName(ws, name) {
    names[ws.uid] = name;
}
function removeName(ws) {
    names[ws.uid] = null;
}
function getNames() {
    const validNames = [];
    for (let uid in names) {
        if (names.hasOwnProperty(uid) && names[uid]) {
            validNames.push(names[uid]);
        }
    }
    return validNames;
}

module.exports = {
    newGame,
    getCounter,
    games,
    subscription,
    subscribe,
    unsubscribe,
    addName,
    removeName,
    getNames,
};
