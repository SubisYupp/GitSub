'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, List, Trash2, Edit2, Check, X } from 'lucide-react';
import ProblemCard from '@/app/components/ProblemCard';
import { ProblemWithDetails, Codelist } from '@/lib/types';

export default function CodelistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [codelist, setCodelist] = useState<Codelist | null>(null);
  const [allCodelists, setAllCodelists] = useState<Codelist[]>([]);
  const [problems, setProblems] = useState<ProblemWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch codelist
        const clRes = await fetch(`/api/codelists/${params.id}`);
        const clData = await clRes.json();
        
        if (clData.success) {
          setCodelist(clData.data);
          setEditName(clData.data.name);
          setEditDescription(clData.data.description || '');
        } else {
          router.push('/');
          return;
        }
        
        // Fetch all codelists for the cards
        const allClRes = await fetch('/api/codelists');
        const allClData = await allClRes.json();
        if (allClData.success) {
          setAllCodelists(allClData.data);
        }
        
        // Fetch all problems
        const probRes = await fetch('/api/problems');
        const probData = await probRes.json();
        
        if (probData.success) {
          // Filter to only problems in this codelist
          const codelistProblemIds = clData.data.problemIds;
          const filteredProblems = probData.data.filter(
            (p: ProblemWithDetails) => codelistProblemIds.includes(p.id)
          );
          setProblems(filteredProblems);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (params.id) {
      fetchData();
    }
  }, [params.id, router]);
  
  const handleRemoveFromCodelist = async (problemId: string) => {
    if (!codelist) return;
    
    try {
      const response = await fetch(
        `/api/codelists/${codelist.id}/problems?problemId=${problemId}`,
        { method: 'DELETE' }
      );
      
      if (response.ok) {
        // Update local state
        setProblems(problems.filter(p => p.id !== problemId));
        setCodelist({
          ...codelist,
          problemIds: codelist.problemIds.filter(id => id !== problemId),
        });
        setAllCodelists(allCodelists.map(cl => 
          cl.id === codelist.id 
            ? { ...cl, problemIds: cl.problemIds.filter(id => id !== problemId) }
            : cl
        ));
      }
    } catch (error) {
      console.error('Failed to remove problem:', error);
    }
  };
  
  const handleUpdateCodelist = async () => {
    if (!codelist || !editName.trim()) return;
    
    try {
      const response = await fetch(`/api/codelists/${codelist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: editName.trim(), 
          description: editDescription.trim() || undefined 
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setCodelist(data.data);
        setEditing(false);
      }
    } catch (error) {
      console.error('Failed to update codelist:', error);
    }
  };
  
  const handleDeleteCodelist = async () => {
    if (!codelist) return;
    if (!confirm('Are you sure you want to delete this codelist? Problems will not be deleted.')) return;
    
    try {
      const response = await fetch(`/api/codelists/${codelist.id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        router.push('/');
      }
    } catch (error) {
      console.error('Failed to delete codelist:', error);
    }
  };
  
  const handleAddToCodelist = async (problemId: string, codelistId: string) => {
    try {
      const response = await fetch(`/api/codelists/${codelistId}/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemId }),
      });
      
      if (response.ok) {
        // Refresh codelists
        const allClRes = await fetch('/api/codelists');
        const allClData = await allClRes.json();
        if (allClData.success) {
          setAllCodelists(allClData.data);
          const updated = allClData.data.find((c: Codelist) => c.id === codelist?.id);
          if (updated) setCodelist(updated);
        }
      }
    } catch (error) {
      console.error('Failed to add to codelist:', error);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          <p className="mt-4 text-zinc-400">Loading codelist...</p>
        </div>
      </div>
    );
  }
  
  if (!codelist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400">Codelist not found</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-cyan-400 hover:text-cyan-300"
          >
            Go back home
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Vault
          </button>
          
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/20 rounded-lg">
                <List className="w-6 h-6 text-cyan-400" />
              </div>
              
              {editing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-zinc-900 border border-white/20 rounded px-3 py-2 text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="block bg-zinc-900 border border-white/20 rounded px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 w-80"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleUpdateCodelist}
                      className="flex items-center gap-1 px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded text-sm hover:bg-cyan-500/30"
                    >
                      <Check className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setEditName(codelist.name);
                        setEditDescription(codelist.description || '');
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-zinc-800 text-zinc-400 rounded text-sm hover:bg-zinc-700"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-bold text-white">{codelist.name}</h1>
                  {codelist.description && (
                    <p className="text-zinc-400 mt-1">{codelist.description}</p>
                  )}
                  <p className="text-sm text-zinc-500 mt-2">
                    {problems.length} problem{problems.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>
            
            {!editing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleDeleteCodelist}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        {problems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <List className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400 text-lg">This codelist is empty</p>
            <p className="text-zinc-500 text-sm mt-2">
              Add problems from the vault by clicking the list icon on any problem card
            </p>
            <button
              onClick={() => router.push('/')}
              className="mt-6 px-6 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
            >
              Go to Vault
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {problems.map((problem) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                onDelete={() => handleRemoveFromCodelist(problem.id)}
                codelists={allCodelists}
                onAddToCodelist={handleAddToCodelist}
                onRemoveFromCodelist={(problemId, codelistId) => {
                  if (codelistId === codelist.id) {
                    handleRemoveFromCodelist(problemId);
                  } else {
                    // Remove from other codelist
                    fetch(`/api/codelists/${codelistId}/problems?problemId=${problemId}`, {
                      method: 'DELETE',
                    }).then(() => {
                      setAllCodelists(allCodelists.map(cl =>
                        cl.id === codelistId
                          ? { ...cl, problemIds: cl.problemIds.filter(id => id !== problemId) }
                          : cl
                      ));
                    });
                  }
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
