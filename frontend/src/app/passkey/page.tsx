"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/api';
import { base64urlToBuffer, bufferToBase64url } from '@/lib/webauthn';

export default function PasskeyLoginPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'waiting' | 'success' | 'failed' | 'idle'>('idle');
  const [message, setMessage] = useState('Waiting for Passkey...');

  useEffect(() => {
    const run = async () => {
      setStatus('waiting');
      try {
        const optsRes = await apiClient.get('/api/auth/passkey/login/options');
        const opts = optsRes.data;
        if (!opts || !opts.challenge) {
          // No credentials available, fallback to password page
          router.push('/login');
          return;
        }

        const publicKey: any = {
          ...opts,
          challenge: base64urlToBuffer(opts.challenge),
          allowCredentials: opts.allowCredentials.map((c: any) => ({
            ...c,
            id: base64urlToBuffer(c.id)
          }))
        };

        const assertion: any = await navigator.credentials.get({ publicKey });
        // Build response
        const clientDataJSON = bufferToBase64url(assertion.response.clientDataJSON);
        const authenticatorData = bufferToBase64url(assertion.response.authenticatorData);
        const signature = bufferToBase64url(assertion.response.signature);
        const userHandle = assertion.response.userHandle ? bufferToBase64url(assertion.response.userHandle) : null;
        const rawId = bufferToBase64url(assertion.rawId);

        const res = await apiClient.post('/api/auth/passkey/login/verify', {
          id: assertion.id,
          rawId,
          type: assertion.type,
          response: {
            clientDataJSON,
            authenticatorData,
            signature,
            userHandle
          }
        });

        const token = res.data.token;
        if (token) {
          localStorage.setItem('cloud_storage_token', token);
          setStatus('success');
          // Redirect to home
          router.push('/');
        } else {
          setStatus('failed');
          setMessage('Authentication failed');
        }
      } catch (err: any) {
        setStatus('failed');
        setMessage(err?.message || 'Passkey authentication failed');
      }
    };

    run();
  }, [router]);

  const handleRetry = () => {
    setStatus('idle');
    setMessage('Retrying...');
    // re-run effect by changing state
    window.location.reload();
  };

  const goToPassword = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 w-full max-w-md text-center"
      >
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-xl text-white font-semibold mb-2">Passkey Login</h2>
        <p className="text-white/70 mb-6">{message}</p>

        {status === 'waiting' && (
          <button className="glass-button px-4 py-2 text-white/90" disabled>
            Waiting for Passkey...
          </button>
        )}

        {status === 'failed' && (
          <div className="flex items-center justify-center space-x-3">
            <button onClick={handleRetry} className="glass-button px-4 py-2 text-white">Retry Passkey</button>
            <button onClick={goToPassword} className="glass-button px-4 py-2 text-white/70">Use Password</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
