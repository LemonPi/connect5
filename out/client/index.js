"use strict";

var loc = window.location;
var serverURL = void 0;
if (loc.protocol === "https:") {
    serverURL = "wss:";
} else {
    serverURL = "ws:";
}
serverURL += "//" + loc.host + "/ws";

var socket = new WebSocket(serverURL);

var board = document.getElementById("board");
var ctx = board.getContext("2d");
var moveIndicator = document.getElementById("move_indicator");
var moveCtx = moveIndicator.getContext("2d");

var gridNum = 19;
var gridSize = board.width / gridNum;
// game state
var player = null;
var name = null;
var game = null;

function recalculateGrid(gridNumber) {
    gridNum = gridNumber;
    gridSize = board.width / gridNum;
    clearBoard();
}

/**
 * Return board coordinates coresponding to x,y relative to board canvas
 * @param x
 * @param y
 * @returns {{r: number, c: number}}
 */
function getRowCol(x, y) {
    return {
        r: Math.round(y / gridSize),
        c: Math.round(x / gridSize)
    };
}
function getXY(r, c) {
    return {
        x: c * gridSize,
        y: r * gridSize
    };
}

function clearBoard() {
    // grid size in canvas units; square grid
    // clear grid
    ctx.clearRect(0, 0, board.width, board.height);
    moveCtx.clearRect(0, 0, board.width, board.height);

    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "grey";
    for (var w = gridSize; w < board.width; w += gridSize) {
        ctx.beginPath();
        ctx.moveTo(w, 0);
        ctx.lineTo(w, board.height);
        ctx.stroke();
    }
    for (var h = gridSize; h < board.height; h += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(board.width, h);
        ctx.stroke();
    }
    ctx.restore();
}

// current game information
var playerOne = document.getElementById("p1");
var playerTwo = document.getElementById("p2");
function updatePlayerTurn(playerTurn) {
    if (playerTurn === 1) {
        // next to getMove
        playerOne.className = "active_move";
        playerTwo.className = "";
    } else if (playerTurn === 2) {
        playerTwo.className = "active_move";
        playerOne.className = "";
    }
}
function placePiece(player, _ref) {
    var r = _ref.r,
        c = _ref.c;

    // board piece
    if (player === 2) {
        ctx.fillStyle = "white";
    } else if (player === 1) {
        ctx.fillStyle = "black";
    }
    updatePlayerTurn(3 - player);

    var _getXY = getXY(r, c),
        x = _getXY.x,
        y = _getXY.y;

    // place piece


    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, gridSize * 0.4, 0, Math.PI * 2, true);
    ctx.stroke();
    ctx.fill();

    // place indicator
    var indicatorSize = gridSize * 0.1;
    moveCtx.clearRect(0, 0, board.width, board.height);
    moveCtx.lineWidth = 2;
    moveCtx.strokeStyle = "red";
    moveCtx.beginPath();
    moveCtx.moveTo(x, y - indicatorSize);
    moveCtx.lineTo(x, y + indicatorSize);
    moveCtx.moveTo(x - indicatorSize, y);
    moveCtx.lineTo(x + indicatorSize, y);
    moveCtx.stroke();
}

// attach to topmost
moveIndicator.addEventListener("mousedown", function (e) {
    e.preventDefault();
    var x = void 0;
    var y = void 0;
    if (e.pageX || e.pageY) {
        x = e.pageX;
        y = e.pageY;
    } else {
        x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }
    x -= board.offsetLeft;
    y -= board.offsetTop;

    var coord = getRowCol(x, y);
    console.log(coord);
    socket.send(JSON.stringify({
        type: "getMove",
        location: coord,
        game: game,
        player: player,
        name: name
    }));
    return false;
});

// messages
function makeJoin(game) {
    return JSON.stringify({
        type: "join",
        name: name,
        game: game
    });
}

var allowAI = document.getElementById("allow_ai");
function makeCreate() {
    return JSON.stringify({
        type: "create",
        ai: allowAI.checked
    });
}

function makeConnect(name) {
    return JSON.stringify({
        type: "connect",
        name: name
    });
}
function makeState(game) {
    return JSON.stringify({
        type: "state",
        game: game
    });
}

