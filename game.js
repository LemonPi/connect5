const defaultProperties = {
    // size of square board
    size   : 19,
    // each player has 10 seconds to make a move
    timeout: 10,
};

const P1 = 1;
const P2 = 2;

const WAITING_FOR_JOIN = "waiting for players to join";
const IN_PROGRESS = "in progress";
const WIN_P1 = "player 1 won";
const WIN_P2 = "player 2 won";

const REQ_CONNECT = 5;

function nextPlayer(player) {
    return 3 - player;
}

function prevPlayer(player) {
    return 3 - player;
}

module.exports = class Game {
    constructor(data) {
        Object.assign(this, defaultProperties, data);
        // initialize empty board; each location has values {0, P1, P2}
        // 0 is empty, P1 is player 1, P2 is player 2
        this.board = [];
        for (let i = 0; i < this.size; ++i) {
            this.board[i] = [];
            this.board[i].length = this.size;
            this.board[i].fill(0);
        }
        // player 1 goes first
        this.playerTurn = P1;
        this.players = [null, null];
        // game status
        this.status = WAITING_FOR_JOIN;
    }

    /**
     * Join a game as a player if possible
     * @param name Name to identify player
     * @returns {Number} 0 for unsuccessful join, 1 for player 1, 2 for player 2
     */
    join(name) {
        if (!this.players[P1 - 1]) {
            this.players[P1 - 1] = name;
            return P1;
        }
        if (!this.players[P2 - 1]) {
            this.players[P2 - 1] = name;
            if (this.status === WAITING_FOR_JOIN) {
                this.status = IN_PROGRESS;
            }
            return P2;
        }
        return 0;
    }

    updateStatus(player, location) {
        const rr = location.r;
        const cc = location.c;
        // check row connection
        let connected = 1;
        // console.log(`board[${rr}][${cc}] = ${this.board[rr][cc]}`);
        for (let c = cc - 1; c >= 0; --c) {
            if (this.board[rr][c] === player) {
                ++connected;
            } else {
                break;
            }
        }
        for (let c = cc + 1; c < this.size; ++c) {
            if (this.board[rr][c] === player) {
                ++connected;
            } else {
                break;
            }
        }
        // console.log("-------");
        // console.log(connected);
        if (connected >= REQ_CONNECT) {
            return this.setWin(player);
        }

        // check column connection
        connected = 1;
        for (let r = rr - 1; r >= 0; --r) {
            if (this.board[r][cc] === player) {
                ++connected;
            } else {
                break;
            }
        }
        for (let r = rr + 1; r < this.size; ++r) {
            if (this.board[r][cc] === player) {
                ++connected;
            } else {
                break;
            }
        }
        // console.log(connected);
        if (connected >= REQ_CONNECT) {
            return this.setWin(player);
        }

        // check forward diagonal
        connected = 1;
        for (let r = rr - 1, c = cc + 1; r >= 0 && c < this.size; --r, ++c) {
            if (this.board[r][c] === player) {
                ++connected;
            } else {
                break;
            }
        }
        for (let r = rr + 1, c = cc - 1; r < this.size && c >= 0; ++r, --c) {
            if (this.board[r][c] === player) {
                ++connected;
            } else {
                break;
            }
        }
        // console.log(connected);
        if (connected >= REQ_CONNECT) {
            return this.setWin(player);
        }

        // check backward diagonal
        connected = 1;
        for (let r = rr - 1, c = cc - 1; r >= 0 && c >= 0; --r, --c) {
            if (this.board[r][c] === player) {
                ++connected;
            } else {
                break;
            }
        }
        for (let r = rr + 1, c = cc + 1; r < this.size && c < this.size; ++r, ++c) {
            if (this.board[r][c] === player) {
                ++connected;
            } else {
                break;
            }
        }
        // console.log(connected);
        // console.log("-------");
        if (connected >= REQ_CONNECT) {
            return this.setWin(player);
        }
    }

    setWin(player) {
        if (player === P1) {
            this.status = WIN_P1;
        } else if (player === P2) {
            this.status = WIN_P2;
        }
        console.log("game: status changed to " + this.status);
        return player;
    }

    move(player, name, location) {
        // wrong player trying to make a move or game over
        if (player !== this.playerTurn) {
            console.log(`game: current turn is ${this.playerTurn}, ${player} trying to move`);
            return false;
        }
        if (this.status !== IN_PROGRESS) {
            console.log(`game: game status not in progress`);
            return false;
        }
        if (name !== this.players[player - 1]) {
            console.log(`game: given name ${name} does not match ${this.players[player - 1]}`);
            return false;
        }
        const {r, c} = location;
        // something there
        if (this.board[r][c] !== 0) {
            console.log("game: there's something there");
            return false;
        }

        this.board[r][c] = player;
        // swap to the other player
        this.playerTurn = nextPlayer(player);

        // update status of game
        this.updateStatus(player, location);

        return true;
    }

    getState() {
        return {
            status : this.status,
            players: this.players,
            turn   : this.playerTurn
        };
    }

    isGameOver() {
        return (this.status === WIN_P1 || this.status === WIN_P2);
    }

    getWinStatus() {
        // winning player is the previous one who made the move
        return {
            player : prevPlayer(this.playerTurn),
            message: this.status
        };
    }
};