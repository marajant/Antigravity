import { useState, useRef, useEffect } from 'react';
import { Loader2, Upload, Trash2, Save } from 'lucide-react';
import { Button } from './ui/Button';
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { parseReceiptImage, type OCRResult } from '../lib/ocr';
import { calculateFileHash } from '../lib/hash';
import { fileToBase64 } from '../lib/file';
import { renderPdfToImage } from '../lib/pdf';
import { smartParseFilename } from '../lib/smartParser';
import { predictCategory } from '../lib/suggestionService';
import { motion, AnimatePresence } from 'framer-motion';

interface BatchItem extends OCRResult {
    id: string;
    file: File;
    processedFile?: File; // Store converted image (PDF->PNG)
    status: 'pending' | 'processing' | 'done' | 'error';
    hash?: string;
    isDbDuplicate?: boolean;
    // isDuplicate?: boolean; // removed from interface, calculated on fly
    categoryId?: number;
    isTaxRelevant: boolean;
}

interface BatchUploaderProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function BatchUploader({ onClose, onSuccess }: BatchUploaderProps) {
    const [queue, setQueue] = useState<BatchItem[]>([]);
    const [isProcessingAll, setIsProcessingAll] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const categories = useLiveQuery(() => db.categories.toArray());

    // Cache known merchants once at component mount to avoid per-item DB queries
    const [knownMerchants, setKnownMerchants] = useState<string[]>([]);
    useEffect(() => {
        async function loadMerchants() {
            const unique = new Set<string>();
            await db.expenses.each(e => unique.add(e.merchant));
            setKnownMerchants(Array.from(unique));
        }
        loadMerchants();
    }, []);

    const handleFiles = async (files: FileList) => {
        const newItems: BatchItem[] = Array.from(files).map(file => ({
            id: Math.random().toString(36).substr(2, 9),
            file,
            status: 'pending',
            rawText: '',
            isTaxRelevant: true
        }));

        setQueue(prev => {
            const updated = [...prev, ...newItems];
            // Auto-trigger processing for the new items
            // We need to do this in a way that doesn't conflict with state updates.
            // Using a timeout to let state settle or just calling a process function on the new items directly?
            // Better: useEffect to process pending, or just fire-and-forget here.
            setTimeout(() => {
                newItems.forEach(item => processItem(item));
            }, 100);
            return updated;
        });
    };

