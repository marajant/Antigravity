import { useState, useRef } from 'react';
import { Loader2, Check, Upload, AlertCircle, Plus, X, FileText } from 'lucide-react';
import { Button } from './ui/Button';
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { parseReceiptImage } from '../lib/ocr';
import { calculateFileHash } from '../lib/hash';
import { renderPdfToImage } from '../lib/pdf';
import { smartParseFilename } from '../lib/smartParser';
import { fileToBase64 } from '../lib/file';
import { findMerchantInText, predictCategory } from '../lib/suggestionService';
import type { Expense } from '../lib/db';
import Papa from 'papaparse';

interface AddExpenseFormProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Expense | null;
}

type BulkItemStatus = 'pending' | 'processing' | 'ready' | 'saved' | 'error' | 'duplicate';

interface BulkItem {
    id: string;
    file: File;
    status: BulkItemStatus;
    merchant: string;
    amount: string;
    date: string;
    categoryId: number | '';
    isDuplicate: boolean;
    receiptPreview?: string;
}

// CSV Row interface for type-safe CSV parsing
interface CSVRow {
    Date?: string;
    Merchant?: string;
    Amount?: string;
    Category?: string;
    Description?: string;
    [key: string]: string | undefined;
}

export function AddExpenseForm({ onClose, onSuccess, initialData }: AddExpenseFormProps) {
    // Single Mode State
    const [file, setFile] = useState<File | null>(null);
    const [processedFile, setProcessedFile] = useState<File | null>(null);
    const [ocrStatus, setOcrStatus] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form State (Single)
    const [amount, setAmount] = useState(initialData?.amount.toString() || '');
    const [merchant, setMerchant] = useState(initialData?.merchant || '');
    const [date, setDate] = useState(initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [categoryId, setCategoryId] = useState<number | ''>(initialData?.categoryId || '');
    const [isTaxRelevant, setIsTaxRelevant] = useState(initialData?.isTaxRelevant === 1);
    const [fileHash, setFileHash] = useState<string>(initialData?.file_hash || '');
    const [notes, setNotes] = useState(initialData?.description || '');
    const [currency, setCurrency] = useState(initialData?.currency || 'USD');

    // Bulk Mode State
    const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
    const [csvPreview, setCsvPreview] = useState<CSVRow[]>([]);

    const categories = useLiveQuery(() => db.categories.toArray());
    const exchangeRates = useLiveQuery(() => db.exchangeRates.toArray()) || [];
    const knownMerchants = useLiveQuery(async () => {
        const unique = new Set<string>();
        await db.expenses.each(e => unique.add(e.merchant));
        return Array.from(unique);
    }) || [];

    const isBulkMode = bulkItems.length > 0 || csvPreview.length > 0;

    // --- Shared Analysis Logic ---
    const analyzeFile = async (file: File) => {
        let imageFile = file;
        let resultData = {
            merchant: '',
            amount: '',
            date: new Date().toISOString().split('T')[0],
            categoryId: '' as number | '',
            notes: '',
            hash: '',
            isDuplicate: false,
            processedFile: file
        };

        // 1. Smart Parse Filename
        const smartData = smartParseFilename(file.name);
        const isHighConfidenceSmart = smartData.confidence >= 0.8;

        if (smartData.confidence > 0) {
            if (smartData.date) resultData.date = smartData.date;
            if (isHighConfidenceSmart && smartData.merchant) {
                resultData.merchant = smartData.merchant;
                const predictedCat = await predictCategory(smartData.merchant);
                if (predictedCat) resultData.categoryId = predictedCat;
            }
        }

        // 2. Hash Check
        const hash = await calculateFileHash(file);
        resultData.hash = hash;
        const existing = await db.expenses.where('file_hash').equals(hash).first();
        if (existing && (!initialData || existing.id !== initialData.id)) {
            resultData.isDuplicate = true;
        }

        // 3. Render PDF
        if (file.type === 'application/pdf') {
            const blob = await renderPdfToImage(file);
            imageFile = new File([blob], file.name.replace('.pdf', '.png'), { type: 'image/png' });
            resultData.processedFile = imageFile;
        }

        // 4. OCR
        const ocrResult = await parseReceiptImage(imageFile);

        if (ocrResult.amount) resultData.amount = ocrResult.amount;
        if (ocrResult.date && !smartData.date) resultData.date = ocrResult.date;

        // 5. Merchant Logic
        let finalMerchant = resultData.merchant || ocrResult.merchant || smartData.merchant;
        if (!finalMerchant && ocrResult.rawText && knownMerchants && knownMerchants.length > 0) {
            const found = findMerchantInText(ocrResult.rawText, knownMerchants);
            if (found) finalMerchant = found;
        }

        if (finalMerchant) {
            resultData.merchant = finalMerchant;
            if (!resultData.categoryId) {
                const predictedCat = await predictCategory(finalMerchant);
                if (predictedCat) resultData.categoryId = predictedCat;
            }
        }

        return resultData;
    };

    // --- Single Entry Handlers ---
    const processImageSingle = async (file: File) => {
        setIsProcessing(true);
        setOcrStatus('Processing...');
        setFile(file);

        // Clear bulk if any
        setBulkItems([]);
        setCsvPreview([]);

        try {
            const data = await analyzeFile(file);

            if (data.isDuplicate) {
                if (!window.confirm("Duplicate file detected! Continue?")) {
                    resetForm();
                    return;
                }
            }

            setAmount(data.amount);
            setMerchant(data.merchant);
            setDate(data.date);
            setCategoryId(data.categoryId);
            setFileHash(data.hash);
            setProcessedFile(data.processedFile);

        } catch (err) {
            console.error(err);
            setOcrStatus('Error');
        } finally {
            setIsProcessing(false);
            setOcrStatus('');
        }
    };

    const resetForm = () => {
        setFile(null); setMerchant(''); setAmount(''); setCategoryId('');
        setNotes(''); setFileHash(''); setCsvPreview([]); setBulkItems([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsProcessing(false);
    };

    const handleSubmitSingle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !merchant) return;

        let receiptData = initialData?.receiptImage;
        const fileToSave = processedFile || file;
        if (fileToSave) {
            try { receiptData = await fileToBase64(fileToSave); } catch (err) { console.error(err); }
        }

        const expenseData = {
            amount: parseFloat(amount),
            currency,
            merchant,
            date: new Date(date),
            categoryId: categoryId === '' ? undefined : Number(categoryId),
            isTaxRelevant: isTaxRelevant ? 1 : 0,
            file_hash: fileHash,
            receiptImage: receiptData,
            createdAt: initialData?.createdAt || new Date(),
            description: notes,
        };

        try {
            if (initialData && initialData.id) {
                await db.expenses.update(initialData.id, expenseData);
            } else {
                await db.expenses.add(expenseData);
            }
            onSuccess();
            onClose();
        } catch (error) {
            alert('Failed to save expense.');
        }
    };

    // --- Bulk Analysis Handlers ---
    const handleMixedFiles = (files: File[]) => {
        if (files.length === 0) return;

        const csv = files.find(f => f.type === 'text/csv' || f.name.endsWith('.csv'));

        // Single Image/PDF -> Single Mode
        if (files.length === 1 && !csv) {
            processImageSingle(files[0]);
            return;
        }

        // Bulk / CSV Mode
        setFile(null);
        if (csv) {
            setOcrStatus('Parsing CSV...');
            Papa.parse(csv, {
                header: true, skipEmptyLines: true,
                complete: (results: any) => { setCsvPreview(results.data); setOcrStatus(''); },
                error: (err: any) => { console.error(err); alert('CSV Error'); }
            });
            return;
        }

        // Add to list and start processing
        const newItems: BulkItem[] = files.map(f => ({
            id: crypto.randomUUID(),
            file: f,
            status: 'pending' as BulkItemStatus,
            merchant: '', amount: '', date: new Date().toISOString().split('T')[0], categoryId: '' as number | '',
            isDuplicate: false
        }));

        setBulkItems(prev => [...prev, ...newItems]);

        // Process files sequentially to avoid race conditions
        const processFilesSequentially = async () => {
            for (const item of newItems) {
                updateBulkItem(item.id, { status: 'processing' });
                try {
                    const data = await analyzeFile(item.file);
                    updateBulkItem(item.id, {
                        status: data.isDuplicate ? 'duplicate' : 'ready',
                        merchant: data.merchant,
                        amount: data.amount,
                        date: data.date,
                        categoryId: data.categoryId,
                        isDuplicate: data.isDuplicate
                    });
                } catch (err) {
                    console.error('File processing error:', err);
                    updateBulkItem(item.id, { status: 'error' });
                }
            }
        };
        processFilesSequentially();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files) handleMixedFiles(Array.from(e.dataTransfer.files));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) handleMixedFiles(Array.from(e.target.files));
    };


    const updateBulkItem = (id: string, updates: Partial<BulkItem>) => {
        setBulkItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const saveBulkItem = async (item: BulkItem) => {
        if (!item.merchant) return;

        updateBulkItem(item.id, { status: 'processing' });
        try {
            let receiptBase64;
            try { receiptBase64 = await fileToBase64(item.file); } catch { }

            await db.expenses.add({
                amount: parseFloat(item.amount) || 0,
                currency: 'USD',
                merchant: item.merchant,
                date: new Date(item.date),
                categoryId: item.categoryId === '' ? undefined : Number(item.categoryId),
                isTaxRelevant: 0,
                receiptImage: receiptBase64,
                createdAt: new Date(),
                description: 'Bulk Import'
            });
            // Remove from list
            setBulkItems(prev => prev.filter(i => i.id !== item.id));
        } catch (err) {
            console.error(err);
            updateBulkItem(item.id, { status: 'error' });
        }
    };

    const inputStyle = {
        width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)',
        border: '1px solid rgba(255, 255, 255, 0.1)', background: 'var(--bg-color)',
        color: 'var(--text-primary)', fontSize: '1rem', outline: 'none',
        fontFamily: 'inherit', transition: 'border-color 0.2s'
    };

    return (
        <div style={{ width: '100%' }}>

            <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                    border: '2px dashed ' + (isProcessing ? 'var(--primary)' : 'var(--border-color)'),
                    background: isProcessing ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
                    borderRadius: 'var(--radius-lg)', padding: '1.5rem', textAlign: 'center', cursor: 'pointer', marginBottom: '1.5rem', transition: 'all 0.2s'
                }}
            >
                <input type="file" ref={fileInputRef} hidden multiple accept=".csv,image/*,.pdf" onChange={handleFileChange} />
                {isProcessing ? (
                    <div className="flex-center" style={{ flexDirection: 'column', gap: '0.75rem' }}>
                        <Loader2 className="spin" color="var(--primary)" size={32} />
                        <p style={{ fontSize: '0.9rem' }}>{ocrStatus}</p>
                    </div>
                ) : (
                    !isBulkMode ? normalizedFileDisplay(file) :
                        <div style={{ color: 'var(--text-secondary)' }}><Upload size={24} style={{ marginBottom: '0.5rem' }} /><p>Drag more files to add</p></div>
                )}
            </div>

            {!isBulkMode ? (
                <form onSubmit={handleSubmitSingle}>
                    <div className="form-grid" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Merchant</label>
                            <input list="merch-list" value={merchant} onChange={e => setMerchant(e.target.value)} required style={inputStyle} placeholder="e.g. Starbucks" />
                            <datalist id="merch-list">{knownMerchants?.map(m => <option key={m} value={m} />)}</datalist>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Amount</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required style={{ ...inputStyle, fontFamily: 'monospace' }} placeholder="0.00" />
                                <select value={currency} onChange={e => setCurrency(e.target.value)} style={{ ...inputStyle, width: '80px', padding: '0 0.5rem' }}>
                                    {(exchangeRates.length ? exchangeRates.map(r => r.id) : ['USD']).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={inputStyle} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <label style={{ fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Category</label>
                            <select value={categoryId} onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : '')} style={inputStyle}>
                                <option value="">Uncategorized</option>
                                {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Notes</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={isTaxRelevant} onChange={e => setIsTaxRelevant(e.target.checked)} style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary)' }} />
                            <span style={{ fontSize: '0.9rem' }}>Tax Deductible</span>
                        </label>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                        <Button type="button" variant="ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</Button>
                        <Button type="submit" isLoading={isProcessing} style={{ flex: 2, background: 'var(--primary)', color: 'white' }}>{initialData ? 'Update' : 'Add Expense'}</Button>
                    </div>
                </form>
            ) : (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>

                    <div style={{ marginBottom: '1.5rem' }}>
                        {/* Header for Bulk */}
                        <div className="flex-between" style={{ marginBottom: '1rem' }}>
                            <h3 className="font-bold">Review {bulkItems.length} Items</h3>
                            <button onClick={() => { setBulkItems([]); setCsvPreview([]); }} style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Cancel Bulk Input</button>
                        </div>

                        {bulkItems.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '55vh', overflowY: 'auto', paddingRight: '4px' }}>
                                {bulkItems.map(item => (
                                    <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'var(--bg-color)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.05)', opacity: item.status === 'saved' ? 0.6 : 1 }}>
                                        <div className="flex-between">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, maxWidth: '70%', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                                {item.status === 'processing' ? <Loader2 size={16} className="spin" /> : item.status === 'saved' ? <Check size={16} color="var(--success)" /> : <FileText size={16} />}
                                                {item.file.name}
                                            </div>
                                            {item.status !== 'saved' && (
                                                <button onClick={() => setBulkItems(prev => prev.filter(i => i.id !== item.id))} style={{ color: 'var(--text-secondary)' }}><X size={16} /></button>
                                            )}
                                        </div>

                                        {item.status === 'duplicate' && <div style={{ fontSize: '0.8rem', color: 'var(--warning)', display: 'flex', gap: '0.25rem', alignItems: 'center' }}><AlertCircle size={12} /> Duplicate File Detected</div>}

                                        {item.status !== 'pending' && item.status !== 'processing' && item.status !== 'saved' && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.5rem' }}>
                                                <input value={item.merchant} onChange={e => updateBulkItem(item.id, { merchant: e.target.value })} placeholder="Merchant" style={inputStyle} />
                                                <input type="number" value={item.amount} onChange={e => updateBulkItem(item.id, { amount: e.target.value })} placeholder="0.00" style={inputStyle} />
                                                <input type="date" value={item.date} onChange={e => updateBulkItem(item.id, { date: e.target.value })} style={inputStyle} />
                                                <select value={item.categoryId} onChange={e => updateBulkItem(item.id, { categoryId: Number(e.target.value) })} style={inputStyle}>
                                                    <option value="">Category...</option>
                                                    {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>
                                        )}

                                        {item.status !== 'saved' && item.status !== 'processing' && item.status !== 'pending' && (
                                            <Button
                                                onClick={() => saveBulkItem(item)}
                                                style={{ width: '100%', marginTop: '0.25rem', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                            >
                                                <Plus size={16} /> Add Expense
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {csvPreview.length > 0 && (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                <p>{csvPreview.length} rows parsed from CSV.</p>
                                <Button onClick={() => alert("CSV Import Logic to be restored if needed")}>Import All CSV</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    function normalizedFileDisplay(file: File | null) {
        if (!file) return <div style={{ color: 'var(--text-secondary)' }}><Upload size={24} style={{ marginBottom: '0.5rem' }} /><p>Tap to scan, or drag receipts / CSV here</p></div>;
        return <div className="flex-center" style={{ flexDirection: 'column' }}><Check size={24} color="var(--success)" /><p>{file.name}</p><button type="button" onClick={(e) => { e.stopPropagation(); resetForm(); }} style={{ color: 'var(--error)', fontSize: '0.8rem' }}>Remove</button></div>;
    }
}
