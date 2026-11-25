import React, { useState } from 'react';
import { 
  Check, 
  Copy, 
  Share2, 
  Mail, 
  X, 
  ExternalLink, 
  ShieldCheck, 
  Key, 
  CheckCircle2,
  Building2,
  Lock,
  User,
  AlertCircle
} from 'lucide-react';
import { firebaseAuthService } from '../../services/firebaseAuthService';
import { useModalLifecycle } from '../../hooks/useModalLifecycle';

export interface StudioHandoverData {
  studioName: string;
  studioId: string;
  ownerName: string;
  ownerMobile: string;
  ownerEmail: string;
  username: string;
  temporaryPassword: string;
  loginUrl?: string;
  mustChangePassword?: boolean;
}

interface StudioHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: StudioHandoverData;
}

export const StudioHandoverModal: React.FC<StudioHandoverModalProps> = ({
  isOpen,
  onClose,
  data
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const { handleAttemptClose, handleBackdropClick } = useModalLifecycle({
    isOpen: true,
    onClose
  });

  if (!isOpen) return null;

  const loginUrl = data.loginUrl || `${window.location.origin}/#/studio/login`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const copyAllDetails = () => {
    const fullText = `=== STUDIO OS STUDIO OWNER CREDENTIALS ===
Studio: ${data.studioName}
Login URL: ${loginUrl}
Login ID: ${data.username}
Password: ${data.temporaryPassword}

Please keep these login details secure.`;
    copyToClipboard(fullText, 'all');
  };

  const getWhatsAppMessage = () => {
    return `Hello ${data.ownerName},

Your Studio OS credentials have been configured:

Studio: ${data.studioName}
Login URL: ${loginUrl}
Login ID: ${data.username}
Password: ${data.temporaryPassword}

Please keep these credentials secure.`;
  };

  const handleShareWhatsApp = () => {
    const cleanPhone = data.ownerMobile.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(getWhatsAppMessage());
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${message}` 
      : `https://wa.me/?text=${message}`;
    window.open(waUrl, '_blank');
  };

  const handleSendResetEmail = async () => {
    setSendingReset(true);
    try {
      const res = await firebaseAuthService.sendPasswordReset(data.ownerEmail);
      if (res.success) {
        setResetEmailSent(true);
        setTimeout(() => setResetEmailSent(false), 4000);
      } else {
        alert(res.error || 'Failed to dispatch reset email.');
      }
    } catch (e: any) {
      alert(e.message || 'Error dispatching password reset email.');
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-zinc-100 space-y-5 animate-in fade-in zoom-in-95 duration-200 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleAttemptClose}
          className="absolute right-4 top-4 min-w-[44px] min-h-[44px] rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer flex items-center justify-center touch-manipulation"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 font-display">Studio Owner Login Handover</h3>
            <p className="text-xs text-zinc-500">Official Account Handover Panel</p>
          </div>
        </div>

        {resetEmailSent && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Password reset email dispatched to {data.ownerEmail}!</span>
          </div>
        )}

        {/* Handover Details Card */}
        <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/90 space-y-3 text-xs font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200/60 font-sans">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Studio</span>
            <strong className="text-xs font-bold text-zinc-900">{data.studioName}</strong>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-zinc-500 font-sans">Login URL:</span>
            <div className="flex items-center gap-1">
              <span className="text-zinc-900 truncate max-w-[170px] sm:max-w-[200px] text-xs">{loginUrl}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(loginUrl, 'url')}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-zinc-200 rounded-lg text-zinc-600 cursor-pointer touch-manipulation"
                title="Copy Login URL"
              >
                {copiedKey === 'url' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-zinc-500 font-sans">Studio ID:</span>
            <div className="flex items-center gap-1">
              <strong className="text-amber-800 font-bold">{data.studioId}</strong>
              <button
                type="button"
                onClick={() => copyToClipboard(data.studioId, 'id')}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-zinc-200 rounded-lg text-zinc-600 cursor-pointer touch-manipulation"
                title="Copy Studio ID"
              >
                {copiedKey === 'id' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-zinc-500 font-sans">Login ID:</span>
            <div className="flex items-center gap-1">
              <strong className="text-indigo-800 font-bold">{data.username}</strong>
              <button
                type="button"
                onClick={() => copyToClipboard(data.username, 'user')}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-zinc-200 rounded-lg text-zinc-600 cursor-pointer touch-manipulation"
                title="Copy Login ID"
              >
                {copiedKey === 'user' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-1.5 px-2.5 bg-amber-50/80 border border-amber-200/70 rounded-xl">
            <span className="text-amber-900 font-sans font-semibold">Temporary Password:</span>
            <div className="flex items-center gap-1">
              <strong className="text-amber-950 font-black tracking-wider text-xs bg-white px-2 py-0.5 rounded border border-amber-300">
                {data.temporaryPassword}
              </strong>
              <button
                type="button"
                onClick={() => copyToClipboard(data.temporaryPassword, 'pass')}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center hover:bg-amber-200 rounded-lg text-amber-900 cursor-pointer touch-manipulation"
                title="Copy Temporary Password"
              >
                {copiedKey === 'pass' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <p className="text-xs text-zinc-500 leading-relaxed font-sans">
          <strong>Security note:</strong> For safety, this initial password is shown once. The studio owner can sign in immediately at the Studio OS login page using their Login ID and Password.
        </p>

        {/* Action Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 font-sans">
          <button
            type="button"
            onClick={copyAllDetails}
            className="min-h-[48px] sm:min-h-[44px] py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm sm:text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm touch-manipulation active:scale-[0.98]"
          >
            {copiedKey === 'all' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedKey === 'all' ? 'All Details Copied!' : 'Copy All Login Details'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="min-h-[48px] sm:min-h-[44px] py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm touch-manipulation active:scale-[0.98]"
          >
            <Share2 className="w-4 h-4" />
            <span>Share via WhatsApp</span>
          </button>
        </div>

        <p className="text-xs text-zinc-400 text-center font-sans">
          WhatsApp click-to-chat opens your WhatsApp client with the prefilled message. The administrator must press Send in WhatsApp.
        </p>
      </div>
    </div>
  );
};
