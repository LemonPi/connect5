/**
 * Created by Johnson on 2017-01-05.
 */
const uid = require("uid");

function has(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
function pickRandomFromList(list) {
    if (!list) {
        return "";
    }
    const randomIndex = Math.floor(Math.random() * list.length);
    return list.splice(randomIndex, 1)[0];
}

function getUniqueID() {
    // not really unique nor random...
    return Math.random();
}

module.exports = {
    has,
    pickRandomFromList,
    getUniqueID,
};

