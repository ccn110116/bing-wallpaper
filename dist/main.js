"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const siteGenerator_1 = require("./core/siteGenerator");
const logUtils_1 = require("./utils/logUtils");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        (0, logUtils_1.log)('Starting Bing Wallpaper fetch...');
        yield (0, siteGenerator_1.generateSite)('en-US');
        yield (0, siteGenerator_1.generateSite)('zh-CN');
        yield (0, siteGenerator_1.generateSite)('zh-HK');
        yield (0, siteGenerator_1.generateSite)('zh-TW');
        (0, logUtils_1.log)('Bing Wallpaper fetch finished.');
    });
}
main();
