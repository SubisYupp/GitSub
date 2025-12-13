'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import URLInput from './components/URLInput';
import ProblemCard from './components/ProblemCard';
import { ProblemWithDetails } from '@/lib/types';
import { Code2, Sparkles } from 'lucide-react';

export default function Home() {
  const [problems, setProblems] = useState<ProblemWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchProblems = async () => {
    try {
      const response = await fetch('/api/problems');
      const data = await response.json();
      if (data.success) {
        setProblems(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch problems:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchProblems();
  }, []);
  
  const handleParse = async (url: string) => {
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh the problems list
        await fetchProblems();
        // If it's a duplicate, the message is already in data.message
        // The problem was successfully handled (either added or found existing)
      } else {
        throw new Error(data.error || 'Failed to parse problem');
      }
    } catch (error) {
      throw error;
    }
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this problem?')) return;
    
    try {
      const response = await fetch(`/api/problems/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchProblems();
      }
    } catch (error) {
      console.error('Failed to delete problem:', error);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
              <Code2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">CodeVault</h1>
              <p className="text-sm text-zinc-400">Your Competitive Programming Archive</p>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            <h2 className="text-4xl font-bold text-white">
              Archive Your Favorite Problems
            </h2>
          </div>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Paste a problem URL from Codeforces, LeetCode, AtCoder, or CodeChef
            and automatically extract all the details into your personal vault.
          </p>
        </motion.div>
        
        {/* URL Input */}
        <URLInput onParse={handleParse} />
        
        {/* Problems Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            <p className="mt-4 text-zinc-400">Loading your vault...</p>
          </div>
        ) : problems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Code2 className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400 text-lg">Your vault is empty</p>
            <p className="text-zinc-500 text-sm mt-2">
              Add your first problem to get started!
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {problems.map((problem) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