// game creation and joining buttons
var gameSelect = document.getElementById("game_select");
var createButton = document.getElementById("create");
var createGroup = document.getElementById("create_group");
var joinButton = document.getElementById("join");
createButton.addEventListener("click", function () {
    socket.send(makeCreate());
});
joinButton.addEventListener("click", function () {
    socket.send(makeJoin(Number(gameSelect.value)));
});
gameSelect.addEventListener("change", function () {
    socket.send(makeState(Number(gameSelect.value)));
});

var connectButton = document.getElementById("connect");
var connectGroup = document.getElementById("connect_group");
connectButton.addEventListener("click", function () {
    var nameInput = document.getElementById("name");
    // name is either given or randomly generated (8 characters long)
    name = nameInput.value || Math.random().toString(35).substr(2, 8);
    socket.send(makeConnect(name));
    // assuming connection is successful
    joinButton.style.visibility = "visible";
    createButton.style.visibility = "visible";
    createGroup.style.visibility = "visible";
    connectGroup.style.display = "none";
    connectButton.style.display = "none";
});

function updateGameSelection(list) {
    var curGame = gameSelect.value;
    var toRemoveIndices = [];
    var alreadyExistIndices = [];
    // remove all that's not in the list
    for (var i = gameSelect.options.length - 1; i >= 0; --i) {
        var j = list.indexOf(gameSelect.options[i].value);
        if (j < 0) {
            toRemoveIndices.push(i);
        } else {
            alreadyExistIndices.push(j);
        }
    }
    toRemoveIndices.forEach(function (i) {
        gameSelect.remove(i);
    });
    // add new ones
    list.forEach(function (gameID, j) {
        // not already existing
        if (alreadyExistIndices.indexOf(j) < 0) {
            var option = document.createElement("option");
            option.value = gameID;
            option.text = gameID;
            gameSelect.appendChild(option);
            // reselect
            if (option.value === curGame) {
                gameSelect.value = gameID;
            }
        }
    });
}

var playerList = document.getElementById("player_list");
function updatePlayerList(list) {
    var alreadyExistIndices = [];
    // remove all that's not in the list
    for (var i = playerList.children.length - 1; i >= 0; --i) {
        var j = list.indexOf(playerList.children[i].innerHTML);
        if (j < 0) {
            playerList.removeChild(playerList.children[i]);
        } else {
            alreadyExistIndices.push(j);
        }
    }
    // add new ones
    list.forEach(function (playerName, j) {
        // not already existing
        if (alreadyExistIndices.indexOf(j) < 0) {
            var item = document.createElement("li");
            item.innerHTML = playerName;
            if (playerName === name) {
                item.id = "own_name";
            }
            playerList.appendChild(item);
        }
    });
}

var gameStatus = document.getElementById("game_status");
function updateGameState(state) {
    playerOne.innerHTML = state.players[0] || "none";
    playerTwo.innerHTML = state.players[1] || "none";
    updatePlayerTurn(state.turn);
    gameStatus.innerHTML = state.status;
}

socket.onmessage = function (event) {
    var msg = JSON.parse(event.data);
    console.log("message");
    console.log(msg);
    switch (msg.type) {
        case "connect":
            {
                // somebody connected, update player list
                return updatePlayerList(msg.names);
            }
        case "create":
            {
                // creation success
                console.log("Created game");
                game = msg.game;
                // immediately join created game
                return socket.send(makeJoin(game));
            }
        case "list":
            {
                // server sent list of games for us to update our selection list
                console.log("Listing available games");
                updateGameSelection(msg.list);
                break;
            }
        case "join":
            {
                // server sent game connection information (required for future interaction)
                console.log("Joined game");
                player = msg.player;
                game = msg.game;
                gridNum = msg.size;
                recalculateGrid(gridNum);
                break;
            }
        case "state":
            {
                // get latest state of the game
                updateGameState(msg.state);
                break;
            }
        case "getMove":
            {
                // display moves from players (including self)
                if (msg.validMove) {
                    console.log("Move made by " + msg.player);
                    placePiece(msg.player, msg.location);
                }
                break;
            }
        case "win":
            {
                // somebody won a game we're subscribed to
                if (msg.player === player) {
                    window.alert("Congratulations, you won!");
                } else {
                    window.alert(msg.message);
                }
                break;
            }
        case "error":
            {
                window.alert(msg.message);
                break;
            }
        default:
            console.log("Unknown message type: " + msg.type);
    }
};

clearBoard();