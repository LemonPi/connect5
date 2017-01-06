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
// gameID -> [clients subscribing to this game]
const subscription = {};
function subscribe(game, client) {
    // game already has client joined
    if (!subscription[game]) {
        subscription[game] = new Set();
    }
    subscription[game].add(client);
}
function unsubscribe(client) {
    for (let game in subscription) {
        if (subscription.hasOwnProperty(game)) {
            if (subscription[game].has(client)) {
                subscription[game].delete(client);
                return;
            }
        }
    }
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
