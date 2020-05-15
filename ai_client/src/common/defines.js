/**
 * Created by Johnson on 2017-01-21.
 */
module.exports = {
    EMPTY: 0,
    P1   : 1,
    P2   : 2,
    WIN  : Number.POSITIVE_INFINITY,
    LOSS : Number.NEGATIVE_INFINITY,
    // 2 players
    nextPlayer(player) {
        return 3 - player;
    }

};
