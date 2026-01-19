import { createWorker, type Worker } from 'tesseract.js';
import { extractPdfText } from './pdf';

export interface OCRResult {
    amount?: string;
    date?: string;
    merchant?: string;
    address?: string;
    accountNumber?: string;
    rawText: string;
}

// ============================================
// WORKER POOL IMPLEMENTATION
// ============================================
const MAX_WORKERS = 2;
const workerPool: Worker[] = [];
const queue: ((worker: Worker) => void)[] = [];
let activeWorkers = 0;

async function getWorker(): Promise<Worker> {
    if (workerPool.length > 0) {
        return workerPool.pop()!;
    }

    if (activeWorkers < MAX_WORKERS) {
        activeWorkers++;
        const worker = await createWorker('eng');
        return worker;
    }

    return new Promise((resolve) => {
        queue.push(resolve);
    });
}

function releaseWorker(worker: Worker) {
    if (queue.length > 0) {
        const nextTask = queue.shift()!;
        nextTask(worker);
    } else {
        workerPool.push(worker);
    }
}

// ============================================
// KNOWN VENDOR PATTERNS
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
    { pattern: /micro\s*center/i, name: 'Micro Center' },
    { pattern: /at&?t/i, name: 'AT&T' },
    { pattern: /verizon/i, name: 'Verizon' },
    { pattern: /sprint|t-?mobile/i, name: 'T-Mobile' },
];

function isCreditCardStatement(text: string): boolean {
    const indicators = [
        'statement closing date', 'payment due date', 'minimum payment',
        'credit limit', 'available credit', 'billing cycle',
        'previous balance', 'new balance', 'summary of account', 'annual summary'
    ];
    const lower = text.toLowerCase();
    const matchCount = indicators.filter(i => lower.includes(i)).length;
    return matchCount >= 3;
}

const AMOUNT_SKIP_PATTERNS = [
    /page\s*\d+\s*of\s*\d+/i,
    /number\s*of\s*pages/i,
    /payment\s*received/i,
    /thank\s*you\s*for\s*your\s*payment/i,
    /credits?\s*[-−]/i,
    /payments?\s*and\s*credits/i,
];

