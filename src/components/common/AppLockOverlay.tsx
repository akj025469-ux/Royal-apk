import React, { useState } from 'react';
import { Lock, Unlock, ShieldAlert, KeyRound, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { verifyPin } from '../../utils/crypto';

interface AppLockOverlayProps {
  isLocked?: boolean;
  onUnlock?: () => void;
}

export const AppLockOverlay: React.FC<AppLockOverlayProps> = ({ isLocked: propLocked, onUnlock: propUnlock }) => {
  const { isAppLocked, unlockApp, settings, updateSettings, showToast } = useApp();
  const isLocked = propLocked !== undefined ? propLocked : isAppLocked;
  const onUnlock = propUnlock || unlockApp;

  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  if (!isLocked) return null;

  const handleKeyPress = (num: string) => {
    if (pinInput.length < 6) {
      const next = pinInput + num;
      setPinInput(next);
      setErrorMsg('');
      if (next.length >= 4) {
        // Auto-check if 4 digits matches stored pin
        checkPin(next);
      }
    }
  };

  const handleDelete = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const checkPin = async (input: string) => {
    const storedHash = settings.security?.pinHash || '';
    if (!storedHash) {
      // If lock was enabled without a hash, let them in
      onUnlock();
      return;
    }

    const isValid = await verifyPin(input, storedHash);
    if (isValid) {
      setErrorMsg('');
      setPinInput('');
      onUnlock();
      showToast('Welcome back! App Unlocked.', 'success');
    } else if (input.length >= 4) {
      setErrorMsg('Incorrect PIN. Please try again.');
    }
  };

  const handleEmergencyReset = async () => {
    await updateSettings({
      security: {
        ...(settings.security || { appLockEnabled: false }),
        appLockEnabled: false,
        pinHash: undefined,
      },
    });
    setShowEmergencyModal(false);
    onUnlock();
    showToast('App Lock has been reset and disabled safely.', 'info');
  };

  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center p-4 bg-[#070D18] text-slate-100 select-none">
      <div className="w-full max-w-xs flex flex-col items-center space-y-6">
        {/* Shield Icon */}
        <div className="p-4 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-xl">
          <Lock className="w-10 h-10 animate-pulse" />
        </div>

        {/* Title */}
        <div className="text-center space-y-1">
          <h1 className="text-lg font-black tracking-wider text-amber-400 uppercase">
            {settings.businessName || 'ROYAL ERP'}
          </h1>
          <p className="text-xs text-slate-400">Security PIN Protected</p>
        </div>

        {/* PIN Dots Indicator */}
        <div className="flex items-center justify-center gap-3 py-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                pinInput.length > idx
                  ? 'bg-amber-400 border-amber-400 scale-110 shadow-md shadow-amber-500/30'
                  : 'bg-slate-800 border-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Error text if any */}
        {errorMsg && (
          <div className="text-xs font-bold text-rose-400 bg-rose-950/40 border border-rose-800/50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-shake">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-14 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 active:scale-95 text-lg font-bold text-slate-100 transition-all shadow-sm"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 active:scale-95 text-xs font-bold text-slate-400 transition-all flex items-center justify-center"
          >
            DEL
          </button>

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 active:scale-95 text-lg font-bold text-slate-100 transition-all shadow-sm"
          >
            0
          </button>

          <button
            type="button"
            onClick={() => checkPin(pinInput)}
            className="h-14 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 active:scale-95 text-xs font-bold text-amber-400 transition-all flex items-center justify-center"
          >
            OK
          </button>
        </div>

        {/* Emergency Unlock / Bypass Help */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setShowEmergencyModal(true)}
            className="text-[11px] text-slate-500 hover:text-amber-400 underline underline-offset-4"
          >
            Forgot PIN / Emergency Reset
          </button>
        </div>
      </div>

      {/* Emergency Reset Dialog */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-rose-900/60 bg-[#101D36] p-5 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center gap-2.5 text-rose-400">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-sm font-bold">Emergency PIN Reset</h3>
            </div>

            <p className="text-xs text-slate-300">
              To prevent permanent lockout, you can safely disable App Lock or use the emergency master code{' '}
              <span className="font-mono font-bold text-amber-400">000000</span>.
            </p>

            <p className="text-[11px] text-slate-400">
              Your business database, records, customer accounts, and milk transactions will remain 100% intact.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEmergencyModal(false)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEmergencyReset}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow"
              >
                Disable App Lock & Open
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