    const processItem = async (item: BatchItem) => {
        if (item.status !== 'pending') return;

        setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing' } : i));

        try {
            const currentItem = item; // Use the item passed to the function

            // Initialize a mutable result object based on current item's initial state
            const result: Partial<BatchItem> = {
                merchant: currentItem.merchant,
                amount: currentItem.amount,
                date: currentItem.date,
                categoryId: currentItem.categoryId,
                isTaxRelevant: currentItem.isTaxRelevant,
                rawText: currentItem.rawText,
                hash: currentItem.hash,
                isDbDuplicate: currentItem.isDbDuplicate,
                status: 'done' // Default to done, will change on error
            };

            // 1. Smart Parse Filename
            const smartData = smartParseFilename(currentItem.file.name);
            // Only strictly prioritize smart data if confidence is high (likely structured filename with Date AND Merchant)
            // If confidence is low (just merchant guessed), we'll let OCR override if it finds something.
            const isHighConfidenceSmart = smartData.confidence >= 0.8;

            if (smartData.confidence > 0) {
                // Always take date if found, it's usually reliable in filenames if regex matched
                if (smartData.date) result.date = smartData.date;

                // Only take merchant immediately if high confidence, otherwise wait for OCR comparison
                if (isHighConfidenceSmart && smartData.merchant) {
                    result.merchant = smartData.merchant;
                }
            }

            // ... (hash check omitted for brevity in replace, assume context matches) ...

            // 2. Calculate Hash and Check for Duplicates
            const hash = await calculateFileHash(currentItem.file);
            const existing = await db.expenses.where('file_hash').equals(hash).first();
            result.hash = hash;
            if (existing) result.isDbDuplicate = true;

            // 3. Handle PDF conversion if necessary
            let imageFile = currentItem.file;
            if (currentItem.file.type === 'application/pdf') {
                const blob = await renderPdfToImage(currentItem.file);
                imageFile = new File([blob], currentItem.file.name.replace('.pdf', '.png'), { type: 'image/png' });
            }

            // 4. Perform OCR on the image file
            const ocr = await parseReceiptImage(imageFile);
            if (ocr.amount) result.amount = ocr.amount;

            // Date logic: OCR date often better than nothing, but Smart Date is best if present
            if (!result.date && ocr.date) result.date = ocr.date;

            // Merchant Priority Logic:
            // 1. High Confidence Smart (already set)
            // 2. If not set, check OCR Merchant
            // 3. If OCR Merchant found, use it
            // 4. Fallback: Low Confidence Smart or Raw Text Search

            if (!isHighConfidenceSmart && ocr.merchant) {
                result.merchant = ocr.merchant;
            } else if (!result.merchant && smartData.merchant) {
                // Fallback to low confidence smart merchant if OCR found nothing
                result.merchant = smartData.merchant;
            }


            // AI Fallback & Override: Scan raw text for known merchants
            // Using cached merchants instead of querying DB per-item
            if (ocr.rawText && knownMerchants.length > 0) {
                const found = knownMerchants.find(k => ocr.rawText!.toLowerCase().includes(k.toLowerCase()));
                if (found) {
                    result.merchant = found;
                }
            }

            // Final Category Prediction if merchant exists
            if (result.merchant && !result.categoryId) {
                const predicted = await predictCategory(result.merchant);
                if (predicted) result.categoryId = predicted;
            }

            result.rawText = ocr.rawText;

            // ---------------------------------------------------------
            // 5. Enhanced Duplicate Detection (Content-Based)
            // ---------------------------------------------------------

            // A. Check against Database (Existing Records)
            if (!result.isDbDuplicate && result.merchant && result.amount && result.date) {
                // Precision check: Amount matches, Merchant matches, Date roughly matches
                // Note: Dates in DB are likely Date objects. We compare YYYY-MM-DD strings.
                const targetDate = result.date;
                const targetAmt = parseFloat(result.amount);

                // Scan expenses with same merchant (indexed)
                const candidates = await db.expenses.where('merchant').equals(result.merchant).toArray();

                const dbMatch = candidates.find(e => {
                    // Compare Amounts (epsilon check for float?)
                    const amtMatch = Math.abs(e.amount - targetAmt) < 0.01;

                    // Compare Dates (YYYY-MM-DD)
                    // e.date is a Date object
                    const dbDateStr = e.date.toISOString().split('T')[0];
                    const isDateMatch = dbDateStr === targetDate;

                    return amtMatch && isDateMatch;
                });

                if (dbMatch) {
                    result.isDbDuplicate = true;
                }
            }

            setQueue(prev => {
                return prev.map(i => i.id === item.id ? {
                    ...i,
                    ...result as OCRResult,
                    hash: result.hash,
                    isDbDuplicate: result.isDbDuplicate,
                    categoryId: result.categoryId,
                    processedFile: result.processedFile,
                    status: 'done'
                } : i);
            });
        } catch (err) {
            console.error("Error processing item:", err);
            setQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error' } : i));
        }
    };

    const processAll = async () => {
        setIsProcessingAll(true);
        const pending = queue.filter(i => i.status === 'pending');
        for (const item of pending) {
            await processItem(item);
        }
        setIsProcessingAll(false);
    };

    const removeItem = (id: string) => {
        setQueue(prev => prev.filter(i => i.id !== id));
    };

