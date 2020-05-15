/**
 * Created by Johnson on 2017-01-06.
 */

module.exports = {
    makeConnect(name) {
        return JSON.stringify({
            type: "connect",
            ai  : true,
            name
        });
    },
    makeJoin(game, name) {
        return JSON.stringify({
            type: "join",
            name,
            game
        })
    },
    makeBoard(game) {
        return JSON.stringify({
            type: "board",
            game
        });
    },
    makeLeave(game) {
        return JSON.stringify({
            type: "leave",
            game
        });
    },
    makeMove(data) {
        return JSON.stringify(Object.assign({
            type: "getMove",
        }, data));
    },
    makeCreate() {
        return JSON.stringify({type: "create"});
    },
    makeState(game) {
        return JSON.stringify({
            type: "state",
            game
        });
    },
};