import * as pdfjsLib from 'pdfjs-dist';

// Point to the worker file.
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function renderPdfToImage(file: File): Promise<Blob> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1); // Get first page

    const viewport = page.getViewport({ scale: 1.5 }); // 1.5x scale for better OCR
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('Canvas context not available');
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
        canvasContext: context,
        viewport: viewport
    } as any).promise; // Cast to any to satisfy type checking for .promise

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

export async function extractPdfText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const content = await page.getTextContent();

    // Sort items by Y (desc) then X (asc) to reconstruct lines
    // Filter out items that don't have 'str' (TextMarkedContent) and cast to any for simplicity with PDFJS types
    const items = content.items
        .filter((item: any) => item.str !== undefined)
        .map((item: any) => ({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5],
            w: item.width // Capture width
        }));

    items.sort((a, b) => {
        const yDiff = b.y - a.y;
        if (Math.abs(yDiff) > 5) return yDiff; // significant vertical difference
        return a.x - b.x;
    });

    let text = '';
    let lastY = -1;
    let lastX = -1;
    let lastW = 0;

    for (const item of items) {
        if (lastY !== -1 && Math.abs(item.y - lastY) > 5) {
            text += '\n';
        } else if (lastX !== -1) {
            // Smart Spacing: Only add space if gap is significant
            // Lowered threshold to 1 to prevent smashing words together (e.g. "DueDate01/17")
            const gap = item.x - (lastX + lastW);
            if (gap > 1) {
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
