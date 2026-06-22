import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

const DISMISS_KEY = 'pwa-install-banner-dismissed';

export const InstallBanner = ({ className = '' }) => {
    const { isInstallable, isInstalled, handleInstall } = usePWAInstall();
    const [isDismissed, setIsDismissed] = useState(
        () => sessionStorage.getItem(DISMISS_KEY) === 'true',
    );

    if (!isInstallable || isInstalled || isDismissed) return null;

    const dismissBanner = () => {
        sessionStorage.setItem(DISMISS_KEY, 'true');
        setIsDismissed(true);
    };

    const installApp = async () => {
        const outcome = await handleInstall();
        if (outcome === 'accepted') dismissBanner();
    };

    return (
        <aside className={className} role="status" aria-label="Install application">
            <span>Install WorkSphere for faster access and offline support.</span>
            <button type="button" onClick={installApp}>
                Install
            </button>
            <button
                type="button"
                onClick={dismissBanner}
                aria-label="Dismiss install prompt"
            >
                Close
            </button>
        </aside>
    );
};

export default InstallBanner;
