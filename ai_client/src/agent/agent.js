/**
 * Created by Johnson on 2017-01-08.
 */
const BST = require("bbst");
const def = require("../common/defines");

/**
 * How far does a move propagate a score update
 * @type {number}
 */
const UPDATE_DIST = 4;

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
    // per unit scores
    LINK             : 2,
    BLOCK            : 1,
    SPACE_BASE       : 0.1,
    SPACE_DECAY      : 0.8, // multiplier for how fast space score decays with distance
    SPACE            : [0],
};

const SPACE_MAX = 30;
// actual space score will be penalized by distance
for (let spaceScore = Score.SPACE_BASE, space = 1; space < SPACE_MAX;
     ++space, spaceScore *= Score.SPACE_DECAY) {
    Score.SPACE[space] = Score.SPACE[space - 1] + spaceScore;
}

const LINK_MAX = 4;
// minimum number of other pieces + space for us to consider blocking score
const BLOCK_MIN = 5;
const BLOCK_MAX = 9;

/**
 * Evaluation direction
 */
const LEFT = 0;
const RIGHT = 1;

function nextPlayer(player) {
    return 3 - player;
}

class Agent {
    constructor(board, player) {
        this.board = board;
        this.player = player;
        this.otherPlayer = nextPlayer(player);
        this.moveScores = null;
        this.locationNodeMap = null;

        // evaluation methods (has state, so not shared)
        this.linkingEvaluation = {
            player,
            otherPlayer: this.otherPlayer,
            start() {
                this.linked = 0;
                this.stopped = false;
                // total space represents room for growth outside of linked list
                this.space = [0, 0];
            },
            // keep going until blocked
            consumePiece(piece, direction) {
                if (this.stopped) {
                    // stop also if we encounter a gap between own pieces
                } else if (piece === this.otherPlayer || this.linked === LINK_MAX) {
                    this.stopped = true;
                } else {
                    // link only if no gap
                    if (piece === this.player && !this.space[direction]) {
                        this.linked += 1;
                    } else if (piece === def.EMPTY) {
                        this.space[direction] += 1;
                    }
                }
            },
            getScore() {
                this.stopped = true;
                // not enough space to ever win with this connection
                if (this.space[LEFT] + this.space[RIGHT] + this.linked < LINK_MAX) {
                    return 0;
                }
                const spaceScore = Score.SPACE[this.space[LEFT]] + Score.SPACE[this.space[RIGHT]];
                // depends also on the amount of space we have left to expand
                switch (this.linked) {
                case 0: // just own piece, then consider how much space we have to grow
                    // fall through
                case 1: // linking 1 other piece
                    return spaceScore + this.linked * Score.LINK;
                case 2: // linking 2 other pieces, start to become valuable
                    if (this.space[LEFT] && this.space[LEFT]) {
                        return Score.LINK_3_BOTH + spaceScore;
                    } else {
                        return Score.LINK_3_ONE + spaceScore;
                    }
                case 3:
                    if (this.space[LEFT] && this.space[RIGHT]) {
                        // connecting 4 and having space on both sides is winning unless they
                        // threaten to connect 5
                        return Score.LINK_4_BOTH;
                    } else {
                        return Score.LINK_4_ONE;
                    }
                case LINK_MAX: // LINK_MAX other own pieces
                    return def.WIN;
                default:
                    throw Error("Should never get this number of linked " + this.linked);
                }
            },
        };
        this.blockingEvaluation = {
            player,
            otherPlayer: this.otherPlayer,
            start() {
                this.blocked = 0;
                this.space = [0, 0];
                this.stopped = false;
            },
            // keep going until blocked by self
            consumePiece(piece, direction) {
                if (this.stopped) {
                } else if (piece === this.player || this.blocked === BLOCK_MAX) {
                    this.stopped = true;
                } else {
                    // link only if no gap
                    if (piece === this.otherPlayer && !this.space[direction]) {
                        this.blocked += 1;
                    } else if (piece === def.EMPTY) {
                        this.space[direction] += 1;
                    }
                }
            },
            // block only if current piece is other owned
            getScore() {
                this.stopped = true;
                // not enough space to ever win with this connection, not worth looking
                if (this.space[LEFT] + this.space[RIGHT] + this.blocked < BLOCK_MIN) {
                    return 0;
                }
                const spaceScore = Score.SPACE[this.space[LEFT]] + Score.SPACE[this.space[RIGHT]];
                // depends also on the amount of space we have left to expand
                switch (this.blocked) {
                case 0: // just own piece, then consider how much space we have to grow
                    // fall through
                case 1: // blocking 1 other piece
                    return spaceScore + this.blocked * Score.BLOCK;
                case 2: // blocking 2 other pieces, start to become valuable
                    if (this.space[LEFT] && this.space[LEFT]) {
                        return Score.BLOCK_2_BOTH + spaceScore;
                    } else {
                        return Score.BLOCK_2_ONE + spaceScore;
                    }
                case 3:
                    if (this.space[LEFT] && this.space[RIGHT]) {
                        return Score.BLOCK_3_BOTH;
                    } else {
                        return Score.BLOCK_3_ONE;
                    }
                case 4: // LINK_MAX other own pieces
                    if (this.space[LEFT] && this.space[RIGHT]) {
                        return Score.BLOCK_4_BOTH;
                    } else {
                        return Score.BLOCK_4_ONE;
                    }
                    // more than 4?? need to block right
                default:
                    return Score.BLOCK_MORE_THAN_4;
                }
            },
        };
        this.initMoveScores();
    }

