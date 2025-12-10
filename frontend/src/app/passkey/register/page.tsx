"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { base64urlToBuffer, bufferToBase64url } from '@/lib/webauthn';

export default function PasskeyRegisterPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Creating Passkey...');

  useEffect(() => {
    const run = async () => {
      try {
        const optsRes = await apiClient.get('/api/auth/passkey/register/options');
        const opts = optsRes.data;
        if (!opts || !opts.challenge) {
          setMessage('Unable to start registration');
          return;
        }

        const publicKey: any = {
          ...opts,
          challenge: base64urlToBuffer(opts.challenge),
          user: {
            ...opts.user,
            id: base64urlToBuffer(opts.user.id)
          }
        };
        if (opts.excludeCredentials && Array.isArray(opts.excludeCredentials)) {
          publicKey.excludeCredentials = opts.excludeCredentials.map((c: any) => ({
            ...c,
            id: base64urlToBuffer(c.id),
          }));
        }

        const cred: any = await navigator.credentials.create({ publicKey });

        // Build client response to send to server
        const clientDataJSON = bufferToBase64url(cred.response.clientDataJSON);
        const attestationObject = bufferToBase64url((cred as any).response.attestationObject);
        const rawId = bufferToBase64url(cred.rawId);

        await apiClient.post('/api/auth/passkey/register/verify', {
          id: cred.id,
          rawId,
          type: cred.type,
          response: {
            clientDataJSON,
            attestationObject
          }
        });

        router.push('/');
      } catch (err: any) {
        console.error('Passkey register failed', err);
        setMessage('Passkey creation failed');
      }
    };

    run();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500">
      <div className="glass-card p-8 w-full max-w-md text-center">
        <div className="text-6xl mb-4">🔐</div>
        <p className="text-white/70 mb-4">{message}</p>
        <div className="flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
        </div>
      </div>
    </div>
  );
}
