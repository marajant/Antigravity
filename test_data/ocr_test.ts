/**
 * OCR Functional Test Script for Ghost-Helix
 * Tests OCR extraction capabilities on files from C:\Users\mmolway\Downloads\Que
 * 
 * Run with: npx tsx test_data/ocr_test.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// We need to use the browser-based OCR, so this script will generate a test report
// that can be verified through the browser interface

interface TestFile {
    vendor: string;
    filename: string;
    fullPath: string;
    size: number;
}

interface TestResult {
    vendor: string;
    filename: string;
    expectedMerchant: string;
    expectedDatePattern?: string;
    expectedAmountPattern?: string;
}

const QUE_PATH = 'C:\\Users\\mmolway\\Downloads\\Que';

const vendorConfigs: Record<string, { expectedMerchant: string; datePattern?: string }> = {
    'Dot Loop': { expectedMerchant: 'Dot Loop', datePattern: '\\d{2}\\d{2}2025|\\d{2}\\d{2}2026' },
    'Home Depot': { expectedMerchant: 'Home Depot' },
    'Kansas gas': { expectedMerchant: 'Kansas Gas', datePattern: 'DOC_\\d+' },
    'Navy fed': { expectedMerchant: 'Navy Federal', datePattern: '\\d{4}-\\d{2}-\\d{2}' },
    'Vyde': { expectedMerchant: 'Vyde', datePattern: 'INV-\\d+' },
    'WM': { expectedMerchant: 'WM|Waste Management', datePattern: 'WMI5000' },
    'Water one': { expectedMerchant: 'Water One|WaterOne' },
};

function collectTestFiles(): TestFile[] {
    const files: TestFile[] = [];

    function scanDir(dirPath: string, vendor: string) {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                scanDir(fullPath, vendor);
            } else if (entry.name.toLowerCase().endsWith('.pdf')) {
                const stats = fs.statSync(fullPath);
                files.push({
                    vendor,
                    filename: entry.name,
                    fullPath,
                    size: stats.size
                });
            }
        }
    }

    const vendors = fs.readdirSync(QUE_PATH, { withFileTypes: true });
    for (const vendor of vendors) {
        if (vendor.isDirectory()) {
            scanDir(path.join(QUE_PATH, vendor.name), vendor.name);
        }
    }

    return files;
}

function generateTestReport() {
    const files = collectTestFiles();

    console.log('='.repeat(80));
    console.log('OCR FUNCTIONAL TEST REPORT - Ghost-Helix');
    console.log('='.repeat(80));
    console.log(`\nTotal Files Found: ${files.length}`);
    console.log(`Test Path: ${QUE_PATH}\n`);

    // Group by vendor
    const byVendor = new Map<string, TestFile[]>();
    for (const file of files) {
        if (!byVendor.has(file.vendor)) {
            byVendor.set(file.vendor, []);
        }
        byVendor.get(file.vendor)!.push(file);
    }

    console.log('FILES BY VENDOR:');
    console.log('-'.repeat(80));

    for (const [vendor, vendorFiles] of byVendor) {
        const totalSize = vendorFiles.reduce((sum, f) => sum + f.size, 0);
        console.log(`\n📁 ${vendor}: ${vendorFiles.length} files (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);

        // Show sample filenames
        const samples = vendorFiles.slice(0, 3);
        for (const sample of samples) {
            console.log(`   - ${sample.filename} (${(sample.size / 1024).toFixed(1)} KB)`);
        }
        if (vendorFiles.length > 3) {
            console.log(`   - ... and ${vendorFiles.length - 3} more files`);
        }
    }

    // Generate test cases for browser testing
    console.log('\n' + '='.repeat(80));
    console.log('RECOMMENDED TEST CASES FOR MANUAL BROWSER TESTING:');
    console.log('='.repeat(80));

    const testCases: { vendor: string; file: string; path: string }[] = [];

    for (const [vendor, vendorFiles] of byVendor) {
        // Pick 2 samples from each vendor
        const samples = vendorFiles.slice(0, 2);
        for (const sample of samples) {
            testCases.push({
                vendor,
                file: sample.filename,
                path: sample.fullPath
            });
        }
    }

    console.log('\nUpload these files through the "Add Expense" modal:\n');

    for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const config = vendorConfigs[tc.vendor];
        console.log(`${i + 1}. [${tc.vendor}] ${tc.file}`);
        console.log(`   Path: ${tc.path}`);
        console.log(`   Expected Merchant: ${config?.expectedMerchant || 'Unknown'}`);
        console.log('');
    }

    // Write test manifest for browser automation
    const manifest = {
        generatedAt: new Date().toISOString(),
        totalFiles: files.length,
        vendors: Array.from(byVendor.entries()).map(([vendor, files]) => ({
            name: vendor,
            fileCount: files.length,
            expectedMerchant: vendorConfigs[vendor]?.expectedMerchant || 'Unknown',
            sampleFiles: files.slice(0, 3).map(f => f.fullPath)
        })),
        testCases
    };

    const manifestPath = path.join(__dirname, 'ocr_test_manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`\n✅ Test manifest written to: ${manifestPath}`);

    return manifest;
}

// Run
generateTestReport();
