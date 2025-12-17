'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Activity } from 'lucide-react';
import ProblemStatement from '@/app/components/ProblemStatement';
import CodeEditor from '@/app/components/CodeEditor';
import NotesEditor from '@/app/components/NotesEditor';
import { ProblemWithDetails } from '@/lib/types';

export default function ProblemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [problem, setProblem] = useState<ProblemWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [solved, setSolved] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingSolution, setSavingSolution] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const response = await fetch(`/api/problems/${params.id}`);
        const data = await response.json();
        
        if (data.success) {
          const prob = data.data;
          setProblem(prob);
          setCode(prob.solution?.code || '');
          setLanguage(prob.solution?.language || 'cpp');
          setSolved(prob.solution?.solved || false);
          setNotes(prob.notes?.content || '');
        }
      } catch (error) {
        console.error('Failed to fetch problem:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (params.id) {
      fetchProblem();
    }
  }, [params.id]);
  
  const handleSaveSolution = async () => {
    if (!problem) return;
    
    setSavingSolution(true);
    try {
      const response = await fetch('/api/solutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem.id,
          code,
          language,
          solved,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        // Update local state
        setProblem((prev) => prev ? {
          ...prev,
          solution: data.data,
        } : null);
      }
    } catch (error) {
      console.error('Failed to save solution:', error);
    } finally {
      setSavingSolution(false);
    }
  };
  
  const handleSaveNotes = async () => {
    if (!problem) return;
    
    setSavingNotes(true);
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: problem.id,
          content: notes,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setProblem((prev) => prev ? {
          ...prev,
          notes: data.data,
        } : null);
      }
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setSavingNotes(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          <p className="mt-4 text-zinc-400">Loading problem...</p>
        </div>
      </div>
    );
  }
  
  if (!problem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 text-lg">Problem not found</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-cyan-400 hover:text-cyan-300"
          >
            Go back to vault
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Vault
            </button>
            
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-white line-clamp-1">
                {problem.title}
              </h1>
              <a
                href={problem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ExternalLink className="w-5 h-5 text-zinc-400" />
              </a>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content - Split Screen */}
      <main className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-120px)]">
          {/* Left Side - Problem Statement */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="
              bg-zinc-900/30 backdrop-blur-xl rounded-lg border border-white/10
              p-6 overflow-y-auto
            "
          >
            <ProblemStatement content={problem.description} />
            
            {/* Sample Tests */}
            {problem.sampleTests.length > 0 && (
              <div className="mt-8 space-y-4">
                <h3 className="text-xl font-semibold text-white mb-4">Sample Tests</h3>
                {problem.sampleTests.map((test, idx) => (
                  <div
                    key={idx}
                    className="bg-zinc-900/50 rounded-lg p-4 border border-white/10"
                  >
                    <div className="mb-3">
                      <p className="text-sm font-medium text-zinc-400 mb-2">Input:</p>
                      <pre className="text-sm text-zinc-300 bg-black/50 p-3 rounded overflow-x-auto whitespace-pre-wrap font-mono">
{test.input}
                      </pre>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-400 mb-2">Output:</p>
                      <pre className="text-sm text-zinc-300 bg-black/50 p-3 rounded overflow-x-auto whitespace-pre-wrap font-mono">
{test.output}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
          
          {/* Right Side - Code Editor and Notes */}
          <div className="flex flex-col gap-6">
            {/* Code Editor */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1 min-h-0"
            >
              <CodeEditor
                code={code}
                language={language}
                solved={solved}
                onCodeChange={setCode}
                onLanguageChange={setLanguage}
                onSolvedChange={setSolved}
                onSave={handleSaveSolution}
                saving={savingSolution}
              />
            </motion.div>
            
            {/* Notes Editor */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="h-64"
            >
              <NotesEditor
                content={notes}
                onContentChange={setNotes}
                onSave={handleSaveNotes}
                saving={savingNotes}
              />
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}

