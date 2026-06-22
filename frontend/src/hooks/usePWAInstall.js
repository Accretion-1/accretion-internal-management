import { useCallback, useEffect, useState } from 'react';

const isRunningStandalone = () =>
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true);

export const usePWAInstall = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(isRunningStandalone);

    useEffect(() => {
        const handleBeforeInstallPrompt = (event) => {
            event.preventDefault();
            setDeferredPrompt(event);
        };

        const handleAppInstalled = () => {
            setDeferredPrompt(null);
            setIsInstalled(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstall = useCallback(async () => {
        if (!deferredPrompt) return null;

        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);

        return outcome;
    }, [deferredPrompt]);

    return {
        isInstallable: Boolean(deferredPrompt) && !isInstalled,
        isInstalled,
        handleInstall,
    };
};

export default usePWAInstall;
