/**
 * Created by Johnson on 2017-01-16.
 */

const def = require("./common/defines");
function pieceToString() {
    return (val) => {
        switch (val) {
        case def.EMPTY:
            return ".";
        case def.P1:
            return 1;
        case def.P2:
            return 2;
        }
    };
}
function floatToString(precision) {
    return (val) => {
        if (!val) {
            return ".";
        }
        return val.toPrecision(precision)
    };
}
function nodeToString(precision) {
    return (node) => {
        if (node) {
            return node.key.toPrecision(precision);
        }
        return ".";
    };
}

function printBoard(b, toString) {
    const size = b.length;
    for (let r = 0; r < size; ++r) {
        let str = "";
        for (let c = 0; c < size; ++c) {
            str += toString(b[r][c]) + "\t";
        }
        console.log(str);
    }
}

module.exports = {
    pieceToString,
    floatToString,
    nodeToString,
    printBoard,
};
