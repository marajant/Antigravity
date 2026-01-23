import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/ui/Button';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ReloadPrompt() {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    return (
        <AnimatePresence>
            {(offlineReady || needRefresh) && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50 p-4 glass-panel border-l-4 border-primary rounded-lg shadow-2xl max-w-sm"
                >
                    <div className="flex flex-col gap-2">
                        <div className="font-semibold text-sm">
                            {offlineReady ?
                                "App ready to work offline" :
                                "New content available, click on reload button to update."}
                        </div>
                        <div className="flex gap-2 justify-end mt-2">
                            {needRefresh && (
                                <Button size="sm" onClick={() => updateServiceWorker(true)}>
                                    <RefreshCw className="mr-2 h-3 w-3" />
                                    Reload
                                </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={close}>
                                Close
                            </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