// ============================================
// MAIN PARSE FUNCTION
// ============================================
export async function parseReceiptImage(file: File): Promise<OCRResult> {
    let text = '';
    if (file.type === 'application/pdf') {
        try {
            text = await extractPdfText(file);
        } catch (e) {
            console.error("PDF Text extraction failed, falling back to OCR", e);
        }
    }

    if (!text) {
        // Image OCR fallback (or if file is image)
        const worker = await getWorker();
        try {
            const ret = await worker.recognize(file);
            text = ret.data.text;
        } catch (error) {
            console.error('OCR recognition failed:', error);
            throw error;
        } finally {
            releaseWorker(worker);
        }
    }

    const result: OCRResult = { rawText: text };
    const lines = text.split('\n');

    // Helper: Extract money
    const extractMoney = (str: string): number | null => {
        if (AMOUNT_SKIP_PATTERNS.some(p => p.test(str))) return null;

        const matches = [...str.matchAll(/[$£€]?\s?(\d{1,3}(,\d{3})*(\.\d{2})|\d+\.\d{2})/g)];
        if (!matches || matches.length === 0) return null;

        const nums = matches
            .map(m => parseFloat(m[0].replace(/[$£€,\s]/g, '')))
            .filter(n => !isNaN(n))
            .filter(n => n > 1.00)
            .filter(n => n < 100000);

        return nums.length > 0 ? Math.max(...nums) : null;
    };

    // 1. Smart Amount Extraction
    const isStatement = isCreditCardStatement(text);
    const amountKeywords = isStatement
        ? ['new balance', 'statement balance', 'total balance', 'minimum payment due', 'total amount due', 'amount due', 'balance due']
        : ['total amount due', 'amount due', 'total due', 'balance due', 'account balance', 'total', 'amount'];

    let foundAmount: number | null = null;

    for (const keyword of amountKeywords) {
        const line = lines.find(l => l.toLowerCase().includes(keyword));
        if (line) {
            const val = extractMoney(line);
            if (val !== null) {
                foundAmount = val;
                break;
            } else {
                const idx = lines.indexOf(line);
                // Check previous lines (up to 3)
                for (let i = 1; i <= 3; i++) {
                    if (idx - i >= 0) {
                        const prevVal = extractMoney(lines[idx - i]);
                        if (prevVal !== null) { foundAmount = prevVal; break; }
                    }
                }
                if (foundAmount !== null) break;

                // Check next line
                if (idx + 1 < lines.length) {
                    const nextVal = extractMoney(lines[idx + 1]);
                    if (nextVal !== null) { foundAmount = nextVal; break; }
                }
            }
        }
    }

    if (foundAmount === null) {
        const globalMatches = [...text.matchAll(/[$£€]?\s?(\d{1,3}(,\d{3})*(\.\d{2})|\d+\.\d{2})/g)];
        const globalNums = globalMatches.map(m => parseFloat(m[0].replace(/[$£€,\s]/g, ''))).filter(n => !isNaN(n) && n < 100000);
        if (globalNums.length > 0) {
            foundAmount = Math.max(...globalNums);
        }
    }

    if (foundAmount !== null) {
        result.amount = foundAmount.toString();
    }

    // 2. Smart Date Extraction
    const months = "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December";
    const datePattern = `(\\d{4}\\s*[\\/\\-\\.]\\s*\\d{1,2}\\s*[\\/\\-\\.]\\s*\\d{1,2})|` +
        `(\\d{1,2}\\s*[\\/\\-\\.]\\s*\\d{1,2}\\s*[\\/\\-\\.]\\s*\\d{2,4})|` +
        `\\b((${months})\\s+\\d{1,2}(?:st|nd|rd|th)?[,\\s]*\\d{4})\\b|` +
        `\\b(\\d{1,2}(?:st|nd|rd|th)?\\s+(${months})[,\\s]*\\d{4})\\b`;
    const dateRegex = new RegExp(datePattern, 'i');

    const extractDate = (str: string): string | null => {
        let m = str.match(dateRegex);
        if (!m) {
            const squashed = str.replace(/\s+/g, '');
            const squashedRegex = /(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})|(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/;
            m = squashed.match(squashedRegex);
            if (!m) {
                const digitOnly = squashed.replace(/[^0-9]/g, '');
                const salvageRegexGlobal = /(\d{2})[01]?(\d{2})[01]?(20[2-9]\d)/g;
                const matches = [...digitOnly.matchAll(salvageRegexGlobal)];
                for (const match of matches) {
                    const mo = parseInt(match[1], 10);
                    const da = parseInt(match[2], 10);
                    if (mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
                        m = [`${match[1]}/${match[2]}/${match[3]}`];
                        break;
                    }
                }
            }
        }
        if (!m) return null;
        try {
            let dateStr = m[0];
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) dateStr = dateStr.replace(/-/g, '/');
            const d = new Date(dateStr);
            return !isNaN(d.getTime()) ? d.toLocaleDateString('en-CA') : null;
        } catch { return null; }
    };

    const dateKeywords = ['due date', 'bill date', 'statement date', 'date', 'service period', 'due after', 'amount due after', 'amount due afer'];
    let foundDate: string | null = null;
    const findLine = (k: string) => {
        const kSquashed = k.replace(/\s+/g, '');
        return lines.find(l => {
            if (l.toLowerCase().includes(k)) return true;
            return l.replace(/\s+/g, '').toLowerCase().includes(kSquashed);
        });
    };

    for (const keyword of dateKeywords) {
        const line = findLine(keyword);
        if (line) {
            const d = extractDate(line);
            if (d) { foundDate = d; break; }
            const idx = lines.indexOf(line);
            for (let i = 1; i <= 3; i++) {
                if (idx - i >= 0) {
                    const prevD = extractDate(lines[idx - i]);
                    if (prevD) { foundDate = prevD; break; }
                }
            }
            if (foundDate) break;
            if (idx + 1 < lines.length) {
                const nextD = extractDate(lines[idx + 1]);
                if (nextD) { foundDate = nextD; break; }
            }
        }
    }

    // Heuristic date validation (Due Date vs Bill Date)
    if (foundDate) {
        const findDateForKeyword = (keywords: string[]) => {
            for (const k of keywords) {
                const line = findLine(k);
                if (line) {
                    const d = extractDate(line);
                    if (d) return d;
                    const idx = lines.indexOf(line);
                    for (let i = 1; i <= 2; i++) {
                        if (idx - i >= 0) {
                            const prevD = extractDate(lines[idx - i]);
                            if (prevD) return prevD;
                        }
                    }
                    if (idx + 1 < lines.length) {
                        const nextD = extractDate(lines[idx + 1]);
                        if (nextD) return nextD;
                    }
                }
            }
            return null;
        };
        const billDateStr = findDateForKeyword(['bill date', 'statement date', 'date of bill', 'invoice date']);
        if (billDateStr) {
            const parseLocal = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
            const dueDate = parseLocal(foundDate);
            const billDate = parseLocal(billDateStr);
            if (dueDate < billDate) {
                const shifted = new Date(dueDate); shifted.setMonth(shifted.getMonth() + 1);
                const diffTime = shifted.getTime() - billDate.getTime();
                const diffDays = diffTime / (1000 * 3600 * 24);
                if (shifted > billDate && diffDays <= 45) {
                    foundDate = shifted.toLocaleDateString('en-CA');
                } else {
                    foundDate = billDateStr;
                }
            }
        }
    }
    if (!foundDate) foundDate = extractDate(text);
    if (foundDate) result.date = foundDate;

    // 3. Smart Merchant Detection
    const headerText = text.substring(0, 3000);
    let foundMerchant: string | null = null;
    for (const { pattern, name } of KNOWN_VENDORS) {
        if (pattern.test(headerText)) { foundMerchant = name; break; }
    }
    if (!foundMerchant) {
        const companyIndicators = ['LLC', 'Inc.', 'Inc', 'Corp.', 'Corp', 'Company', 'Co.', 'Services', 'Service'];
        for (const line of lines.slice(0, 15)) {
            const trimmed = line.trim();
            for (const indicator of companyIndicators) {
                if (trimmed.includes(indicator) && trimmed.length < 60) {
                    foundMerchant = trimmed.substring(0, 50); break;
                }
            }
            if (foundMerchant) break;
        }
    }
    if (!foundMerchant) {
        const nonEmptyLines = lines.filter(l => {
            const t = l.trim();
            if (t.length < 3) return false;
            if (/^\d+$/.test(t)) return false;
            if (/^page\s*\d/i.test(t)) return false;
            if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(t)) return false;
            if (/^invoice/i.test(t)) return false;
            return true;
        });
        if (nonEmptyLines.length > 0) foundMerchant = nonEmptyLines[0].trim().substring(0, 50);
    }
    if (foundMerchant) result.merchant = foundMerchant;

    // 4. Account Number
    const accountRegex = /(?:Account|Acct)\s*(?:Number|#|No\.?)\s*[:#]?\s*([0-9\s-]+)/i;
    for (const line of lines) {
        const m = line.match(accountRegex);
        if (m) {
            const acc = m[1].replace(/\s+/g, ' ').trim();
            if (/\d/.test(acc) && acc.length > 3) { result.accountNumber = acc; break; }
        }
    }

    // 5. Address
    const addressRegex = /([A-Za-z\s\.]+),?\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/;
    const candidates: { address: string, hasPoBox: boolean }[] = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = addressRegex.exec(line);
        if (match) {
            const cityStateZip = match[0].trim();
            let fullAddress = cityStateZip;
            let hasPoBox = false; // check for PO Box in prev lines
            for (let j = 1; j <= 3; j++) {
                if (i - j >= 0) {
                    const prevLine = lines[i - j].trim();
                    if (/p\.?o\.?\s*box/i.test(prevLine)) hasPoBox = true;
                    if (prevLine && /^\d+\s+[A-Za-z]/.test(prevLine) && !fullAddress.includes('\n')) {
                        fullAddress = `${prevLine}\n${cityStateZip}`; break;
                    }
                }
            }
            if (/p\.?o\.?\s*box/i.test(match[0])) hasPoBox = true;
            candidates.push({ address: fullAddress, hasPoBox });
        }
    }
    const nonPoBox = candidates.filter(c => !c.hasPoBox);
    if (nonPoBox.length > 0) result.address = nonPoBox[0].address;
    else if (candidates.length > 0) result.address = candidates[0].address;

    return result;
}
