'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { 
  Activity, 
  ArrowLeft, 
  ExternalLink, 
  List, 
  User,
  Clock,
  Tag,
  Loader2,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { ProblemMetadata, Codelist } from '@/lib/types';
import { getPlatformLogo } from '@/app/components/PlatformLogos';

interface SharedCodelist extends Codelist {
  ownerName?: string;
  problems: ProblemMetadata[];
  isPublic?: boolean;
}

// Platform colors and icons
const platformConfig: Record<string, { color: string; bgColor: string }> = {
  codeforces: { color: '#1890ff', bgColor: 'rgba(24, 144, 255, 0.1)' },
  leetcode: { color: '#ffa116', bgColor: 'rgba(255, 161, 22, 0.1)' },
  atcoder: { color: '#222', bgColor: 'rgba(34, 34, 34, 0.1)' },
  codechef: { color: '#5b4638', bgColor: 'rgba(91, 70, 56, 0.1)' },
};

export default function SharedCodelistPage() {
  const params = useParams();
  const router = useRouter();
  const [codelist, setCodelist] = useState<SharedCodelist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchCodelist = async () => {
      try {
        const response = await fetch(`/api/shared/${params.id}`);
        const data = await response.json();
        
        if (!response.ok || !data.success) {
          setError(data.error || 'Codelist not found');
          return;
        }
        
        setCodelist(data.data);
      } catch (err) {
        setError('Failed to load codelist');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchCodelist();
    }
  }, [params.id]);

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 text-zinc-400"
        >
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading codelist...</span>
        </motion.div>
      </div>
    );
  }

  if (error || !codelist) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Codelist Not Found</h1>
          <p className="text-zinc-400 mb-8">
            {error || 'This codelist may have been deleted or made private.'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to CPulse
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="relative">
                <Activity className="w-7 h-7 text-cyan-400" />
                <motion.div
                  className="absolute inset-0 bg-cyan-400/30 rounded-full blur-md"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <span className="text-xl font-bold text-white">CPulse</span>
            </Link>
            
            <motion.button
              onClick={copyShareLink}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Link</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Codelist Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-cyan-500/20 rounded-xl">
              <List className="w-8 h-8 text-cyan-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{codelist.name}</h1>
              {codelist.description && (
                <p className="text-zinc-400">{codelist.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Shared by {codelist.ownerName || 'Anonymous'}</span>
            </div>
            <div className="flex items-center gap-2">
              <List className="w-4 h-4" />
              <span>{codelist.problems.length} problems</span>
            </div>
          </div>
        </motion.div>

        {/* Problems List */}
        <div className="space-y-4">
          {codelist.problems.map((problem, index) => (
            <motion.div
              key={problem.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {(() => {
                      const Logo = getPlatformLogo(problem.platform);
                      return (
                        <span 
                          className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded capitalize"
                          style={{
                            color: platformConfig[problem.platform]?.color || '#888',
                            backgroundColor: platformConfig[problem.platform]?.bgColor || 'rgba(136, 136, 136, 0.1)',
                          }}
                        >
                          {Logo && <Logo className="w-3.5 h-3.5" />}
                          {problem.platform}
                        </span>
                      );
                    })()}
                    <span className="text-zinc-500 text-sm">{problem.problemId}</span>
                    {problem.difficulty && (
                      <span className="text-xs px-2 py-1 bg-zinc-800 text-zinc-400 rounded">
                        {problem.difficulty}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                    {problem.title}
                  </h3>
                  
                  {problem.tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="w-3 h-3 text-zinc-500" />
                      {problem.tags.slice(0, 5).map((tag, i) => (
                        <span key={i} className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                      {problem.tags.length > 5 && (
                        <span className="text-xs text-zinc-600">+{problem.tags.length - 5} more</span>
                      )}
                    </div>
                  )}
                </div>
                
                <a
                  href={problem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        {codelist.problems.length === 0 && (
          <div className="text-center py-16">
            <List className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500">This codelist is empty</p>
          </div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center py-8 border-t border-zinc-800"
        >
          <p className="text-zinc-400 mb-4">
            Want to track your own competitive programming journey?
          </p>
          <Link
            href="/landing"
            className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl transition-colors"
          >
            Get Started with CPulse
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
