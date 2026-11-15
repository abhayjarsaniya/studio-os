import React, { useState, useEffect } from 'react';
import { firestoreService, SaveStatus } from '../../services/firestoreService';
import { CheckCircle2, Loader2, CloudOff, AlertCircle, RefreshCw } from 'lucide-react';

export const SaveIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const unsub = firestoreService.subscribeSaveStatus((newStatus, msg) => {
      setStatus(newStatus);
      if (msg) setMessage(msg);
    });
    return unsub;
  }, []);

  const handleRetry = () => {
    firestoreService.retryPendingQueue();
  };

  if (status === 'idle') {
    return null;
  }

  return (
    <div 
      onClick={status === 'error' || status === 'offline' ? handleRetry : undefined}
      title={status === 'error' || status === 'offline' ? 'Click to retry cloud synchronization' : message}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all animate-in fade-in duration-200 select-none ${
        status === 'saving' 
          ? 'bg-amber-50 text-amber-800 border border-amber-200'
          : status === 'saved'
          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          : status === 'offline'
          ? 'bg-zinc-100 text-zinc-600 border border-zinc-200 cursor-pointer hover:bg-zinc-200/80'
          : 'bg-rose-50 text-rose-800 border border-rose-200 cursor-pointer hover:bg-rose-100'
      } ${className}`}
    >
      {status === 'saving' && (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
          <span>Saving...</span>
        </>
      )}

      {status === 'saved' && (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Saved</span>
        </>
      )}

      {status === 'offline' && (
        <>
          <CloudOff className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          <span>Local backup active</span>
        </>
      )}

      {status === 'error' && (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Sync pending — click to retry</span>
        </>
      )}
    </div>
  );
};