    const updateItem = (id: string, updates: Partial<BatchItem>) => {
        setQueue(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    };

    const handleSaveAll = async () => {
        const doneItems = queue.filter(i => i.status === 'done' && i.amount && i.merchant);
        if (doneItems.length === 0) return;

        // Process images first
        const expensesToSave = await Promise.all(doneItems.map(async (item) => {
            let receiptData = undefined;
            // Use processed PNG if available, otherwise original file
            const fileToSave = item.processedFile || item.file;

            if (fileToSave) {
                try {
                    receiptData = await fileToBase64(fileToSave);
                } catch (e) { console.error(e); }
            }

            return {
                amount: parseFloat(item.amount || '0'),
                currency: 'USD',
                merchant: item.merchant || 'Unknown',
                date: item.date ? new Date(item.date) : new Date(),
                categoryId: item.categoryId,
                isTaxRelevant: item.isTaxRelevant ? 1 : 0,
                file_hash: item.hash,
                receiptImage: receiptData,
                createdAt: new Date()
            };
        }));

        await db.expenses.bulkAdd(expensesToSave);
        onSuccess();
        onClose();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxHeight: '60vh' }}>
            <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: 'var(--surface-transparent)'
                }}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    hidden
                    multiple
                    accept="image/*,application/pdf"
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
                <Upload style={{ marginBottom: '0.5rem' }} />
                <p>Drop multiple receipts here to batch process</p>
            </div>

            {queue.length > 0 && (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingRight: '0.5rem' }}>
                    <AnimatePresence>
                        {queue.map((item) => {
                            // Dynamic Batch Duplicate Calculation
                            const isBatchDuplicate = queue.some(other =>
                                other.id !== item.id &&
                                other.status === 'done' &&
                                other.merchant && other.merchant === item.merchant &&
                                other.amount && other.amount === item.amount &&
                                other.date && other.date === item.date
                            );

                            const showDuplicateWarning = item.isDbDuplicate || isBatchDuplicate;

                            return (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    style={{
                                        padding: '1rem',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'var(--surface-color)',
                                        border: '1px solid var(--border-color)',
                                        display: 'grid',
                                        gridTemplateColumns: 'minmax(150px, 2fr) minmax(130px, 1.2fr) minmax(100px, 1fr) minmax(120px, 1.5fr) 60px 40px',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        position: 'relative'
                                    }}
                                >
                                    {item.status === 'processing' && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 'var(--radius-md)' }}>
                                            <Loader2 className="spin" size={24} />
                                        </div>
                                    )}

                                    <div style={{ overflow: 'hidden' }}>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.file.name}
                                        </p>
                                        <input
                                            value={item.merchant || ''}
                                            onChange={e => updateItem(item.id, { merchant: e.target.value })}
                                            placeholder="Merchant"
                                            style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)', width: '100%' }}
                                        />
                                    </div>

                                    <div>
                                        <input
                                            type="date"
                                            value={item.date || ''}
                                            onChange={e => updateItem(item.id, { date: e.target.value })}
                                            style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)', width: '100%', fontFamily: 'inherit' }}
                                        />
                                    </div>

                                    <div>
                                        <input
                                            type="number"
                                            value={item.amount || ''}
                                            onChange={e => updateItem(item.id, { amount: e.target.value })}
                                            placeholder="Amount"
                                            style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)', width: '100%' }}
                                        />
                                    </div>

                                    <div>
                                        <select
                                            value={item.categoryId || ''}
                                            onChange={e => updateItem(item.id, { categoryId: Number(e.target.value) })}
                                            style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '0.85rem', width: '100%' }}
                                        >
                                            <option value="">Category</option>
                                            {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={item.isTaxRelevant}
                                            onChange={e => updateItem(item.id, { isTaxRelevant: e.target.checked })}
                                        />
                                        <span style={{ fontSize: '0.7rem' }}>Tax</span>
                                    </div>

                                    <button onClick={() => removeItem(item.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger-hue)', cursor: 'pointer' }}>
                                        <Trash2 size={18} />
                                    </button>

                                    {showDuplicateWarning && (
                                        <div style={{ gridColumn: '1 / -1', fontSize: '0.7rem', color: 'hsl(var(--warning-hue), 80%, 50%)' }}>
                                            ⚠️ Duplicate detected (in DB or current batch).
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Button
                        disabled={queue.filter(i => i.status === 'pending').length === 0}
                        onClick={processAll}
                        isLoading={isProcessingAll}
                    >
                        Process All
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSaveAll}
                        disabled={queue.filter(i => i.status === 'done').length === 0}
                    >
                        <Save size={18} style={{ marginRight: '0.5rem' }} />
                        Save Batch
                    </Button>
                </div>
            </div>
        </div>
    );
}
