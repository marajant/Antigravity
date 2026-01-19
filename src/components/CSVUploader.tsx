import { useState, useRef } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from './ui/Button';
import { db } from '../lib/db';
import { motion } from 'framer-motion';
import Papa from 'papaparse';

interface CSVUploaderProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function CSVUploader({ onClose, onSuccess }: CSVUploaderProps) {
    const [csvData, setCsvData] = useState<any[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState({
        date: '',
        amount: '',
        merchant: '',
        category: ''
    });
    const [step, setStep] = useState<1 | 2>(1);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processFile = (file: File) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
                setCsvData(results.data);
                if (results.meta.fields) {
                    setHeaders(results.meta.fields);
                    // Auto-detect attempt
                    const m = { ...mapping };
                    results.meta.fields.forEach((field: string) => {
                        const low = field.toLowerCase();
                        if (low.includes('date')) m.date = field;
                        if (low.includes('amount')) m.amount = field;
                        if (low.includes('vendor') || low.includes('merchant') || low.includes('description')) m.merchant = field;
                        if (low.includes('category')) m.category = field;
                    });
                    setMapping(m);
                }
                setStep(2);
            }
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.csv')) {
            processFile(file);
        }
    };

    const handleImport = async () => {
        if (!mapping.date || !mapping.amount || !mapping.merchant) return;

        const expensesToSave = csvData.map(row => {
            const amt = parseFloat(String(row[mapping.amount]).replace(/[^\d.-]/g, ''));
            return {
                amount: Math.abs(amt),
                currency: 'USD',
                merchant: row[mapping.merchant] || 'Imported Transaction',
                date: new Date(row[mapping.date]),
                // We could do more advanced matching here
                createdAt: new Date(),
                description: 'CSV Import',
                isTaxRelevant: 0,
                file_hash: `csv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };
        }).filter(e => !isNaN(e.amount) && !isNaN(e.date.getTime()));

        try {
            await db.expenses.bulkAdd(expensesToSave);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to import CSV data:', error);
            alert('Failed to import some transactions. Please check your data and try again.');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {step === 1 ? (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    style={{
                        border: '2px dashed var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: '3rem',
                        textAlign: 'center',
                        cursor: 'pointer'
                    }}
                >
                    <input type="file" ref={fileInputRef} hidden accept=".csv" onChange={handleFileChange} />
                    <FileDown size={40} style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
                    <p>Drop CSV file here or click to upload</p>
                </div>
            ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <h4>Map Columns</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        Match the headers from your CSV to our expected fields.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {['date', 'amount', 'merchant', 'category'].map(field => (
                            <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>{field}</label>
                                <select
                                    value={(mapping as any)[field]}
                                    onChange={e => setMapping({ ...mapping, [field]: e.target.value })}
                                    style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                                >
                                    <option value="">Select Column...</option>
                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '1.5rem', background: 'var(--surface-color)', padding: '1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                        <strong>Preview (Row 1):</strong>
                        <pre style={{ margin: '0.5rem 0 0 0', overflowX: 'auto' }}>
                            {JSON.stringify(csvData[0], null, 2)}
                        </pre>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                        <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                        <Button onClick={handleImport}>Import {csvData.length} Rows</Button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
