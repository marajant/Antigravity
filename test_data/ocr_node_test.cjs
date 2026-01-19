/**
 * OCR Test Script - Updated with new parsing logic
 * Tests the updated PDF text extraction and parsing logic
 */

const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

const QUE_PATH = 'C:\\Users\\mmolway\\Downloads\\Que';

// ============================================
// KNOWN VENDOR PATTERNS (from updated ocr.ts)
// ============================================
// ============================================
// KNOWN VENDOR PATTERNS (from updated ocr.ts)
// ============================================
const KNOWN_VENDORS = [
    // 1. UTILITIES / BANKS / SERVICE PROVIDERS (Priority)
    { pattern: /navy\s*federal/i, name: 'Navy Federal' },
    { pattern: /kansas\s*gas\s*service|kansas\s*gas/i, name: 'Kansas Gas Service' },
    { pattern: /waterone|water\s*one/i, name: 'WaterOne' },
    { pattern: /waste\s*management|deffenbaugh|wm\s*corporate|\bwm\b/i, name: 'Waste Management' },
    { pattern: /vyde/i, name: 'Vyde' },
    { pattern: /evergy/i, name: 'Evergy' },
    { pattern: /dot\s*loop|dotloop|showingtime/i, name: 'Dot Loop' },
    { pattern: /chase/i, name: 'Chase' },

    // 2. RETAILERS (Secondary)
    { pattern: /home\s*depot/i, name: 'Home Depot' },
    { pattern: /starbucks/i, name: 'Starbucks' },
    { pattern: /amazon/i, name: 'Amazon' },
    { pattern: /walmart/i, name: 'Walmart' },
    { pattern: /target\s*(?:store)?/i, name: 'Target' },
    { pattern: /costco/i, name: 'Costco' },
];

// ============================================
// CREDIT CARD STATEMENT DETECTION
// ============================================
function isCreditCardStatement(text) {
    const indicators = [
        'statement closing date',
        'payment due date',
        'minimum payment',
        'credit limit',
        'available credit',
        'billing cycle',
        'previous balance',
        'new balance',
        'summary of account',
        'annual summary'
    ];
    const lower = text.toLowerCase();
    const matchCount = indicators.filter(i => lower.includes(i)).length;
    return matchCount >= 3;
}

// ============================================
// AMOUNT SKIP PATTERNS
// ============================================
const AMOUNT_SKIP_PATTERNS = [
    /page\s*\d+\s*of\s*\d+/i,
    /number\s*of\s*pages/i,
    /payment\s*received/i,
    /thank\s*you\s*for\s*your\s*payment/i,
    /credits?\s*[-−]/i,
    /payments?\s*and\s*credits/i,
];

// Updated extraction matching ocr.ts
function extractMoney(str) {
    // Skip lines that match skip patterns
    if (AMOUNT_SKIP_PATTERNS.some(p => p.test(str))) {
        return null;
    }

    const matches = [...str.matchAll(/[$£€]?\s?(\d{1,3}(,\d{3})*(\.\d{2})|\d+\.\d{2})/g)];
    if (!matches || matches.length === 0) return null;

    const nums = matches
        .map(m => parseFloat(m[0].replace(/[$£€,\s]/g, '')))
        .filter(n => !isNaN(n))
        .filter(n => n > 1.00)      // Skip page numbers
        .filter(n => n < 100000);   // Sanity check

    return nums.length > 0 ? Math.max(...nums) : null;
}

function extractDate(str) {
    const months = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December";
    const datePattern = `(\\d{4}\\s*[\\/\\-\\.]\\s*\\d{1,2}\\s*[\\/\\-\\.]\\s*\\d{1,2})|` +
        `(\\d{1,2}\\s*[\\/\\-\\.]\\s*\\d{1,2}\\s*[\\/\\-\\.]\\s*\\d{2,4})|` +
        `\\b((${months})\\s+\\d{1,2}(?:st|nd|rd|th)?[,\\s]*\\d{4})\\b|` +
        `\\b(\\d{1,2}(?:st|nd|rd|th)?\\s+(${months})[,\\s]*\\d{4})\\b`;
    const dateRegex = new RegExp(datePattern, 'i');

    let m = str.match(dateRegex);
    if (!m) {
        const squashed = str.replace(/\s+/g, '');
        const squashedRegex = /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})|(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/;
        m = squashed.match(squashedRegex);
    }
    if (!m) return null;
    try {
        let dateStr = m[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) dateStr = dateStr.replace(/-/g, '/');
        const d = new Date(dateStr);
        return !isNaN(d.getTime()) ? d.toLocaleDateString('en-CA') : null;
    } catch { return null; }
}

