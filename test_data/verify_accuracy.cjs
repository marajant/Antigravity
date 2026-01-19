/**
 * OCR Accuracy Verification Script
 * Extracts full text from sample PDFs to verify OCR accuracy
 */

const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

const QUE_PATH = 'C:\\Users\\mmolway\\Downloads\\Que';

// Sample files for verification - one from each vendor
const sampleFiles = [
    { vendor: 'Dot Loop', path: 'Dot Loop/INV03052727_P32934622_08052025.pdf' },
    { vendor: 'Home Depot', path: 'Home Depot/eReceipt (1).pdf' },
    { vendor: 'Kansas Gas', path: 'Kansas gas/8334/DOC_128281491.pdf' },
    { vendor: 'Navy Fed', path: 'Navy fed/2024-01-08_AXSTMT.pdf' },
    { vendor: 'Vyde', path: 'Vyde/INV-352424.pdf' },
    { vendor: 'Water One', path: 'Water one/data (1).pdf' },
    { vendor: 'WM', path: 'WM/WMI5000_DirectInvoice.aspx.pdf' },
];

async function extractFullText(filePath) {
    const data = new Uint8Array(fs.readFileSync(filePath));
    const doc = await pdfjsLib.getDocument({ data }).promise;
    let fullText = '';

    for (let i = 1; i <= Math.min(doc.numPages, 2); i++) { // First 2 pages
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += `\n--- PAGE ${i} ---\n${pageText}`;
    }

    return fullText;
}

async function verifyAccuracy() {
    console.log('='.repeat(80));
    console.log('OCR ACCURACY VERIFICATION');
    console.log('='.repeat(80));

    const results = [];

    for (const sample of sampleFiles) {
        const fullPath = path.join(QUE_PATH, sample.path);
        console.log(`\n${'='.repeat(80)}`);
        console.log(`VENDOR: ${sample.vendor}`);
        console.log(`FILE: ${sample.path}`);
        console.log('='.repeat(80));

        try {
            const text = await extractFullText(fullPath);
            console.log('\nFULL EXTRACTED TEXT:');
            console.log('-'.repeat(40));
            console.log(text);
            console.log('-'.repeat(40));

            // Manual identification hints
            console.log('\n📌 LOOK FOR:');
            console.log('  - Total/Amount Due: search for "total", "due", "amount"');
            console.log('  - Date: search for dates in any format');
            console.log('  - Merchant: typically at the top of the document');

            results.push({
                vendor: sample.vendor,
                file: sample.path,
                textLength: text.length,
                text: text.substring(0, 2000) // Store first 2000 chars for analysis
            });

        } catch (error) {
            console.log(`ERROR: ${error.message}`);
            results.push({
                vendor: sample.vendor,
                file: sample.path,
                error: error.message
            });
        }
    }

    // Save results for analysis
    const reportPath = path.join(__dirname, 'ocr_verification_texts.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n\n📄 Verification data saved to: ${reportPath}`);
}

verifyAccuracy().catch(console.error);
