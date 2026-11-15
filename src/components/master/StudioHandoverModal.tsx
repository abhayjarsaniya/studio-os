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

  if (!isOpen) return null;

  const loginUrl = data.loginUrl || `${window.location.origin}/#/studio/login`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const copyAllDetails = () => {
    const fullText = `=== STUDIO OS CLIENT LOGIN HANDOVER ===
Studio: ${data.studioName}
Studio Login: ${loginUrl}
Studio ID: ${data.studioId}
Login ID: ${data.username}
Temporary Password: ${data.temporaryPassword}

Please keep these login details secure.
You can change your password anytime from Settings or use Forgot Password on the login page.`;
    copyToClipboard(fullText, 'all');
  };

  const getWhatsAppMessage = () => {
    return `Hello,

Your Studio OS account has been created successfully.

Studio: ${data.studioName}
Studio Login: ${loginUrl}
Studio ID: ${data.studioId}
Login ID: ${data.username}
Temporary Password: ${data.temporaryPassword}

Please keep these login details secure.

You can change your password anytime from Settings or use Forgot Password on the login page.`;
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-zinc-100 space-y-5 animate-in fade-in zoom-in-95 duration-200 relative">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
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
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Studio</span>
            <strong className="text-xs font-bold text-zinc-900">{data.studioName}</strong>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-zinc-500 font-sans">Login URL:</span>
            <div className="flex items-center gap-2">
              <span className="text-zinc-900 truncate max-w-[200px] text-[11px]">{loginUrl}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(loginUrl, 'url')}
                className="p-1 hover:bg-zinc-200 rounded text-zinc-600 cursor-pointer"
                title="Copy Login URL"
              >
                {copiedKey === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-zinc-500 font-sans">Studio ID:</span>
            <div className="flex items-center gap-2">
              <strong className="text-amber-800 font-bold">{data.studioId}</strong>
              <button
                type="button"
                onClick={() => copyToClipboard(data.studioId, 'id')}
                className="p-1 hover:bg-zinc-200 rounded text-zinc-600 cursor-pointer"
                title="Copy Studio ID"
              >
                {copiedKey === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-zinc-500 font-sans">Login ID:</span>
            <div className="flex items-center gap-2">
              <strong className="text-indigo-800 font-bold">{data.username}</strong>
              <button
                type="button"
                onClick={() => copyToClipboard(data.username, 'user')}
                className="p-1 hover:bg-zinc-200 rounded text-zinc-600 cursor-pointer"
                title="Copy Login ID"
              >
                {copiedKey === 'user' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-1.5 px-2.5 bg-amber-50/80 border border-amber-200/70 rounded-xl">
            <span className="text-amber-900 font-sans font-semibold">Temporary Password:</span>
            <div className="flex items-center gap-2">
              <strong className="text-amber-950 font-black tracking-wider text-xs bg-white px-2 py-0.5 rounded border border-amber-300">
                {data.temporaryPassword}
              </strong>
              <button
                type="button"
                onClick={() => copyToClipboard(data.temporaryPassword, 'pass')}
                className="p-1 hover:bg-amber-200 rounded text-amber-900 cursor-pointer"
                title="Copy Temporary Password"
              >
                {copiedKey === 'pass' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">
          <strong>Security note:</strong> For safety, this temporary password is shown once. The studio owner can sign in immediately and change their password anytime from Settings, or use Forgot Password on the login page.
        </p>

        {/* Action Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-sans">
          <button
            type="button"
            onClick={copyAllDetails}
            className="py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            {copiedKey === 'all' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedKey === 'all' ? 'All Details Copied!' : 'Copy All Login Details'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>Share via WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleSendResetEmail}
            disabled={sendingReset}
            className="py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer sm:col-span-2 disabled:opacity-50 border border-zinc-200"
          >
            <Mail className="w-4 h-4 text-zinc-600" />
            <span>{sendingReset ? 'Sending Reset Email...' : 'Send Password Reset Email to Owner'}</span>
          </button>
        </div>

        <p className="text-[10px] text-zinc-400 text-center font-sans">
          WhatsApp click-to-chat opens your WhatsApp client with the prefilled message. The administrator must press Send in WhatsApp.
        </p>
      </div>
    </div>
  );
};