    /**
     * Evaluate each point on the board and assign a score
     */
    initMoveScores() {
        this.moveScores = new BST();
        this.locationNodeMap = [];
        this.board.forEach((row, r) => {
            this.locationNodeMap[r] = [];
            row.forEach((piece, c) => {
                const data = {
                    key: this.evaluateMove(r, c),
                    r,
                    c
                };
                // we create it because we'll need it to evaluate the board later
                this.locationNodeMap[r][c] = this.moveScores.insert(data);
                // not empty means already placed so can't be placed
                if (piece !== def.EMPTY) {
                    this.moveScores.eraseNode(this.locationNodeMap[r][c]);
                }
            });
        });
    }

    evalStart() {
        this.linkingEvaluation.start();
        this.blockingEvaluation.start();
    }

    evalConsume(piece, direction) {
        this.linkingEvaluation.consumePiece(piece, direction);
        this.blockingEvaluation.consumePiece(piece, direction);
    }

    evalStopped() {
        return this.linkingEvaluation.stopped && this.blockingEvaluation.stopped;
    }

    evalScore() {
        return this.linkingEvaluation.getScore() + this.blockingEvaluation.getScore();
    }

    /**
     * Score the move this.board[r][c] = this.player without making the move
     * A move provides value in several ways:
     * - linking own pieces
     * - blocking other pieces
     * - grabbing empty space
     * @param rr
     * @param cc
     * @returns {Number} Score of the move at rr,cc with 0 = tie, + values being winning for AI
     */
    evaluateMove(rr, cc) {
        const board = this.board;
        const size = board.length;
        let score = 0;

        // fill each direction from move point

        // check row connection
        this.evalStart();
        for (let moved = 1; ; ++moved) {
            let gol = cc - moved >= 0;
            let gor = cc + moved < size;
            if ((!gol && !gor) || this.evalStopped()) {
                break;
            }
            if (gol) {
                this.evalConsume(board[rr][cc - moved], LEFT);
            }
            if (gor) {
                this.evalConsume(board[rr][cc + moved], RIGHT);
            }
        }
        score += this.evalScore();

        // check column connection
        this.evalStart();
        for (let moved = 1; ; ++moved) {
            let gol = rr - moved >= 0;
            let gor = rr + moved < size;
            if (!gol && !gor || this.evalStopped()) {
                break;
            }
            if (gol) {
                this.evalConsume(board[rr - moved][cc], LEFT);
            }
            if (gor) {
                this.evalConsume(board[rr + moved][cc], RIGHT);
            }
        }
        score += this.evalScore();

        // check forward diagonal
        this.evalStart();
        for (let moved = 1; ; ++moved) {
            let gol = (rr - moved >= 0) && (cc + moved < size);
            let gor = (rr + moved < size) && (cc - moved >= 0);
            if (!gol && !gor || this.evalStopped()) {
                break;
            }
            if (gol) {
                this.evalConsume(board[rr - moved][cc + moved], LEFT);
            }
            if (gor) {
                this.evalConsume(board[rr + moved][cc - moved], RIGHT);
            }
        }
        score += this.evalScore();

        // check backward diagonal
        this.evalStart();
        for (let moved = 1; ; ++moved) {
            let gol = (rr - moved >= 0) && (cc - moved >= 0);
            let gor = (rr + moved < size) && (cc + moved < size);
            if (!gol && !gor || this.evalStopped()) {
                break;
            }
            if (gol) {
                this.evalConsume(board[rr - moved][cc - moved], LEFT);
            }
            if (gor) {
                this.evalConsume(board[rr + moved][cc + moved], RIGHT);
            }
        }
        score += this.evalScore();

        return score;
    }

