"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.generateSite = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const httpUtils_1 = require("../utils/httpUtils");
const logUtils_1 = require("../utils/logUtils");
const BING_API_TEMPLATE = "https://global.bing.com/HPImageArchive.aspx?format=js&idx=0&n=9&pid=hp&FORM=BEHPTB&uhd=1&uhdwidth=3840&uhdheight=2160&setmkt=%s&setlang=en";
const BING_URL = "https://cn.bing.com";
const DATA_PATH = path.resolve('worker/assets/data');
const README_PATH = path.resolve('README.md');
function generateSite(region) {
    return __awaiter(this, void 0, void 0, function* () {
        const bingApi = BING_API_TEMPLATE.replace('%s', region);
        const httpContent = yield (0, httpUtils_1.getHttpContent)(bingApi);
        if (!httpContent) {
            return;
        }
        const jsonObject = JSON.parse(httpContent);
        const images = jsonObject.images.map((image) => ({
            desc: image.copyright,
            date: new Date(image.enddate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).toISOString().split('T')[0],
            url: BING_URL + image.url,
        }));
        // Group images by month (e.g., "2025-10")
        const imagesByMonth = new Map();
        for (const image of images) {
            const monthStr = image.date.substring(0, 7); // YYYY-MM
            if (!imagesByMonth.has(monthStr)) {
                imagesByMonth.set(monthStr, []);
            }
            imagesByMonth.get(monthStr).push(image);
        }
        // Update JSON files for each month
        for (const [monthStr, monthImages] of imagesByMonth.entries()) {
            yield updateMonthlyJson(monthImages, region, monthStr);
        }
        // Update README only with the latest images from the primary region
        if (region === 'en-US') {
            yield updateReadme(images);
        }
    });
}
exports.generateSite = generateSite;
function updateMonthlyJson(images, region, monthStr) {
    return __awaiter(this, void 0, void 0, function* () {
        const regionPath = path.resolve(DATA_PATH, region);
        yield fs.mkdir(regionPath, { recursive: true });
        const filePath = path.resolve(regionPath, `${monthStr}.json`);
        let existingImages = [];
        try {
            const content = yield fs.readFile(filePath, 'utf-8');
            existingImages = JSON.parse(content);
        }
        catch (error) {
            // File might not exist, which is fine
        }
        const imageMap = new Map();
        existingImages.forEach(img => imageMap.set(img.date, img));
        images.forEach(img => imageMap.set(img.date, img));
        const allImages = Array.from(imageMap.values());
        allImages.sort((a, b) => b.date.localeCompare(a.date));
        yield fs.writeFile(filePath, JSON.stringify(allImages, null, 2));
        (0, logUtils_1.log)(`Updated ${filePath}`);
    });
}
function updateReadme(images) {
    return __awaiter(this, void 0, void 0, function* () {
        if (images.length === 0) {
            return;
        }
        const latestImage = images[0];
        const readmeContent = `
# Bing Wallpaper

![${latestImage.desc}](${latestImage.url}&w=1000)
*Today: [${latestImage.desc}](${latestImage.url})*

## Recent Wallpapers

| Date       | Description |
|------------|-------------|
${images.map(img => `| ${img.date} | [${img.desc}](${img.url}) |`).join('\n')}
`;
        yield fs.writeFile(README_PATH, readmeContent);
        (0, logUtils_1.log)('Updated README.md');
    });
}
