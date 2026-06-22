import React, { useState } from 'react';
import { Phone, ShieldAlert, ArrowRight, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { loginUser, resendOtp, verifyOtp } from '../store/slices/authSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks/reduxHooks';
import { selectAuthLoading, selectResendLoading } from '../store/selectors/authSelectors';
export const LoginPage = () => {
    const dispatch = useAppDispatch();
    const isLoading = useAppSelector(selectAuthLoading);
    const resendLoading = useAppSelector(selectResendLoading);
    // Login steps: "phone" -> inputting phone; "otp" -> inputting OTP
    const [step, setStep] = useState('phone');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otpValue, setOtpValue] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [otpError, setOtpError] = useState('');
    const [smsIncomingAlert, setSmsIncomingAlert] = useState(null);
    // Validate phone
    const handlePhoneSubmit = async (e) => {
        e.preventDefault();
        const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
        if (cleanPhone.length !== 10) {
            setPhoneError('Please enter a valid 10-digit mobile number.');
            return;
        }
        setPhoneError('');
        try {
            await dispatch(loginUser({ phone_number: phoneNumber })).unwrap();
            setStep('otp');
            if (import.meta.env.DEV) {
                setSmsIncomingAlert({
                    show: true,
                    text: 'Development verification code: 123456. Valid for 5 minutes.',
                });
            }
        }
        catch (error) {
            setPhoneError(error?.message || 'Unable to send OTP.');
        }
    };
    // Validate OTP
    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        if (otpValue.length !== 6) {
            setOtpError('OTP must be exactly 6 digits.');
            return;
        }
        setOtpError('');
        try {
            await dispatch(verifyOtp({ phone_number: phoneNumber, otp: otpValue })).unwrap();
            setSmsIncomingAlert(null);
        }
        catch (error) {
            setOtpError(error?.message || 'Unable to verify OTP.');
        }
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
    // Magic Autofill Button for Quick Evaluation (Cheat Panel)
    const handleQuickAutofill = (phone) => {
        setPhoneNumber(phone);
        setPhoneError('');
        setStep('phone');
        setOtpValue('123456');
        setOtpError('');
    };
    return (<div className="relative min-h-screen bg-slate-50 flex flex-col justify-between overflow-hidden font-sans selection:bg-blue-100">
      
      {/* Visual Background Decorations */}
      <div className="absolute top-0 right-0 w-[50%] h-[40%] bg-blue-100/30 rounded-bl-[100px] blur-3xl pointer-events-none"/>
      <div className="absolute bottom-0 left-0 w-[40%] h-[30%] bg-indigo-150/20 rounded-tr-[120px] blur-3xl pointer-events-none"/>

      {/* Header */}
      <header className="relative w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <img
            src="/icons/pwa-192x192.png"
            alt="Accretion"
            className="h-10 w-10 rounded-xl object-cover shadow-md shadow-blue-200"
          />
          <div>
            <span className="font-display font-bold text-slate-900 text-lg tracking-tight">WorkSphere</span>
            <span className="ml-1.5 px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-blue-55 text-blue-700 rounded-full border border-blue-100">Investor Demo</span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/>
          Enterprise Gateways Active
        </div>
      </header>

      {/* Main Area */}
      <main className="relative flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Product pitch value */}
          <div className="lg:col-span-7 flex flex-col gap-6 text-left max-w-2xl mx-auto lg:mx-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 shadow-xs rounded-full w-fit">
              <span className="text-[11px] font-bold text-blue-600 tracking-wider uppercase px-1.5 py-0.5 bg-blue-50 rounded-md">MVP Demo</span>
              <span className="text-xs text-slate-600 font-medium">Enterprise Workforce Analytics & Permissions</span>
            </div>
            
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-[1.1] tracking-tight">
              Manage Teams.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">Control Access.</span><br />
              Drive Productivity.
            </h1>
            
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              An ecosystem crafted for next-generation enterprises. Securely orchestrate role assignments, audit warehouse stocks, trigger compliant reminder flows, and evaluate operational logs with premium, granular metrics.
            </p>

            {/* Quick Access Sandbox Tooltip Panel */}
            <div className="mt-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-800">
                <HelpCircle className="w-4 h-4 text-blue-600"/>
                Demo Sandbox Preset Accounts
              </div>
              <p className="text-xs text-slate-500 mb-4 leading-normal">
                Click a preset to quickly prefill. Enter OTP <strong className="text-slate-800 font-semibold bg-slate-100 px-1 py-0.5 rounded">123456</strong> for any account:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button id="sandbox-admin-btn" onClick={() => handleQuickAutofill('9999999991')} className="p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50 hover:bg-blue-50/50 text-left transition-all hover:scale-101 cursor-pointer">
                  <p className="text-xs font-bold text-slate-800">Sarah Jenkins</p>
                  <p className="text-[10px] text-blue-600 font-medium">Role: Admin</p>
                  <p className="text-[11px] font-mono text-slate-400">9999999991</p>
                </button>
                <button id="sandbox-manager-btn" onClick={() => handleQuickAutofill('9999999992')} className="p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50 hover:bg-blue-50/50 text-left transition-all hover:scale-101 cursor-pointer">
                  <p className="text-xs font-bold text-slate-800">David Chen</p>
                  <p className="text-[10px] text-blue-600 font-medium">Role: Manager</p>
                  <p className="text-[11px] font-mono text-slate-400">9999999992</p>
                </button>
                <button id="sandbox-user-btn" onClick={() => handleQuickAutofill('9999999993')} className="p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50 hover:bg-blue-50/50 text-left transition-all hover:scale-101 cursor-pointer">
                  <p className="text-xs font-bold text-slate-800">Alex Rivera</p>
                  <p className="text-[10px] text-blue-600 font-medium">Role: User</p>
                  <p className="text-[11px] font-mono text-slate-400">9999999993</p>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Login Widget Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
              
              {/* Inner gradient indicator */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500"/>
              
              <AnimatePresence mode="wait">
                {step === 'phone' ? (<motion.div key="phone-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Enterprise Login</h2>
                      <p className="text-xs text-slate-500 mt-1">Authenticate via passwordless security loop (OTP Verification)</p>
                    </div>

                    <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-700">Phone Number</label>
                        <div className="relative flex items-center">
                          <Phone className="absolute left-4 w-5 h-5 text-slate-400"/>
                          <input id="phone-input" type="tel" maxLength={10} placeholder="Enter 10-digit phone number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))} className={`w-full pl-12 pr-4 py-3.5 bg-slate-50 border ${phoneError ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-200 focus:ring-blue-200'} rounded-2xl text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:ring-4 focus:bg-white transition-all text-sm`}/>
                        </div>
                        {phoneError ? (<div className="flex items-center gap-1.5 text-xs text-rose-600 mt-1">
                            <ShieldAlert className="w-3.5 h-3.5"/>
                            {phoneError}
                          </div>) : (<span className="text-[11px] text-slate-400">Sandbox config requires registered demo accounts.</span>)}
                      </div>

                      <button id="send-otp-btn" type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl font-semibold shadow-md shadow-blue-100 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm">
                        Send OTP Code
                        <ArrowRight className="w-4 h-4"/>
                      </button>
                    </form>
                  </motion.div>) : (<motion.div key="otp-step" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-6">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Enter OTP</h2>
                      <p className="text-xs text-slate-500 mt-1">Verification token dispatched of 6 digits code.</p>
                      <div className="mt-2.5 px-3 py-1 bg-blue-50 border border-blue-100 rounded-xl text-xs font-semibold text-blue-700 inline-block">
                        Sending token to +1 ({phoneNumber.substring(0, 3)}) {phoneNumber.substring(3, 6)}-{phoneNumber.substring(6)}
                      </div>
                    </div>

                    <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-700">6-Digit Access PIN</label>
                        <input id="otp-input" type="text" maxLength={6} placeholder="••••••" value={otpValue} onChange={(e) => setOtpValue(e.target.value.replace(/[^0-9]/g, ''))} className={`w-full px-4 py-3.5 text-center text-xl tracking-widest bg-slate-50 border ${otpError ? 'border-rose-400' : 'border-slate-200'} rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all`}/>
                        {otpError && (<div className="flex items-center gap-1.5 text-xs text-rose-600 mt-1">
                            <ShieldAlert className="w-3.5 h-3.5"/>
                            {otpError}
                          </div>)}
                      </div>

                      <button id="verify-otp-btn" type="submit" disabled={isLoading} className="w-full bg-slate-900 hover:bg-slate-850 text-white py-3.5 rounded-2xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm">
                        {isLoading ? 'Verifying Credentials...' : 'Authenticate Workspace'}
                        <ArrowRight className="w-4 h-4"/>
                      </button>

                      <button id="resend-otp-btn" type="button" disabled={resendLoading} onClick={handleResendOtp} className="text-xs font-semibold text-blue-600 hover:text-blue-800 text-center cursor-pointer transition-colors disabled:opacity-50">
                        {resendLoading ? 'Resending OTP...' : 'Resend OTP'}
                      </button>

                      <button id="back-phone-btn" type="button" onClick={() => setStep('phone')} className="text-xs font-semibold text-slate-500 hover:text-slate-800 text-center mt-1 cursor-pointer transition-colors">
                        Modify phone number
                      </button>
                    </form>
                  </motion.div>)}
              </AnimatePresence>

              {/* Loader overlay inside Card */}
              {isLoading && (<div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center gap-3">
                  <div className="w-12 h-12 rounded-full border-[3px] border-blue-100 border-t-blue-600 animate-spin"/>
                  <span className="text-xs font-semibold text-slate-600">Simulating Secure Gateways...</span>
                </div>)}
            </div>
          </div>
        </div>
      </main>

      {/* Persistent floating simulated SMS message block */}
      <AnimatePresence>
        {smsIncomingAlert?.show && (<motion.div initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-6 inset-x-6 sm:left-auto sm:right-6 max-w-sm bg-slate-900 text-slate-100 rounded-2xl shadow-xl overflow-hidden z-40 border border-slate-800 pointer-events-auto">
            <div className="p-4 flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] shrink-0 font-bold border border-slate-700">
                💬
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-400">Incoming Shortcode SMS</p>
                <p className="text-xs font-mono mt-1 text-slate-200 font-semibold">{smsIncomingAlert.text}</p>
                <button id="magic-copy-otp-btn" onClick={() => {
                setOtpValue('123456');
            }} className="mt-2 text-[11px] font-bold text-blue-400 hover:text-blue-300 transition-colors">
                  Autofill Code 123456
                </button>
              </div>
              <button id="dismiss-模拟sms" onClick={() => setSmsIncomingAlert({ show: false, text: '' })} className="text-slate-500 hover:text-slate-300">
                ×
              </button>
            </div>
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-blue-500 animate-pulseGlow"/>
          </motion.div>)}
      </AnimatePresence>

      {/* Footer */}
      <footer className="relative w-full py-6 text-center text-xs text-slate-400 border-t border-slate-200/60 shrink-0 bg-white">
        © 2026 WorkSphere Corp. Confidential Investor Preview MVP. Designed for high-density SaaS scaling.
      </footer>
    </div>);
};