    updateMove(r, c) {
        const node = this.locationNodeMap[r][c];
        const oldScore = node.key;
        const newValue = this.evaluateMove(r, c);
        // still a potential move
        if (this.board[r][c] === def.EMPTY) {
            this.moveScores.changeKey(node, newValue);
        }
        return [r, c, oldScore];
    }

    updateMoveScoresAfterMove(rr, cc) {
        const changedScores = [];
        const node = this.locationNodeMap[rr][cc];
        const size = this.board.length;
        // first node is always the move itself; restore by reinserting
        changedScores.push([rr, cc, node.key]);
        // move has been made, can't make anymore
        this.moveScores.eraseNode(node);

        // changeKey with updated evalMove scores for those in a star pattern around node
        // only look at empty spots
        let moved = 1;
        for (let c = cc - 1; c >= 0 && moved <= UPDATE_DIST; --c, ++moved) {
            changedScores.push(this.updateMove(rr, c));
        }
        moved = 1;
        for (let c = cc + 1; c < size && moved <= UPDATE_DIST; ++c, ++moved) {
            changedScores.push(this.updateMove(rr, c));
        }

        moved = 1;
        // check column connection
        for (let r = rr - 1; r >= 0 && moved <= UPDATE_DIST; --r, ++moved) {
            changedScores.push(this.updateMove(r, cc));
        }
        moved = 1;
        for (let r = rr + 1; r < size && moved <= UPDATE_DIST; ++r, ++moved) {
            changedScores.push(this.updateMove(r, cc));
        }

        moved = 1;
        // check forward diagonal
        for (let r = rr - 1, c = cc + 1; r >= 0 && c < size && moved <= UPDATE_DIST;
             --r, ++c, ++moved) {
            changedScores.push(this.updateMove(r, c));
        }
        moved = 1;
        for (let r = rr + 1, c = cc - 1; r < size && c >= 0 && moved <= UPDATE_DIST;
             ++r, --c, ++moved) {
            changedScores.push(this.updateMove(r, c));
        }

        moved = 1;
        // check backward diagonal
        for (let r = rr - 1, c = cc - 1; r >= 0 && c >= 0 && moved <= UPDATE_DIST;
             --r, --c, ++moved) {
            changedScores.push(this.updateMove(r, c));
        }
        moved = 1;
        for (let r = rr + 1, c = cc + 1; r < size && c < size && moved <= UPDATE_DIST;
             ++r, ++c, ++moved) {
            changedScores.push(this.updateMove(r, c));
        }
        return changedScores;
    }

    revertMoveScores(oldScores) {
        oldScores.forEach(([r, c, oldScore], i) => {
            const node = this.locationNodeMap[r][c];
            // first node is the original move, which we removed and need to reinsert
            if (i === 0) {
                node.key = oldScore;
                this.moveScores._treapInsert(node);
                // still an available move
            } else if (this.board[node.r][node.c] === def.EMPTY) {
                this.moveScores.changeKey(node, oldScore);
                // already placed piece
            } else {
                node.key = oldScore;
            }
        });
    }

    stopPlaying() {
        this.moveScores = null;
        this.locationNodeMap = null;
    }
}

Agent.Score = Score;
module.exports = Agent;