"use client";

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function ManagePasskeys() {
  const { isAuthenticated } = useAuth();
  const [creds, setCreds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/auth/passkey/list');
      setCreds(res.data || []);
    } catch (e) {
      console.error('Failed to fetch creds', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (credential_id: string) => {
    if (!confirm('Delete this Passkey?')) return;
    try {
      await apiClient.delete(`/api/auth/passkey/${encodeURIComponent(credential_id)}`);
      fetchList();
    } catch (e) {
      alert('Failed to delete passkey');
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Passkeys</h2>
      {loading && <div>Loading...</div>}
      {!loading && creds.length === 0 && <div>No passkeys registered.</div>}
      <ul className="space-y-2">
        {creds.map((c) => (
          <li key={c.credential_id} className="flex items-center justify-between bg-white/5 p-3 rounded">
            <div>
              <div className="text-sm text-white">{c.credential_id}</div>
              <div className="text-xs text-white/60">{c.created_at}</div>
            </div>
            <div>
              <button onClick={() => handleDelete(c.credential_id)} className="glass-button text-sm">Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
