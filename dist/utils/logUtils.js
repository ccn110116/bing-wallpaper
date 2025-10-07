"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
function log(msg, ...args) {
    if (args.length > 0) {
        console.log(msg, ...args);
    }
    else {
        console.log(msg);
    }
}
exports.log = log;
