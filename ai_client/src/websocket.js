/**
 * Created by Johnson on 2017-01-06.
 */
const m = require("./messages");
const ai = require("./agent/session");
const WebSocket = require("ws");

// ws interaction state
let player = null;
let name = null;
let game = null;
let socket = null;

/**
 * Prepare to place a move after knowing the current state of the board
 */
function askForBoard() {
    socket.send(m.makeBoard(game));
}

function leaveGame(game) {
    ai.stopPlaying();
    return socket.send(m.makeLeave(game));
}
function startWebSocket(serverURL) {
    socket = new WebSocket(serverURL);
    socket.on("open", ()=> {
        // alert server that we're a bot
        name = "bot_" + Math.random().toString(35).substr(2, 7);
        socket.send(m.makeConnect(name));
        console.log(`Opened ws to ${serverURL} and playing as ${name}`);
    });

    socket.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        console.log("message");
        console.log(msg);
        switch (msg.type) {
        case "create": {
            // somebody created a game, check if it's AI joinable; if so, attempt to join
            if (!ai.isPlaying() && msg.ai) {
                game = msg.game;
                return socket.send(m.makeJoin(game, name));
            }
            break;
        }
        case "join": {
            // server sent game connection information (required for future interaction)
            player = msg.player;
            game = msg.game;
            gridNum = msg.size;
            console.log(`Joined game as player ${player}`);
            // ready to play
            if (!ai.isPlaying() && player === 2) {
                askForBoard();
            }
            break;
        }
        case "state": {
            // get latest state of the game
            // TODO if AI creates a game, a player joining will fire this
            console.log("current state", msg.state);
            break;
        }
        case "move": {
            console.log(`Move made by ${msg.player}`);
            if (msg.validMove) {
                ai.updateAfterMove(msg.location, msg.player);
            }
            if (msg.player === player) {
                // own move, invalid?!?
                if (!msg.validMove) {
                    console.error("Invalid move?!?");
                }
                // else ignore correct moves, wait for player to make a move
            } else {
                // other player made a move, consider next move
                if (msg.validMove) {
                    askForBoard();
                }
                // else ignore incorrect moves by other player
            }
            break;
        }
        case "board": {
            // latest full state of board for playing
            if (msg.turn === player) {
                if (!ai.isPlaying()) {
                    ai.startPlaying(msg.board, player);
                }
                const location = ai.getMove(msg.board);
                return socket.send(m.makeMove({
                    location,
                    game,
                    player,
                    name
                }));
            }
            break;
        }
        case "win": {
            // somebody won a game we're subscribed to, move on
            console.log("game over");
            return leaveGame(game);
        }
        case "error": {
            return console.error(msg.message);
        }
        default:
            // ignore all other messages
            return;
        }
    };

    return socket;
}

module.exports = {
    startWebSocket,
};