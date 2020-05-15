/**
 * Created by Johnson on 2017-01-21.
 */

const def = require("./defines");

const stats = {
    count       : 0,
    pruned      : 0,
    earlyReject : 0,
    terminalNode: 0,
    alphaUpdate : 0,
    betaUpdate  : 0,
    last        : null,
};
module.exports = class Session {
    constructor(newBoard) {
        this.playing = true;
        // default minimax search depth (when to start evaluating)
        this.searchDepth = 5;
        this.board = newBoard;

        this.scoreBoard = [];
        this.scoreBoard.length = this.board.length;
        newBoard.forEach((row, r) => {
            this.scoreBoard[r] = [];
            this.scoreBoard[r].length = row.length;
        });
        Session.clearBoard(this.scoreBoard);

        this.visitor = {};
    }

    registerVisitorMethods(methods) {
        Object.assign(this.visitor, {
            // default functions
            earlyRejectHeuristic(){
                return false;
            }
        }, methods);
    }

    /**
     * Make a move on a board as player
     * Use minimax algorithm with alpha-beta pruning up to depth searchDepth
     * @returns {{r: number, c: number}}
     */
    getMove() {
        const [maxValue, bestMoves] = this.minimaxAB(
            this.searchDepth,
            true,
            def.LOSS,
            def.WIN);

        console.log(`After searching ${this.searchDepth } depth, best move results in state value of ${ maxValue }`);
        for (let i = bestMoves.length - 1; i >= 0; --i) {
            const [r, c] = this.visitor.getMoveRC(bestMoves[i]);
            console.log(r, c);
        }
        return bestMoves[bestMoves.length - 1];
    }

    stopPlaying() {
        this.playing = false;
    }

    setDifficulty(difficulty) {
        console.log("Setting difficulty to", this.searchDepth);
        this.searchDepth = Number(difficulty);
    }

    // personal methods
    static clearBoard(board) {
        for (let r = 0, maxRow = board.length; r < maxRow; ++r) {
            for (let c = 0, maxCol = board[r].length; c < maxCol; ++c) {
                board[r][c] = 0;
            }
        }
    }

    printStats() {
        console.log(stats);
    }

    minimaxAB(depth, maxNode, alpha, beta) {
        ++stats.count;
        if (stats.count % 10000 == 0) {
            const now = new Date();
            const elapsed = now - stats.last;
            stats.last = now;
            console.log(`elasped (ms) ${elapsed} alpha ${alpha} beta ${beta}`);
            this.printStats();
        }
        let prevMoves = [];
        let move = null;
        let value = null;
        let moveValue;
        // reached terminal
        if (!depth) {
            value = this.visitor.evaluateBoard();
            return [value, prevMoves];
        }

        const orderedMoves = this.visitor.getMoveConsiderationOrder(maxNode);

        value = (maxNode) ? -Infinity : Infinity;
        for (let i = 0, length = orderedMoves.length; i < length; ++i) {
            const moveNode = orderedMoves[i];
            const [r, c] = this.visitor.getMoveRC(moveNode);
            // can only move if spot is open
            if (this.board[r][c] !== def.EMPTY) {
                continue;
            }

            if (this.visitor.earlyRejectHeuristic(moveNode, depth)) {
                ++stats.earlyReject;
                continue;
            }

            if (this.visitor.isTerminalNode(moveNode)) {
                ++stats.terminalNode;
                value = (maxNode) ? def.WIN : def.LOSS;
                move = moveNode;
                break;
            }


            // make move
            const momento = this.visitor.makeMove(moveNode, maxNode);
            [moveValue, prevMoves] =
                this.minimaxAB(depth - 1, !maxNode, alpha, beta);
            // revert move
            this.visitor.revertMove(moveNode, momento);

            if (maxNode) {
                // keep track of best score
                if (moveValue > value) {
                    value = moveValue;
                    move = moveNode;
                }
                if (value > alpha) {
                    alpha = value;
                    stats.alphaUpdate++;
                }
                // alpha pruning
            } else {
                if (moveValue < value) {
                    value = moveValue;
                    move = moveNode;
                }
                if (value < beta) {
                    beta = value;
                    stats.betaUpdate++;
                }
            }
            // populate move score board
            if (depth === this.searchDepth) { // a top level move
                this.scoreBoard[r][c] = moveValue;
            }
            // prune
            if (beta <= alpha) {
                ++stats.pruned;
                break;
            }
        }
        prevMoves.push(move);
        return [value, prevMoves];
    }
};
