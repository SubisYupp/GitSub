'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Plus, Link as LinkIcon } from 'lucide-react';

interface URLInputProps {
  onParse: (url: string) => Promise<void>;
}

export default function URLInput({ onParse }: URLInputProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }
    
    setLoading(true);
    try {
      await onParse(url.trim());
      setUrl('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse URL');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <motion.form
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="w-full max-w-3xl mx-auto mb-8"
    >
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <LinkIcon className="w-5 h-5 text-zinc-400" />
        </div>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste problem URL (Codeforces, LeetCode, AtCoder, CodeChef)..."
          className="
            w-full pl-12 pr-32 py-4
            bg-white/5 backdrop-blur-xl
            border border-white/10 rounded-xl
            text-white placeholder-zinc-500
            focus:outline-none focus:ring-2 focus:ring-cyan-500/50
            transition-all
          "
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="
            absolute right-2 top-1/2 -translate-y-1/2
            px-6 py-2
            bg-gradient-to-r from-cyan-500 to-blue-500
            hover:from-cyan-400 hover:to-blue-400
            rounded-lg
            text-white font-medium
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all
            flex items-center gap-2
          "
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Parsing...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Add to Vault
            </>
          )}
        </button>
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-sm text-red-400"
        >
          {error}
        </motion.p>
      )}
    </motion.form>
  );
}

