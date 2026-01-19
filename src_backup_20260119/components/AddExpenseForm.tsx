import { useState, useRef } from 'react';
import { Loader2, Check, Upload, Calendar, Trash2 } from 'lucide-react';
import { Button } from './ui/Button';
// Removed: import { Input } from './ui/Input'; -> We use raw inputs for custom layout
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { parseReceiptImage } from '../lib/ocr';
import { calculateFileHash } from '../lib/hash';
import { renderPdfToImage } from '../lib/pdf';
import { smartParseFilename } from '../lib/smartParser';
import { fileToBase64 } from '../lib/file';
import { findMerchantInText, predictCategory } from '../lib/suggestionService';
import type { Expense } from '../lib/db';

interface AddExpenseFormProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Expense | null;
}

export function AddExpenseForm({ onClose, onSuccess, initialData }: AddExpenseFormProps) {
    const [file, setFile] = useState<File | null>(null);
    const [processedFile, setProcessedFile] = useState<File | null>(null);
    const [ocrStatus, setOcrStatus] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [rawText, setRawText] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form State
    const [amount, setAmount] = useState(initialData?.amount.toString() || '');
    const [merchant, setMerchant] = useState(initialData?.merchant || '');
    const [date, setDate] = useState(initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [categoryId, setCategoryId] = useState<number | ''>(initialData?.categoryId || '');
    const [isTaxRelevant, setIsTaxRelevant] = useState(initialData?.isTaxRelevant === 1);
    const [fileHash, setFileHash] = useState<string>(initialData?.file_hash || '');
    const [notes, setNotes] = useState(initialData?.description || '');
    const [currency, setCurrency] = useState(initialData?.currency || 'USD');

    const categories = useLiveQuery(() => db.categories.toArray());
    const exchangeRates = useLiveQuery(() => db.exchangeRates.toArray()) || [];

    const knownMerchants = useLiveQuery(async () => {
        const unique = new Set<string>();
        await db.expenses.each(e => unique.add(e.merchant));
        return Array.from(unique);
    }) || [];

    const processImage = async (file: File) => {
        setIsProcessing(true);
        setOcrStatus('Processing...');
        let imageFile = file;
        setProcessedFile(null);

        try {
            const smartData = smartParseFilename(file.name);
            const isHighConfidenceSmart = smartData.confidence >= 0.8;
            if (smartData.confidence > 0) {
                if (smartData.date) setDate(smartData.date);
                if (isHighConfidenceSmart && smartData.merchant) {
                    setMerchant(smartData.merchant);
                    const predictedCat = await predictCategory(smartData.merchant);
                    if (predictedCat) setCategoryId(predictedCat);
                }
            }

            const hash = await calculateFileHash(file);
            setFileHash(hash);
            const existing = await db.expenses.where('file_hash').equals(hash).first();
            const isSelf = initialData && existing && existing.id === initialData.id;

            if (existing && !isSelf) {
                if (!window.confirm("Duplicate detected! Create anyway?")) {
                    resetForm();
                    return;
                }
            }

            if (file.type === 'application/pdf') {
                setOcrStatus('Rendering PDF...');
                const blob = await renderPdfToImage(file);
                imageFile = new File([blob], file.name.replace('.pdf', '.png'), { type: 'image/png' });
                setProcessedFile(imageFile);
            }

            setOcrStatus('Reading receipt...');
            const result = await parseReceiptImage(imageFile);
            setRawText(result.rawText);

            if (result.amount && !amount) setAmount(result.amount);
            if (result.date && !smartData.date) setDate(result.date);

            const notesParts = [notes];
            if (result.accountNumber) notesParts.push(`Acct: ${result.accountNumber}`);
            if (result.address) notesParts.push(result.address);
            if (notesParts.filter(Boolean).length > 0) setNotes(notesParts.filter(Boolean).join('\n'));

            let finalMerchant = merchant || result.merchant || smartData.merchant;
            if (!finalMerchant && result.rawText && knownMerchants.length > 0) {
                const found = findMerchantInText(result.rawText, knownMerchants);
                if (found) finalMerchant = found;
            }

            if (finalMerchant) {
                setMerchant(finalMerchant);
                if (!categoryId) {
                    const predictedCat = await predictCategory(finalMerchant);
                    if (predictedCat) setCategoryId(predictedCat);
                }
            }

        } catch (err) {
            console.error(err);
            setOcrStatus('Error reading file');
        } finally {
            setIsProcessing(false);
            setOcrStatus('');
        }
    };

    const resetForm = () => {
        setFile(null);
        setMerchant('');
        setAmount('');
        setCategoryId('');
        setNotes('');
        setFileHash('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsProcessing(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            setFile(f);
            processImage(f);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const f = e.dataTransfer.files[0];
            setFile(f);
            processImage(f);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !merchant) return;

        let receiptData = initialData?.receiptImage;
        const fileToSave = processedFile || file;

        if (fileToSave) {
            try {
                receiptData = await fileToBase64(fileToSave);
            } catch (err) {
                console.error(err);
            }
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

    // Helper Styles
    const inputStyle = {
        width: '100%',
        padding: '0.75rem',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-color)',
        color: 'var(--text-primary)',
        fontSize: '1rem',
        outline: 'none',
        transition: 'border-color 0.2s',
        fontFamily: 'inherit'
    };

    const labelStyle = {
        fontSize: '0.85rem',
        fontWeight: 500,
        color: 'var(--text-secondary)',
        marginBottom: '0.35rem',
        display: 'block'
    }

    return (
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>

            {/* Extended File Upload Zone */}
            <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                    position: 'relative',
                    border: '2px dashed ' + (isProcessing ? 'var(--primary)' : 'var(--border-color)'),
                    background: isProcessing ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    marginBottom: '1.5rem',
                    transition: 'all 0.2s'
                }}
            >
                <input type="file" ref={fileInputRef} hidden accept="image/*,application/pdf" onChange={handleFileChange} />

                {isProcessing ? (
                    <div className="flex-center" style={{ flexDirection: 'column', gap: '0.75rem' }}>
                        <Loader2 className="spin" color="var(--primary)" size={32} />
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{ocrStatus}</p>
                    </div>
                ) : file ? (
                    <div className="flex-center" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(var(--success-hue), 80%, 40%, 0.1)', borderRadius: '50%' }}>
                            <Check size={24} color="var(--success)" />
                        </div>
                        <p style={{ fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); resetForm(); }}
                            style={{ fontSize: '0.8rem', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                            <Trash2 size={12} /> Remove
                        </button>
                    </div>
                ) : (
                    <div style={{ color: 'var(--text-secondary)' }}>
                        <div style={{ marginBottom: '0.75rem', padding: '0.75rem', background: 'var(--surface-color)', display: 'inline-block', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <Upload size={24} />
                        </div>
                        <p style={{ fontWeight: 500 }}>Tap to scan receipt</p>
                        <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.25rem' }}>or drag & drop file here</p>
                    </div>
                )}
            </div>

            {/* Responsive Grid */}
            <div className="form-grid" style={{ marginBottom: '1.5rem' }}>

                {/* Merchant Input */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>Merchant</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            list="merchant-list"
                            value={merchant}
                            onChange={e => {
                                setMerchant(e.target.value);
                                if (e.target.value.length > 2 && !categoryId) {
                                    predictCategory(e.target.value).then(c => c && setCategoryId(c));
                                }
                            }}
                            placeholder="e.g. Starbucks"
                            required
                            style={inputStyle}
                        />
                        <datalist id="merchant-list">
                            {knownMerchants?.map(m => <option key={m} value={m} />)}
                        </datalist>
                    </div>
                </div>

                {/* Amount Input */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>Amount</label>
                    <div style={{ position: 'relative', display: 'flex' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }}>
                            {currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$'}
                        </span>
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0.00"
                            required
                            style={{ ...inputStyle, paddingLeft: '2rem', paddingRight: '4rem', fontFamily: 'monospace', fontWeight: 600 }}
                        />
                        <div style={{ position: 'absolute', right: '4px', top: '4px', bottom: '4px' }}>
                            <select
                                value={currency}
                                onChange={e => setCurrency(e.target.value)}
                                style={{
                                    height: '100%',
                                    padding: '0 0.5rem',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'var(--surface-color)',
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                {exchangeRates.length > 0 ?
                                    exchangeRates.map(r => <option key={r.id} value={r.id}>{r.id}</option>) :
                                    <option value="USD">USD</option>
                                }
                            </select>
                        </div>
                    </div>
                </div>

                {/* Date Input */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>Date</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            required
                            onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                            style={{ ...inputStyle, cursor: 'pointer' }}
                        />
                        <Calendar size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                    </div>
                </div>

                {/* Category Select */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <label style={labelStyle}>Category</label>
                    <div style={{ position: 'relative' }}>
                        <select
                            value={categoryId}
                            onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                            style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                        >
                            <option value="">Uncategorized</option>
                            {categories?.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notes & Options */}
            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Notes</label>
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Details..."
                    style={{ ...inputStyle, resize: 'vertical' }}
                />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                        type="checkbox"
                        checked={isTaxRelevant}
                        onChange={e => setIsTaxRelevant(e.target.checked)}
                        style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--primary)' }}
                    />
                    <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Tax Deductible</span>
                </label>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    style={{ flex: 1 }}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    isLoading={isProcessing}
                    style={{ flex: 2, background: 'var(--primary)', color: 'white', boxShadow: '0 4px 12px var(--primary-glow)' }}
                >
                    {initialData ? 'Update Expense' : 'Add Expense'}
                </Button>
            </div>

            {/* Debug (Collapsible) */}
            {rawText && (
                <details style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>View OCR Debug Info</summary>
                    <pre style={{ padding: '0.75rem', background: '#111', color: '#4ade80', borderRadius: 'var(--radius-md)', overflowX: 'auto', maxHeight: '150px' }}>
                        {rawText}
                    </pre>
                </details>
            )}
        </form>
    );
}
