import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

// Point to the worker file.
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/** Scale factor for PDF rendering (higher = better OCR quality but slower) */
const PDF_RENDER_SCALE = 1.5;

/** Vertical distance threshold (in points) to detect line breaks */
const LINE_BREAK_THRESHOLD = 5;

/** Horizontal gap threshold (in points) to detect word boundaries */
const WORD_GAP_THRESHOLD = 1;

/**
 * Renders the first page of a PDF file to an image blob.
 * Used for OCR processing when native text extraction fails.
 * 
 * @param file - PDF file to render
 * @returns Promise resolving to a PNG image blob
 * @throws Error if canvas context is unavailable or rendering fails
 */
export async function renderPdfToImage(file: File): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('Canvas 2D context not available');
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
    }).promise;

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Failed to convert canvas to blob'));
            }
        }, 'image/png');
    });
}

/** Represents a positioned text item from PDF extraction */
interface PositionedTextItem {
    str: string;
    x: number;
    y: number;
    w: number;
}

/**
 * Extracts text content from the first page of a PDF file.
 * Reconstructs text layout by analyzing item positions.
 * 
 * @param file - PDF file to extract text from
 * @returns Promise resolving to the extracted text string
 */
export async function extractPdfText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const content = await page.getTextContent();

    // Filter and map text items with position data
    const items: PositionedTextItem[] = content.items
        .filter((item): item is TextItem => 'str' in item && item.str !== undefined)
        .map((item) => ({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5],
            w: item.width
        }));

    // Sort by Y (descending) then X (ascending) to reconstruct reading order
    items.sort((a, b) => {
        const yDiff = b.y - a.y;
        if (Math.abs(yDiff) > LINE_BREAK_THRESHOLD) return yDiff;
        return a.x - b.x;
    });

    let text = '';
    let lastY = -1;
    let lastX = -1;
    let lastW = 0;

    for (const item of items) {
        if (lastY !== -1 && Math.abs(item.y - lastY) > LINE_BREAK_THRESHOLD) {
            text += '\n';
        } else if (lastX !== -1) {
            // Smart spacing: add space if gap exceeds threshold
            const gap = item.x - (lastX + lastW);
            if (gap > WORD_GAP_THRESHOLD) {
                text += ' ';
            }
        }
        text += item.str;
        lastY = item.y;
        lastX = item.x;
        lastW = item.w;
    }

    return text;
}
