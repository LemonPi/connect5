/**
 * Created by Johnson on 2017-01-06.
 */
const def = require("../common/defines");
const Agent = require("./agent");
const Session = require("../common/session");

module.exports = class AgentSession extends Session {
    constructor(newBoard, player) {
        super(newBoard);
        // binary search tree for efficient ordered traversal
        // mirror data structures for both agents
        this.own = new Agent(newBoard, player);
        this.other = new Agent(newBoard, this.own.otherPlayer);
        super.registerVisitorMethods({
            evaluateBoard            : this.evaluateBoard.bind(this),
            getMoveConsiderationOrder: this.getMoveConsiderationOrder.bind(this),
            getMoveRC                : AgentSession.getMoveRC,
            isTerminalNode           : AgentSession.isTerminalNode,
            makeMove                 : this.makeMove.bind(this),
            revertMove               : this.revertMove.bind(this),
        });
    }

    updateAfterMove({r, c}, player) {
        // update our board (which agents will see)
        this.board[r][c] = player;

        // update scores
        this.own.moveScores.updateMoveScoresAfterMove(r, c);
        this.other.moveScores.updateMoveScoresAfterMove(r, c);
    }

    stopPlaying() {
        super.stopPlaying();
        this.own.stopPlaying();
        this.other.stopPlaying();
    }

    static getAgentMoveScores(agent) {
        const scores = [];
        agent.locationNodeMap.forEach((row, r) => {
            scores[r] = [];
            scores[r].length = row.length;
            row.forEach((node, c) => {
                scores[r][c] = node.key;
            });
        });
        return scores;
    }

    // visitor methods
    static getMoveRC(moveNode) {
        return [moveNode.r, moveNode.c];
    }

    static isTerminalNode(moveNode) {
        return moveNode.key === Agent.WIN;
    }

    getMoveConsiderationOrder(maxNode) {
        let moves = [];
        // For max nodes, we want to explore the best nodes first (highest score/key);
        if (maxNode) {
            for (let moveNode of this.own.moveScores.reverseIterator()) {
                moves.push(moveNode);
            }
        } else {
            for (let moveNode of this.other.moveScores.reverseIterator()) {
                moves.push(moveNode);
            }
        }
        return moves;
    }

    makeMove({r, c}, maxNode) {
        this.board[r][c] = (maxNode) ? this.own.player : this.own.otherPlayer;
        const oldScores = this.own.updateMoveScoresAfterMove(r, c);
        const otherOldScores = this.other.updateMoveScoresAfterMove(r, c);
        return {
            oldScores,
            otherOldScores
        };
    }

    revertMove({r, c}, {oldScores, otherOldScores}) {
        this.board[r][c] = def.EMPTY;
        this.own.revertMoveScores(oldScores);
        this.other.revertMoveScores(otherOldScores);
    }

    evaluateBoard() {
        let score = 0;
        this.board.forEach((row, r) => {
            row.forEach((piece, c) => {
                if (piece === this.own.player) {
                    score += this.own.locationNodeMap[r][c].key;
                } else if (piece === this.other.player) {
                    score -= this.other.locationNodeMap[r][c].key;
                }
            });
        });
        return score;
    }
};

