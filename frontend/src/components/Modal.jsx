import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
export const Modal = ({ isOpen, onClose, title, children, footerButtons, maxWidthClass = 'max-w-xl', }) => {
    const modalRef = useRef(null);
    // ESC key to close
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);
    // Click outside to close
    const handleOutsideClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            onClose();
        }
    };
    return (<AnimatePresence>
      {isOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto" onClick={handleOutsideClick}>
          <motion.div ref={modalRef} initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ duration: 0.2, ease: 'easeOut' }} className={`w-full ${maxWidthClass} bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden max-h-[90vh]`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-100">
              <h3 className="font-display text-lg font-semibold text-slate-900">
                {title}
              </h3>
              <button id="modal-close-btn" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                <X className="w-5 h-5"/>
              </button>
            </div>

            {/* Body */}
            <div className="px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto flex-1 text-slate-700 text-sm leading-relaxed">
              {children}
            </div>

            {/* Footer */}
            {footerButtons && footerButtons.length > 0 && (<div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0 flex-wrap">
                {footerButtons.map((btn, idx) => (<button key={idx} id={btn.id || `modal-btn-${idx}`} onClick={btn.onClick} disabled={btn.isLoading} className={`px-4 py-2 text-sm font-medium rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2 ${btn.variant === 'danger'
                        ? 'bg-rose-600 hover:bg-rose-700 text-white hover:shadow-rose-100 border border-rose-700'
                        : btn.variant === 'primary'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-100 border border-blue-700'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'} disabled:opacity-50`}>
                    {btn.isLoading && (<svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>)}
                    {btn.label}
                  </button>))}
              </div>)}
          </motion.div>
        </div>)}
    </AnimatePresence>);
};