// NEW: Extract merchant using known vendor patterns
function extractMerchant(text, lines) {
    // 1. Check for known vendor patterns in HEADER (first 3000 chars)
    const headerText = text.substring(0, 3000);

    for (const { pattern, name } of KNOWN_VENDORS) {
        if (pattern.test(headerText)) {
            return name;
        }
    }

    // 2. Look for company name indicators
    const companyIndicators = ['LLC', 'Inc', 'Corp', 'Company', 'Service'];
    for (const line of lines.slice(0, 15)) {
        for (const indicator of companyIndicators) {
            if (line.includes(indicator)) {
                return line.trim().substring(0, 50);
            }
        }
    }

    // 3. Fallback to first non-empty line that's not noise
    const nonEmptyLines = lines.filter(l => {
        const trimmed = l.trim();
        if (trimmed.length === 0) return false;
        if (/^\d+$/.test(trimmed)) return false;
        if (/^page\s*\d/i.test(trimmed)) return false;
        if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(trimmed)) return false;
        return true;
    });

    return nonEmptyLines[0]?.trim().substring(0, 50) || null;
}

async function extractPdfText(filePath) {
    try {
        const data = new Uint8Array(fs.readFileSync(filePath));
        const doc = await pdfjsLib.getDocument({ data }).promise;
        let fullText = '';

        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        return fullText;
    } catch (error) {
        return `ERROR: ${error.message}`;
    }
}

function parseReceipt(text) {
    const lines = text.split('\n');
    const result = {
        amount: null,
        date: null,
        merchant: null,
        isStatement: false
    };

    // Detect credit card statement
    result.isStatement = isCreditCardStatement(text);

    // Amount extraction with updated keyword priority
    const amountKeywords = result.isStatement
        ? ['new balance', 'statement balance', 'total balance', 'minimum payment due', 'total amount due', 'amount due', 'balance due']
        : ['total amount due', 'amount due', 'total due', 'balance due', 'new balance', 'account balance', 'total', 'amount'];

    for (const keyword of amountKeywords) {
        const line = lines.find(l => l.toLowerCase().includes(keyword));
        if (line) {
            const val = extractMoney(line);
            if (val !== null) {
                result.amount = val;
                break;
            } else {
                // Check surrounding lines
                const idx = lines.indexOf(line);
                for (let i = 1; i <= 3; i++) {
                    if (idx - i >= 0) {
                        const prevVal = extractMoney(lines[idx - i]);
                        if (prevVal !== null) { result.amount = prevVal; break; }
                    }
                }
                if (result.amount !== null) break;
                if (idx + 1 < lines.length) {
                    const nextVal = extractMoney(lines[idx + 1]);
                    if (nextVal !== null) { result.amount = nextVal; break; }
                }
            }
        }
    }

    // Fallback: Max number
    if (result.amount === null) {
        const globalMatches = [...text.matchAll(/[$£€]?\s?(\d{1,3}(,\d{3})*(\.\d{2})|\d+\.\d{2})/g)];
        const globalNums = globalMatches
            .map(m => parseFloat(m[0].replace(/[$£€,\s]/g, '')))
            .filter(n => !isNaN(n) && n > 1.00 && n < 100000);
        if (globalNums.length > 0) {
            result.amount = Math.max(...globalNums);
        }
    }

    // Date extraction
    const dateKeywords = ['due date', 'bill date', 'statement date', 'date', 'service period'];
    for (const keyword of dateKeywords) {
        const line = lines.find(l => l.toLowerCase().includes(keyword));
        if (line) {
            const d = extractDate(line);
            if (d) { result.date = d; break; }
        }
    }
    if (!result.date) {
        result.date = extractDate(text);
    }

    // NEW: Use improved merchant extraction
    result.merchant = extractMerchant(text, lines);

    return result;
}

