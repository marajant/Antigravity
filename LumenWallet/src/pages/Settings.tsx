import { useState, useRef } from 'react';
import { Button } from '@/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/ui/Card';
import { Input } from '@/ui/Input';
import { Label } from '@/ui/Label';
import { createBackup, importBackup, downloadBackup } from '@/lib/backup';
import { recordBackup } from '@/hooks/useBackupReminder';
import { generateKey, exportKey } from '@/lib/crypto';
import { Loader2, Download, Upload, Key, ShieldCheck } from 'lucide-react';
import { useTheme } from '@/lib/theme';

export default function Settings() {
    const { setTheme, theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [encryptionKey, setEncryptionKey] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleGenerateKey = async () => {
        try {
            const key = await generateKey();
            const exported = await exportKey(key);
            setEncryptionKey(exported);
            setMessage({ type: 'success', text: 'New encryption key generated. Save it safely!' });
        } catch (e) {
            setMessage({ type: 'error', text: 'Failed to generate key.' });
        }
    };

    const handleExport = async () => {
        setLoading(true);
        setMessage(null);
        try {
            // If key is present in input, use it (even if manually pasted)
            // In a real app, you'd likely manage this key more securely (e.g. password derivation)
            // For this demo, we assume raw JWK usage if provided.
            const backupData = await createBackup(encryptionKey ? encryptionKey : undefined);
            downloadBackup(backupData, `expenseflow-backup-${new Date().toISOString().split('T')[0]}.json`);
            recordBackup();
            setMessage({ type: 'success', text: 'Backup exported successfully.' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Export failed.' });
        } finally {
            setLoading(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setMessage(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = event.target?.result as string;
                await importBackup(content, encryptionKey ? encryptionKey : undefined);
                setMessage({ type: 'success', text: 'Data restored successfully!' });
                // Create a reload prompt or auto-reload to reflect changes 
                setTimeout(() => window.location.reload(), 1500);
            } catch (err: any) {
                setMessage({ type: 'error', text: err.message || 'Import failed. Check your key or file.' });
            } finally {
                setLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-3xl font-bold text-gradient">Settings</h2>

            <Card className="glass-panel">
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize how ExpenseFlow looks.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label>Theme Mode</Label>
                        <div className="flex gap-2">
                            <Button variant={theme === 'light' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('light')}>Light</Button>
                            <Button variant={theme === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('dark')}>Dark</Button>
                            <Button variant={theme === 'system' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('system')}>System</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="glass-panel">
                <CardHeader>
                    <CardTitle>Data Management</CardTitle>
                    <CardDescription>Backup and restore your data locally.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {message && (
                        <div className={`p-3 rounded-md text-sm border ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>Encryption Key (Optional)</Label>
                        <div className="flex gap-2">
                            <Input
                                value={encryptionKey}
                                onChange={(e) => setEncryptionKey(e.target.value)}
                                placeholder="Paste JWK key here to encrypt/decrypt..."
                                type="text"
                            />
                            <Button variant="outline" onClick={handleGenerateKey} title="Generate New Key">
                                <Key className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Leave empty for unencrypted JSON. If you generate a key, SAVE IT. It is required to restore encrypted backups.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <Button onClick={handleExport} disabled={loading} className="flex-1">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Export Data
                        </Button>
                        <Button variant="outline" onClick={handleImportClick} disabled={loading} className="flex-1">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Import Data
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".json"
                            onChange={handleFileChange}
                        />
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/20 p-4 rounded-b-lg">
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                        <p>Your data is stored locally in your browser (IndexedDB). Exporting creates a JSON file you can save anywhere. Encrypted backups use AES-GCM 256-bit security.</p>
                    </div>
                </CardFooter>
            </Card>

            <Card className="glass-panel opacity-50">
                <CardHeader>
                    <CardTitle>Cloud Sync (Coming Soon)</CardTitle>
                    <CardDescription>Google Drive integration is planned for a future update.</CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}
