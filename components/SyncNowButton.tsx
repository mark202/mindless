'use client';

import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';

type SyncNowButtonProps = {
  className?: string;
};

type SyncStatus = 'idle' | 'pending' | 'success' | 'error';

const STORAGE_KEY = 'mindless-sync-token';

export function SyncNowButton({ className }: SyncNowButtonProps) {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [message, setMessage] = useState('');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setToken(sessionStorage.getItem(STORAGE_KEY));
  }, []);

  const requestToken = () => {
    const value = window.prompt('Enter sync token');
    if (!value) return null;
    sessionStorage.setItem(STORAGE_KEY, value);
    setToken(value);
    return value;
  };

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    if (status === 'pending') return;
    setStatus('pending');
    setMessage('');

    const usePrompt = event.shiftKey || !token;
    const activeToken = usePrompt ? requestToken() : token;
    if (!activeToken) {
      setStatus('idle');
      return;
    }

    try {
      const response = await fetch('/api/sync-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-token': activeToken
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        if (response.status === 401) {
          sessionStorage.removeItem(STORAGE_KEY);
          setToken(null);
        }
        setStatus('error');
        setMessage(data?.error ? `Sync failed: ${data.error}` : 'Sync failed.');
        return;
      }

      setStatus('success');
      setMessage('Sync queued. Data will refresh after the workflow completes.');
    } catch (error) {
      setStatus('error');
      setMessage('Sync failed. Please try again.');
    }
  };

  const buttonLabel = status === 'pending' ? 'Syncing…' : 'Sync now';

  return (
    <div className={`flex flex-col items-start gap-2 ${className ?? ''}`}>
      <button type="button" onClick={handleClick} className={`btn ${status === 'pending' ? 'cursor-wait opacity-70' : ''}`}>
        {buttonLabel}
      </button>
      {message && (
        <span className={`text-xs ${status === 'error' ? 'text-rose-300' : 'text-gray-300'}`} role="status">
          {message}
        </span>
      )}
    </div>
  );
}