async function testFile(filePath, expectedVendor) {
    const filename = path.basename(filePath);

    const text = await extractPdfText(filePath);
    if (text.startsWith('ERROR:')) {
        return { success: false, error: text, filename, vendor: expectedVendor };
    }

    const result = parseReceipt(text);

    const hasAmount = result.amount !== null;
    const hasDate = result.date !== null;
    const hasMerchant = result.merchant !== null;
    const merchantMatch = result.merchant &&
        (result.merchant.toLowerCase().includes(expectedVendor.toLowerCase().split(' ')[0]) ||
            expectedVendor.toLowerCase().includes(result.merchant.toLowerCase().split(' ')[0]));

    return {
        success: hasAmount && hasDate,
        partial: hasAmount || hasDate,
        filename,
        vendor: expectedVendor,
        extracted: result,
        merchantMatch,
        rawTextLength: text.length
    };
}

async function runTests() {
    console.log('='.repeat(80));
    console.log('GHOST-HELIX OCR FUNCTIONAL TEST (UPDATED)');
    console.log('='.repeat(80));
    console.log(`Test Path: ${QUE_PATH}`);
    console.log(`Started: ${new Date().toISOString()}\n`);

    const results = [];
    const vendors = fs.readdirSync(QUE_PATH, { withFileTypes: true }).filter(d => d.isDirectory());

    for (const vendor of vendors) {
        console.log(`\n${'='.repeat(80)}`);
        console.log(`VENDOR: ${vendor.name}`);
        console.log('='.repeat(80));

        const vendorPath = path.join(QUE_PATH, vendor.name);
        const files = [];

        function findPdfs(dir) {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) findPdfs(full);
                else if (entry.name.toLowerCase().endsWith('.pdf')) files.push(full);
            }
        }
        findPdfs(vendorPath);

        // Test ALL files
        for (const file of files) {
            const result = await testFile(file, vendor.name);
            results.push(result);

            const amt = result.extracted?.amount ? `$${result.extracted.amount.toFixed(2)}` : 'NONE';
            const dt = result.extracted?.date || 'NONE';
            const merch = result.extracted?.merchant || 'NONE';
            const merchStatus = result.merchantMatch ? '✅' : '⚠️';
            const status = result.success ? '✅' : result.partial ? '⚠️' : '❌';

            console.log(`${status} ${result.filename.substring(0, 40).padEnd(40)} | Amt: ${amt.padEnd(12)} | Date: ${dt.padEnd(12)} | Merchant: ${merchStatus} ${merch.substring(0, 20)}`);
        }
    }

    // Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));

    const passed = results.filter(r => r.success).length;
    const partial = results.filter(r => r.partial && !r.success).length;
    const failed = results.filter(r => !r.partial).length;
    const merchantMatches = results.filter(r => r.merchantMatch).length;

    console.log(`\nTotal Tests: ${results.length}`);
    console.log(`✅ Passed (Amount + Date): ${passed} (${((passed / results.length) * 100).toFixed(1)}%)`);
    console.log(`⚠️ Partial (Amount OR Date): ${partial}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`\n🏪 Merchant Recognition: ${merchantMatches}/${results.length} (${((merchantMatches / results.length) * 100).toFixed(1)}%)`);

    // Per-vendor breakdown
    console.log('\nBy Vendor:');
    const byVendor = {};
    for (const r of results) {
        if (!byVendor[r.vendor]) byVendor[r.vendor] = { pass: 0, partial: 0, fail: 0, merchant: 0, total: 0 };
        byVendor[r.vendor].total++;
        if (r.success) byVendor[r.vendor].pass++;
        else if (r.partial) byVendor[r.vendor].partial++;
        else byVendor[r.vendor].fail++;
        if (r.merchantMatch) byVendor[r.vendor].merchant++;
    }
    for (const [vendor, stats] of Object.entries(byVendor)) {
        const merchPct = ((stats.merchant / stats.total) * 100).toFixed(0);
        console.log(`  ${vendor.padEnd(15)}: ✅${stats.pass} ⚠️${stats.partial} ❌${stats.fail} | 🏪 ${merchPct}% merchant match`);
    }

    // Write JSON report
    const reportPath = path.join(__dirname, 'ocr_test_results_v2.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        summary: { passed, partial, failed, total: results.length, merchantMatches },
        results
    }, null, 2));
    console.log(`\n📄 Full report saved to: ${reportPath}`);
}

runTests().catch(console.error);
