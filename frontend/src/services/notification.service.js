import toast from 'react-hot-toast';
import { getToken, onMessage } from 'firebase/messaging';
import apiHandler from '../store/api/apiHandler';
import { API_ENDPOINTS } from '../store/api/endpoints';
import { firebaseConfig, getFirebaseMessaging } from '../firebase';

const FIREBASE_SW_PATH = '/firebase-messaging-sw.js';
const FIREBASE_SW_SCOPE = '/firebase-cloud-messaging-push-scope';
const VAPID_PUBLIC_KEY_PATTERN = /^[A-Za-z0-9_-]{80,180}$/;

const getFirebaseConfigQuery = () => new URLSearchParams(
    Object.entries(firebaseConfig).filter(([, value]) => Boolean(value)),
).toString();

export const isNotificationSupported = () => (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
);

export const registerFirebaseServiceWorker = async () => {
    if (!isNotificationSupported()) return null;

    const configQuery = getFirebaseConfigQuery();
    return navigator.serviceWorker.register(
        `${FIREBASE_SW_PATH}${configQuery ? `?${configQuery}` : ''}`,
        { scope: FIREBASE_SW_SCOPE },
    );
};

const getVapidKey = () => {
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim();
    return VAPID_PUBLIC_KEY_PATTERN.test(vapidKey || '') ? vapidKey : null;
};

const warnNotificationSetupIssue = (message) => {
    if (import.meta.env.DEV) {
        console.warn(message);
    }
};

export const requestNotificationPermission = async () => {
    if (!isNotificationSupported()) {
        return { permission: 'unsupported', token: null };
    }

    if (Notification.permission === 'denied') {
        return { permission: 'denied', token: null };
    }

    const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();

    if (permission !== 'granted') {
        return { permission, token: null };
    }

    try {
        const messaging = await getFirebaseMessaging();
        const vapidKey = getVapidKey();

        if (!messaging) {
            return { permission: 'unsupported', token: null };
        }

        if (!vapidKey) {
            warnNotificationSetupIssue(
                'Invalid or missing VITE_FIREBASE_VAPID_KEY. Use the Web Push certificate public key from Firebase Console.',
            );
            return { permission: 'unsupported', token: null };
        }

        const serviceWorkerRegistration = await registerFirebaseServiceWorker();
        const token = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration,
        });

        return { permission, token: token || null };
    } catch (error) {
        warnNotificationSetupIssue(
            error?.name === 'InvalidAccessError'
                ? 'Unable to generate FCM token because VITE_FIREBASE_VAPID_KEY is not a valid Web Push public key.'
                : `Unable to generate FCM token: ${error?.message || 'Unknown Firebase messaging error'}`,
        );
        return { permission, token: null };
    }
};

export const getFcmTokenSafely = async () => {
    const result = await requestNotificationPermission();
    return result.token || null;
};

export const syncFcmToken = async (fcmToken) => {
    if (!fcmToken) return null;
    if (!localStorage.getItem('authToken')) return null;

    return apiHandler({
        method: 'PUT',
        url: API_ENDPOINTS.USER.UPDATE_FCM_TOKEN,
        data: { fcm_token: fcmToken },
        showNotification: false,
    });
};

export const refreshAndSyncFcmToken = async () => {
    if (!localStorage.getItem('authToken')) return null;

    const fcmToken = await getFcmTokenSafely();
    if (fcmToken) {
        try {
            await syncFcmToken(fcmToken);
        } catch (error) {
            if (Number(error?.status) === 401 || Number(error?.code) === 401) {
                return null;
            }

            throw error;
        }
    }
    return fcmToken;
};

export const showBrowserNotification = async ({
    title = 'Notification',
    body = '',
    icon = '/icons/pwa-192x192.png',
    url = '/',
} = {}) => {
    if (!isNotificationSupported() || Notification.permission !== 'granted') {
        return false;
    }

    const options = {
        body,
        icon,
        badge: icon,
        data: { url },
    };

    try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, options);
        return true;
    } catch {
        try {
            const notification = new Notification(title, options);
            notification.onclick = () => {
                window.focus();
                if (url) window.location.assign(url);
            };
            return true;
        } catch {
            return false;
        }
    }
};

export const listenForForegroundNotifications = async () => {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return () => {};

    return onMessage(messaging, (payload) => {
        const title = payload.notification?.title || payload.data?.title || 'Notification';
        const body = payload.notification?.body || payload.data?.body || '';
        showBrowserNotification({
            title,
            body,
            icon: payload.notification?.icon || payload.data?.icon || '/icons/pwa-192x192.png',
            url: payload.fcmOptions?.link || payload.data?.url || '/',
        });
        toast(body ? `${title}: ${body}` : title);
    });
};
