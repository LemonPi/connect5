/**
 * Created by Johnson on 2017-01-06.
 */
const def = require("../common/defines");
const Session = require("../common/session");
const Score = {
    // link is in linking together how many pieces (so we need to link 5 to win)
    // blocking is in blocking how many other pieces (so we need to block 4 to not lose)
    // ranked situation scores
    BLOCK_MORE_THAN_4: 40,
    BLOCK_4_BOTH     : 30, // if you don't block, they'll win in 1 move unless we can win in 1 move
    BLOCK_4_ONE      : 25,
    LINK_4_BOTH      : 20,
    BLOCK_3_BOTH     : 10,
    LINK_3_BOTH      : 8,
    BLOCK_3_ONE      : 7,
    LINK_4_ONE       : 5,
    LINK_3_ONE       : 3,
    BLOCK_2_BOTH     : 2,
    BLOCK_2_ONE      : 1,
    OTHER            : [0, -1, -3, -6, -10, def.LOSS, def.LOSS, def.LOSS, def.LOSS, def.LOSS],
    OWN              : [0, 1, 3, 6, 10, def.WIN, def.WIN, def.WIN, def.WIN, def.WIN, def.WIN],
    // per unit scores
    LINK             : 2,
    BLOCK            : 1,
    PIECE_BASE       : 0.1,
    PIECE_DECAY      : 0.8, // multiplier for how fast space score decays with distance
    PIECE            : [],
};

const PIECE_MAX = 30;
// actual space score will be penalized by distance
for (let spaceScore = Score.PIECE_BASE, space = 0; space < PIECE_MAX;
     ++space, spaceScore *= Score.PIECE_DECAY) {
    Score.PIECE[space] = spaceScore;
}

function breadthFirstSearch(board, r, c, op) {
    const size = board.length;  // assume square
    const visited = [];
    board.forEach((row, i) => {
        visited[i] = [];
        visited[i].length = size;
        visited[i].fill(false);
    });

    let exploring = [];
    visited[r][c] = true;
    exploring.push([r, c]);

    let layer = 0;
    while (exploring.length !== 0) {
        const exploringNext = [];
        for (let i = 0; i < exploring.length; ++i) {
            const [rr, cc] = exploring[i];
            op(rr, cc, layer);
            // N
            r = rr - 1;
            c = cc;
            if (r >= 0 && !visited[r][c]) {
                visited[r][c] = true;
                exploringNext.push([r, c]);
            }
            // NW
            c = cc - 1;
            if (r >= 0 && c >= 0 && !visited[r][c]) {
                visited[r][c] = true;
                exploringNext.push([r, c]);
            }
            // W
            r = rr;
            if (c >= 0 && !visited[r][c]) {
                visited[r][c] = true;
                exploringNext.push([r, c]);
            }
            // SW
            r = rr + 1;
            if (r < size && c >= 0 && !visited[r][c]) {
                visited[r][c] = true;
                exploringNext.push([r, c]);
            }
            // S
            c = cc;
            if (r < size && !visited[r][c]) {
                visited[r][c] = true;
                exploringNext.push([r, c]);
            }
            // SE
            c = cc + 1;
            if (r < size && c < size && !visited[r][c]) {
                visited[r][c] = true;
                exploringNext.push([r, c]);
            }
            // E
            r = rr;
            if (c < size && !visited[r][c]) {
                visited[r][c] = true;
                exploringNext.push([r, c]);
            }
            // NE
            r = rr - 1;
            if (r >= 0 && c < size && !visited[r][c]) {
                visited[r][c] = true;
                exploringNext.push([r, c]);
            }
        }
        ++layer;
        exploring = exploringNext;
    }
}


