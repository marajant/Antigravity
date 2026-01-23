import { useState, useRef } from 'react';
import { scanReceipt, type ScannedData } from '@/lib/ocr';
import { Button } from '@/ui/Button';
import { Camera, Upload, Loader2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OCRScannerProps {
    onScanComplete: (data: ScannedData) => void;
}

export function OCRScanner({ onScanComplete }: OCRScannerProps) {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        startScan(file);
    };

    const startScan = async (file: File) => {
        setIsScanning(true);
        setError(null);
        try {
            const data = await scanReceipt(file);
            onScanComplete(data);
        } catch (err) {
            console.error(err);
            setError("Failed to read receipt. Please try checking lighting or enter manually.");
        } finally {
            setIsScanning(false);
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="w-full mb-6">
            <AnimatePresence mode="wait">
                {isScanning ? (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="glass-panel p-8 rounded-xl flex flex-col items-center justify-center space-y-6"
                    >
                        <div className="relative">
                            <motion.div
                                animate={{
                                    scale: [1, 1.2, 1],
                                    opacity: [0.5, 0.8, 0.5],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                className="absolute inset-0 bg-primary/40 blur-2xl rounded-full"
                            />
                            <div className="relative z-10 bg-background/50 p-4 rounded-full border border-primary/20 backdrop-blur-md">
                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <h4 className="font-semibold text-foreground">Analyzing Receipt</h4>
                            <p className="text-xs text-muted-foreground animate-pulse text-gradient">Extracting data with Lumen AI...</p>
                        </div>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-24 flex flex-col items-center justify-center gap-2 border-dashed border-2 hover:bg-primary/5 hover:border-primary/50"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="h-6 w-6 text-primary" />
                            <span className="text-xs">Upload Receipt</span>
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            className="h-24 flex flex-col items-center justify-center gap-2 border-dashed border-2 hover:bg-primary/5 hover:border-primary/50"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Camera className="h-6 w-6 text-primary" />
                            <span className="text-xs">Take Photo</span>
                        </Button>

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileChange}
                        />
                    </div>
                )}
            </AnimatePresence>

            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md flex items-center gap-2"
                >
                    <AlertTriangle className="h-4 w-4" />
                    {error}
                </motion.div>
            )}
        </div>
    );
}
