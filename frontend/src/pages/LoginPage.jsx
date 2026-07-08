import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Phone, ShieldAlert, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { loginUser, resendOtp, verifyOtp } from '../store/slices/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks/reduxHooks';
import { selectAuthLoading, selectResendLoading } from '../store/selectors/authSelectors';
import { getFcmTokenSafely, showBrowserNotification } from '../services/notification.service';

export const LoginPage = () => {
    const dispatch = useAppDispatch();
    const isLoading = useAppSelector(selectAuthLoading);
    const resendLoading = useAppSelector(selectResendLoading);
    const [step, setStep] = useState('phone');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otpValue, setOtpValue] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [otpError, setOtpError] = useState('');
    const [smsIncomingAlert, setSmsIncomingAlert] = useState(null);
    const [fcmToken, setFcmToken] = useState(null);
    const phoneSubmitLockRef = useRef(false);
    const otpAbortControllerRef = useRef(null);
    const otpPollTimerRef = useRef(null);
    const otpInputRef = useRef(null);
    const otpSubmitLockRef = useRef(false);
    const [phoneSubmitting, setPhoneSubmitting] = useState(false);

    const handlePhoneSubmit = async (e) => {
        e.preventDefault();
        if (phoneSubmitLockRef.current || isLoading || phoneSubmitting) {
            return;
        }

        const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
        if (cleanPhone.length !== 10) {
            setPhoneError('Please enter a valid 10-digit mobile number.');
            return;
        }

        phoneSubmitLockRef.current = true;
        setPhoneSubmitting(true);
        setPhoneError('');
        try {
            const generatedFcmToken = await getFcmTokenSafely();
            setFcmToken(generatedFcmToken);
            await dispatch(loginUser({ phone_number: cleanPhone })).unwrap();
            setPhoneNumber(cleanPhone);
            setStep('otp');
            if (import.meta.env.DEV) {
                setSmsIncomingAlert({
                    show: true,
                    text: 'Development verification code: 1234. Valid for 5 minutes.',
                });
            }
        }
        catch (error) {
            setPhoneError(error?.message || 'Unable to send OTP.');
        }
        finally {
            phoneSubmitLockRef.current = false;
            setPhoneSubmitting(false);
        }
    };

    const submitOtpCode = useCallback(async (code) => {
        const cleanCode = String(code || '').replace(/[^0-9]/g, '').slice(0, 4);
        if (otpSubmitLockRef.current || isLoading) {
            return;
        }

        if (cleanCode.length !== 4) {
            setOtpError('OTP must be exactly 4 digits.');
            return;
        }

        otpSubmitLockRef.current = true;
        setOtpError('');
        try {
            await dispatch(verifyOtp({ phone_number: phoneNumber, otp: cleanCode, fcm_token: fcmToken })).unwrap();
            setSmsIncomingAlert(null);
        }
        catch (error) {
            setOtpError(error?.message || 'Unable to verify OTP.');
        }
        finally {
            otpSubmitLockRef.current = false;
        }
    }, [dispatch, fcmToken, isLoading, phoneNumber]);

    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        await submitOtpCode(otpValue);
    };

    const handleResendOtp = async () => {
        setOtpError('');
        try {
            await dispatch(resendOtp({ phone_number: phoneNumber })).unwrap();
        }
        catch (error) {
            setOtpError(error?.message || 'Unable to resend OTP.');
        }
    };

    useEffect(() => {
        if (step !== 'otp') {
            if (otpAbortControllerRef.current) {
                otpAbortControllerRef.current.abort();
                otpAbortControllerRef.current = null;
            }
            if (otpPollTimerRef.current) {
                clearInterval(otpPollTimerRef.current);
                otpPollTimerRef.current = null;
            }
            return undefined;
        }

        if (typeof window === 'undefined' || !('OTPCredential' in window) || !navigator.credentials?.get) {
            if (otpInputRef.current) {
                otpInputRef.current.focus();
            }
            return undefined;
        }

        const controller = new AbortController();
        otpAbortControllerRef.current = controller;
        otpInputRef.current?.focus();

        const startPollingForAutofill = () => {
            let attempts = 0;
            otpPollTimerRef.current = window.setInterval(() => {
                attempts += 1;
                const domValue = String(otpInputRef.current?.value || '').replace(/[^0-9]/g, '').slice(0, 4);
                if (domValue.length === 4 && domValue !== otpValue) {
                    setOtpValue(domValue);
                    setOtpError('');
                    clearInterval(otpPollTimerRef.current);
                    otpPollTimerRef.current = null;
                    submitOtpCode(domValue);
                    return;
                }

                if (attempts >= 20) {
                    clearInterval(otpPollTimerRef.current);
                    otpPollTimerRef.current = null;
                }
            }, 250);
        };

        startPollingForAutofill();

        const startOtpListener = async () => {
            try {
                const credential = await navigator.credentials.get({
                    otp: { transport: ['sms'] },
                    signal: controller.signal,
                });

                const receivedCode = credential?.code ? String(credential.code).replace(/[^0-9]/g, '').slice(0, 4) : '';
                if (receivedCode.length === 4) {
                    setOtpValue(receivedCode);
                    setOtpError('');
                    if (otpInputRef.current) {
                        otpInputRef.current.value = receivedCode;
                    }
                    if (otpPollTimerRef.current) {
                        clearInterval(otpPollTimerRef.current);
                        otpPollTimerRef.current = null;
                    }
                    await submitOtpCode(receivedCode);
                }
            }
            catch {
                // Silent fallback: browser or platform may not support Web OTP.
            }
        };

        startOtpListener();

        return () => {
            controller.abort();
            if (otpAbortControllerRef.current === controller) {
                otpAbortControllerRef.current = null;
            }
            if (otpPollTimerRef.current) {
                clearInterval(otpPollTimerRef.current);
                otpPollTimerRef.current = null;
            }
        };
    }, [step, submitOtpCode]);

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 font-sans selection:bg-blue-100">
            <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-blue-100/60 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-0 h-72 w-72 rounded-full bg-indigo-100/60 blur-3xl" />

            <main className="relative w-full max-w-md">
                <div className="mb-6 flex flex-col items-center text-center">
                    <img
                        src="/icons/pwa-192x192.png"
                        alt="App logo"
                        className="mb-3 h-14 w-14 rounded-2xl object-cover shadow-lg shadow-blue-200"
                    />
                    <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">Login</h1>
                    <p className="mt-1 text-sm text-slate-500">Secure access with phone OTP verification.</p>
                </div>

                <div className="relative w-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
                    <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

                    <AnimatePresence mode="wait">
                        {step === 'phone' ? (
                            <motion.div
                                key="phone-step"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col gap-6"
                            >
                                <div>
                                    <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">Phone Login</h2>
                                    <p className="mt-1 text-xs text-slate-500">Enter your registered phone number to receive an OTP.</p>
                                </div>

                                <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-slate-700">Phone Number</label>
                                        <div className="relative flex items-center">
                                            <Phone className="absolute left-4 h-5 w-5 text-slate-400" />
                                            <input
                                                id="phone-input"
                                                type="tel"
                                                maxLength={10}
                                                placeholder="Enter 10-digit phone number"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                                className={`w-full rounded-2xl border bg-slate-50 py-3.5 pl-12 pr-4 text-sm font-medium text-slate-900 placeholder-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-4 ${phoneError ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-200'}`}
                                            />
                                        </div>
                                        {phoneError && (
                                            <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-600">
                                                <ShieldAlert className="h-3.5 w-3.5" />
                                                {phoneError}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        id="send-otp-btn"
                                        type="submit"
                                        disabled={isLoading || phoneSubmitting}
                                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-100 transition-all hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {isLoading || phoneSubmitting ? 'Sending OTP...' : 'Send OTP Code'}
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="otp-step"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col gap-6"
                            >
                                <div>
                                    <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">Enter OTP</h2>
                                    <p className="mt-1 text-xs text-slate-500">Enter the 4-digit code sent to your phone.</p>
                                    <div className="mt-2.5 inline-block rounded-xl border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                                        Sending token to {phoneNumber}
                                    </div>
                                </div>

                                <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-slate-700">4-Digit OTP</label>
                                        <input
                                            ref={otpInputRef}
                                            id="otp-input"
                                            type="text"
                                            maxLength={4}
                                            placeholder="••••"
                                            autoComplete="one-time-code"
                                            inputMode="numeric"
                                            name="one-time-code"
                                            value={otpValue}
                                            onChange={(e) => setOtpValue(e.target.value.replace(/[^0-9]/g, ''))}
                                            onInput={(e) => setOtpValue(e.currentTarget.value.replace(/[^0-9]/g, ''))}
                                            className={`w-full rounded-2xl border bg-slate-50 px-4 py-3.5 text-center text-xl font-bold tracking-widest text-slate-900 transition-all focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 ${otpError ? 'border-rose-400' : 'border-slate-200'}`}
                                        />
                                        {otpError && (
                                            <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-600">
                                                <ShieldAlert className="h-3.5 w-3.5" />
                                                {otpError}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        id="verify-otp-btn"
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {isLoading ? 'Verifying OTP...' : 'Verify OTP'}
                                        <ArrowRight className="h-4 w-4" />
                                    </button>

                                    <button
                                        id="resend-otp-btn"
                                        type="button"
                                        disabled={resendLoading}
                                        onClick={handleResendOtp}
                                        className="cursor-pointer text-center text-xs font-semibold text-blue-600 transition-colors hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {resendLoading ? 'Resending OTP...' : 'Resend OTP'}
                                    </button>

                                    <button
                                        id="back-phone-btn"
                                        type="button"
                                        onClick={() => setStep('phone')}
                                        className="mt-1 cursor-pointer text-center text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800"
                                    >
                                        Modify phone number
                                    </button>
                                </form>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-xs">
                            <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-blue-100 border-t-blue-600" />
                            <span className="text-xs font-semibold text-slate-600">Please wait...</span>
                        </div>
                    )}
                </div>
            </main>

            <AnimatePresence>
                {smsIncomingAlert?.show && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="pointer-events-auto fixed inset-x-6 bottom-6 z-40 max-w-sm overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-slate-100 shadow-xl sm:left-auto sm:right-6"
                    >
                        <div className="flex items-start gap-3.5 p-4">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-[10px] font-bold">
                                💬
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-bold text-slate-400">Development OTP</p>
                                <p className="mt-1 font-mono text-xs font-semibold text-slate-200">{smsIncomingAlert.text}</p>
                                <button
                                    id="magic-copy-otp-btn"
                                    onClick={() => setOtpValue('1234')}
                                    className="mt-2 text-[11px] font-bold text-blue-400 transition-colors hover:text-blue-300"
                                >
                                    Autofill Code 1234
                                </button>
                            </div>
                            <button
                                id="dismiss-sms"
                                onClick={() => setSmsIncomingAlert({ show: false, text: '' })}
                                className="text-slate-500 hover:text-slate-300"
                            >
                                ×
                            </button>
                        </div>
                        <div className="h-1 animate-pulseGlow bg-gradient-to-r from-emerald-500 to-blue-500" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