module.exports = class StateSession extends Session {
    constructor(newBoard, player) {
        super(newBoard);
        this.size = this.board.length;
        this.player = player;
        this.otherPlayer = def.nextPlayer(player);

        this.movesSurroundingCenter = [];
        this.rawPieceScore = [];
        const radius = Math.floor(this.size / 2);
        breadthFirstSearch(this.board, radius, radius, (r, c) => {
            if (this.board[r][c] === def.EMPTY) {
                this.movesSurroundingCenter.push([r, c]);
            }
        });
        this.board.forEach((row, r) => {
            this.rawPieceScore[r] = [];
        });
        breadthFirstSearch(this.board, radius, radius, (r, c, layer) => {
            this.rawPieceScore[r][c] = Score.PIECE[layer];
        });
        super.registerVisitorMethods({
            evaluateBoard            : this.evaluateBoard.bind(this),
            getMoveConsiderationOrder: this.getMoveConsiderationOrder.bind(this),
            getMoveRC                : StateSession.getMoveRC,
            isTerminalNode           : StateSession.isTerminalNode,
            makeMove                 : this.makeMove.bind(this),
            revertMove               : this.revertMove.bind(this),
            earlyRejectHeuristic     : this.earlyRejectHeuristic.bind(this),
        });
    }

    evaluateBoard() {
        let score = 0;
        // raw piece placement score (encourage placing near center?)
        this.board.forEach((row, r) => {
            row.forEach((piece, c) => {
                if (piece === this.player) {
                    score += this.rawPieceScore[r][c];
                } else if (piece === this.otherPlayer) {
                    score -= this.rawPieceScore[r][c];
                }
            });
        });

        let ownConnect = 0;
        let otherConnect = 0;

        const clearConnections = () => {
            score += Score.OWN[ownConnect];
            score += Score.OTHER[otherConnect];
            ownConnect = 0;
            otherConnect = 0;
        };

        const scorePiece = (piece) => {
            if (piece === this.player) {
                ++ownConnect;
                score += Score.OTHER[otherConnect];
                otherConnect = 0;
            } else if (piece === this.otherPlayer) {
                ++otherConnect;
                score += Score.OWN[ownConnect];
                ownConnect = 0;
            } else {
                clearConnections();
            }
        };

        // horizontal connections
        for (let r = 0; r < this.size; ++r) {
            for (let c = 0; c < this.size; ++c) {
                scorePiece(this.board[r][c]);
            }
            clearConnections();
        }
        clearConnections();

        // vertical connections
        for (let c = 0; c < this.size; ++c) {
            for (let r = 0; r < this.size; ++r) {
                scorePiece(this.board[r][c]);
            }
            clearConnections();
        }
        clearConnections();

        // forward diagonal
        let cc = 0;
        for (let r = 0; r < this.size; ++r) {
            for (let moved = 0; moved <= r; ++moved) {
                scorePiece(this.board[r - moved][cc + moved]);
            }
            clearConnections();
        }
        clearConnections();
        let rr = this.size - 1;
        // already did the full diagonal, so start at 1 off from that
        for (let c = 1; c < this.size; ++c) {
            for (let moved = 0; moved < this.size - c; ++moved) {
                scorePiece(this.board[rr - moved][c + moved]);
            }
            clearConnections();
        }
        clearConnections();

        // backward diagonal
        rr = 0;
        for (let c = 0; c < this.size; ++c) {
            for (let moved = 0; moved < this.size - c; ++moved) {
                scorePiece(this.board[rr + moved][c + moved]);
            }
            clearConnections();
        }
        clearConnections();
        cc = 0;
        // already did full diagonal, start with offset
        for (let r = 1; r < this.size; ++r) {
            for (let moved = 0; moved < this.size - r; ++moved) {
                scorePiece(this.board[r + moved][cc + moved]);
            }
            clearConnections();
        }
        clearConnections();


        return score;
    }

    getMoveConsiderationOrder() {
        return this.movesSurroundingCenter;
    }

    static getMoveRC(rc) {
        return rc;
    }

    static isTerminalNode() {
        // TODO replace stub
        return false;
    }

    makeMove([r, c], maxNode) {
        this.board[r][c] = (maxNode) ? this.player : this.otherPlayer;
    }

    revertMove([r, c]) {
        this.board[r][c] = def.EMPTY;
    }

    earlyRejectHeuristic([r, c], depth) {
        // never reject first move
        if (depth === this.searchDepth) {
            return false;
        }
        // HEURISTIC: only worth considering moving to if there is another piece next to it
        // in most cases this is true
        let noNeighbours = true;
        for (let piece of StateSession.neighbourPieces(this.board, r, c)) {
            if (piece !== def.EMPTY) {
                noNeighbours = false;
                break;
            }
        }

        // reject if no neighbours
        return noNeighbours;
    }


    // visit neighbours
    static *neighbourPieces(board, r, c) {
        const size = board.length;
        if (r > 0) {
            // N
            yield board[r - 1][c];
            if (c > 0) {
                // NW
                yield board[r - 1][c - 1];
            }
        }
        if (c > 0) {
            // W
            yield board[r][c - 1];
            if (r < size - 1) {
                // SW
                yield board[r + 1][c - 1];
            }
        }
        if (r < size - 1) {
            // S
            yield board[r + 1][c];
            if (c < size - 1) {
                // SE
                yield board[r + 1][c + 1];
            }
        }
        if (c < size - 1) {
            // E
            yield board[r][c + 1];
            // NE
            if (r > 0) {
                yield board[r - 1][c + 1];
            }
        }
    }

};
