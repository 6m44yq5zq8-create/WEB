'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import { base64urlToBuffer, strToBuffer, bufferToBase64url } from '@/lib/webauthn';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    // Auto-detect passkey existence in backend
    const checkPasskey = async () => {
      try {
        const res = await apiClient.get('/api/auth/passkey/exists');
        if (res.data?.exists && window.PublicKeyCredential) {
          router.push('/passkey');
        }
      } catch (e) {
        // ignore
      }
    };
    checkPasskey();
  }, [router]);

  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);

  const handleCreatePasskey = async () => {
    try {
      // Get registration options from the server
      const optionsRes = await apiClient.get('/api/auth/passkey/register/options');
      const opts = optionsRes.data;

      const publicKey: any = {
        ...opts,
        challenge: base64urlToBuffer(opts.challenge),
        user: {
          ...opts.user,
          id: base64urlToBuffer(opts.user.id)
        }
      };

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

      setShowRegisterPrompt(false);
      // Redirect to home after registration
      router.push('/');
    } catch (err: any) {
      console.error('Passkey registration failed', err);
      alert('Failed to register passkey');
    }
  };

  const handleCancelRegister = () => {
    setShowRegisterPrompt(false);
    router.push('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(password, false);
      setIsLoading(false);
      // Prompt user to register a passkey
      if (window.PublicKeyCredential) {
        setShowRegisterPrompt(true);
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid password');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-card p-8 w-full max-w-md"
      >
        <motion.div
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <div className="text-6xl mb-4">☁️</div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Personal Cloud Storage
          </h1>
          <p className="text-white/70">
            Enter your password to access your files
          </p>
        </motion.div>

        <motion.form
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-white mb-2"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-xl transition-all"
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-100 text-sm"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            type="submit"
            disabled={isLoading}
            className="w-full glass-button text-white font-semibold"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                Logging in...
              </div>
            ) : (
              'Login'
            )}
          </motion.button>
        </motion.form>

        {showRegisterPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white/5 p-6 rounded-lg glass-card w-full max-w-md">
              <h3 className="text-white text-lg font-semibold mb-2">Create a Passkey?</h3>
              <p className="text-white/70 mb-4">Would you like to create a Passkey for this device to enable quick passwordless login next time?</p>
              <div className="flex items-center justify-end space-x-3">
                <button onClick={handleCancelRegister} className="glass-button px-4 py-2 text-white/70">Skip</button>
                <button onClick={handleCreatePasskey} className="glass-button px-4 py-2 text-white">Create Passkey</button>
              </div>
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center text-white/50 text-sm"
        >
          Secured with JWT authentication
        </motion.div>
      </motion.div>
    </div>
  );
}
