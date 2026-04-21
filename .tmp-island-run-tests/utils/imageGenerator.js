"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAndDownloadImage = generateAndDownloadImage;
exports.shareOrDownloadImage = shareOrDownloadImage;
const html2canvas_1 = __importDefault(require("html2canvas"));
/**
 * Generate and download an image from a DOM element
 * @param element - The DOM element to capture
 * @param fileName - The name of the file to download
 */
async function generateAndDownloadImage(element, fileName = 'year-in-review.png') {
    try {
        // Generate canvas from element
        const canvas = await (0, html2canvas_1.default)(element, {
            backgroundColor: null,
            scale: 2, // Higher quality
            logging: false,
            useCORS: true,
        });
        // Convert canvas to blob
        const blob = await new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/png', 1.0);
        });
        if (!blob) {
            throw new Error('Failed to generate image');
        }
        // Create download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    catch (error) {
        console.error('Failed to generate image:', error);
        throw error;
    }
}
/**
 * Share image via Web Share API if available, otherwise download
 * @param element - The DOM element to capture
 * @param fileName - The name of the file
 * @param shareData - Optional share data (title, text)
 */
async function shareOrDownloadImage(element, fileName = 'year-in-review.png', shareData) {
    try {
        // Generate canvas from element
        const canvas = await (0, html2canvas_1.default)(element, {
            backgroundColor: null,
            scale: 2,
            logging: false,
            useCORS: true,
        });
        // Convert canvas to blob
        const blob = await new Promise((resolve) => {
            canvas.toBlob(resolve, 'image/png', 1.0);
        });
        if (!blob) {
            throw new Error('Failed to generate image');
        }
        // Try to use Web Share API if available
        if (navigator.share && typeof navigator.canShare === 'function') {
            const file = new File([blob], fileName, { type: 'image/png' });
            const sharePayload = {
                files: [file],
                title: shareData?.title || 'My Year in Review',
                text: shareData?.text || 'Check out my year in review!',
            };
            if (navigator.canShare(sharePayload)) {
                await navigator.share(sharePayload);
                return;
            }
        }
        // Fallback to download
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    catch (error) {
        console.error('Failed to share/download image:', error);
        throw error;
    }
}
