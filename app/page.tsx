'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import URLInput from './components/URLInput';
import ProblemCard from './components/ProblemCard';
import AnimatedDropdown from './components/AnimatedDropdown';
import { CodeforcesLogo, LeetCodeLogo, AtCoderLogo, CodeChefLogo } from './components/PlatformLogos';
import { ProblemWithDetails, Codelist, Platform, PLATFORMS } from '@/lib/types';
import { Activity, Sparkles, Filter, List, Plus, X, ChevronDown, Search, LayoutGrid, LayoutList, Share2, Copy, Check, LogIn, LogOut, User } from 'lucide-react';
import { useAuth } from './providers';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type SolvedFilter = 'all' | 'solved' | 'unsolved';
type ViewMode = 'grid' | 'list';

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [problems, setProblems] = useState<ProblemWithDetails[]>([]);
  const [codelists, setCodelists] = useState<(Codelist & { isPublic?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  
  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [solvedFilter, setSolvedFilter] = useState<SolvedFilter>('all');
  const [codelistFilter, setCodelistFilter] = useState<string>('all');
  
  // Codelist creation
  const [showCreateCodelist, setShowCreateCodelist] = useState(false);
  const [newCodelistName, setNewCodelistName] = useState('');
  const [creatingCodelist, setCreatingCodelist] = useState(false);
  
  // Share modal
  const [sharingCodelistId, setSharingCodelistId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  
  // Redirect to landing page if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/landing');
    }
  }, [authLoading, user, router]);

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
  
  const fetchCodelists = async () => {
    try {
      const response = await fetch('/api/codelists');
      const data = await response.json();
      if (data.success) {
        setCodelists(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch codelists:', error);
    }
  };
  
  useEffect(() => {
    fetchProblems();
    fetchCodelists();
  }, []);
  
  // Filter problems based on selected filters
  const filteredProblems = useMemo(() => {
    return problems.filter(problem => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = problem.title.toLowerCase().includes(query);
        const matchesId = problem.problemId.toLowerCase().includes(query);
        const matchesTags = problem.tags?.some(tag => tag.toLowerCase().includes(query));
        if (!matchesTitle && !matchesId && !matchesTags) {
          return false;
        }
      }
      
      // Platform filter
      if (platformFilter !== 'all' && problem.platform !== platformFilter) {
        return false;
      }
      
      // Solved filter
      if (solvedFilter === 'solved' && !problem.solution?.solved) {
        return false;
      }
      if (solvedFilter === 'unsolved' && problem.solution?.solved) {
        return false;
      }
      
      // Codelist filter
      if (codelistFilter !== 'all') {
        const codelist = codelists.find(c => c.id === codelistFilter);
        if (!codelist || !codelist.problemIds.includes(problem.id)) {
          return false;
        }
      }
      
      return true;
    });
  }, [problems, codelists, searchQuery, platformFilter, solvedFilter, codelistFilter]);
  
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
        await fetchCodelists(); // Refresh codelists as problem might have been in one
      }
    } catch (error) {
      console.error('Failed to delete problem:', error);
    }
  };
  
  const handleCreateCodelist = async () => {
    if (!newCodelistName.trim()) return;
    
    setCreatingCodelist(true);
    try {
      const response = await fetch('/api/codelists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCodelistName.trim() }),
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchCodelists();
        setNewCodelistName('');
        setShowCreateCodelist(false);
      }
    } catch (error) {
      console.error('Failed to create codelist:', error);
    } finally {
      setCreatingCodelist(false);
    }
  };
  
  const handleDeleteCodelist = async (id: string) => {
    if (!confirm('Are you sure you want to delete this codelist?')) return;
    
    try {
      const response = await fetch(`/api/codelists/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchCodelists();
        if (codelistFilter === id) {
          setCodelistFilter('all');
        }
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
        await fetchCodelists();
      }
    } catch (error) {
      console.error('Failed to add problem to codelist:', error);
    }
  };
  
  const handleRemoveFromCodelist = async (problemId: string, codelistId: string) => {
    try {
      const response = await fetch(`/api/codelists/${codelistId}/problems?problemId=${problemId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await fetchCodelists();
      }
    } catch (error) {
      console.error('Failed to remove problem from codelist:', error);
    }
  };
  
  const handleShareCodelist = async (codelistId: string, isCurrentlyPublic: boolean) => {
    try {
      const response = await fetch(`/api/codelists/${codelistId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !isCurrentlyPublic }),
      });
      
      const data = await response.json();
      if (data.success) {
        await fetchCodelists();
        if (!isCurrentlyPublic) {
          setShareUrl(data.data.shareUrl);
          setSharingCodelistId(codelistId);
        }
      }
    } catch (error) {
      console.error('Failed to share codelist:', error);
    }
  };
  
  const copyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };
  
  const activeFiltersCount = 
    (searchQuery.trim() ? 1 : 0) +
    (platformFilter !== 'all' ? 1 : 0) + 
    (solvedFilter !== 'all' ? 1 : 0) + 
    (codelistFilter !== 'all' ? 1 : 0);
  
  const clearAllFilters = () => {
    setSearchQuery('');
    setPlatformFilter('all');
    setSolvedFilter('all');
    setCodelistFilter('all');
  };
  
  // Show loading while checking auth or redirecting
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Activity className="w-12 h-12 text-cyan-400" />
          <p className="text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900">
      {/* Share Modal */}
      <AnimatePresence>
        {sharingCodelistId && shareUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSharingCodelistId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-white mb-2">Share Codelist</h3>
              <p className="text-zinc-400 text-sm mb-4">Anyone with this link can view your codelist</p>
              
              <div className="flex items-center gap-2 p-3 bg-zinc-800 rounded-lg mb-4">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-transparent text-white text-sm outline-none"
                />
                <button
                  onClick={copyShareUrl}
                  className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  {copiedShare ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-zinc-400" />
                  )}
                </button>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setSharingCodelistId(null)}
                  className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">CPulse</h1>
                <p className="text-sm text-zinc-400">Track your competitive programming pulse</p>
              </div>
            </div>
            
            {/* Auth buttons */}
            <div className="flex items-center gap-3">
              {authLoading ? (
                <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 rounded-lg">
                    <User className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-zinc-300">{user.email?.split('@')[0]}</span>
                  </div>
                  <button
                    onClick={signOut}
                    className="flex items-center gap-2 px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Sign Out</span>
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-medium rounded-lg transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="text-sm">Sign In</span>
                </Link>
              )}
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
            and automatically track your progress.
          </p>
        </motion.div>
        
        {/* URL Input */}
        <URLInput onParse={handleParse} />
        
        {/* Filters Section */}
        <div className="mt-12 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search Input */}
            <motion.div 
              className="relative"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search problems..."
                className="pl-10 pr-4 py-2 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 w-64 transition-all duration-200 focus:w-80"
              />
              <AnimatePresence>
                {searchQuery && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
            
            {/* Filter Icon & Label */}
            <motion.div 
              className="flex items-center gap-2 text-zinc-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters</span>
              <AnimatePresence mode="wait">
                {activeFiltersCount > 0 && (
                  <motion.span 
                    key={activeFiltersCount}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.2, type: "spring", stiffness: 500 }}
                    className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full"
                  >
                    {activeFiltersCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
            
            {/* Platform Filter */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
            >
              <AnimatedDropdown
                options={[
                  { value: 'all', label: 'All Platforms' },
                  ...PLATFORMS.map(p => ({ 
                    value: p, 
                    label: p.charAt(0).toUpperCase() + p.slice(1) 
                  }))
                ]}
                value={platformFilter}
                onChange={(value) => setPlatformFilter(value as Platform | 'all')}
              />
            </motion.div>
            
            {/* Solved Filter */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <AnimatedDropdown
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'solved', label: 'Solved' },
                  { value: 'unsolved', label: 'Unsolved' },
                ]}
                value={solvedFilter}
                onChange={(value) => setSolvedFilter(value as SolvedFilter)}
              />
            </motion.div>
            
            {/* Codelist Filter */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
            >
              <AnimatedDropdown
                options={[
                  { value: 'all', label: 'All Codelists' },
                  ...codelists.map(cl => ({ 
                    value: cl.id, 
                    label: `${cl.name} (${cl.problemIds.length})` 
                  }))
                ]}
                value={codelistFilter}
                onChange={setCodelistFilter}
              />
            </motion.div>
            
            {/* Clear Filters */}
            <AnimatePresence>
              {activeFiltersCount > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -10 }}
                  transition={{ duration: 0.2 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={clearAllFilters}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear
                </motion.button>
              )}
            </AnimatePresence>
            
            {/* Spacer */}
            <div className="flex-1" />
            
            {/* Codelist Management */}
            <motion.div 
              className="flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <List className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-400">Codelists:</span>
              
              <AnimatePresence mode="popLayout">
                {codelists.map((cl, idx) => (
                  <motion.div
                    key={cl.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -10 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    className="group flex items-center gap-1 px-3 py-1.5 bg-zinc-800/50 border border-white/10 rounded-lg text-sm text-white hover:bg-zinc-700/50 hover:border-white/20 transition-colors"
                  >
                    <button
                      onClick={() => window.location.href = `/codelists/${cl.id}`}
                      className="flex items-center gap-1"
                    >
                      <span>{cl.name}</span>
                      <span className="text-zinc-500">({cl.problemIds.length})</span>
                    </button>
                    {cl.isPublic && (
                      <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 rounded">
                        Public
                      </span>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); handleShareCodelist(cl.id, cl.isPublic || false); }}
                      className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 hover:bg-cyan-500/20 rounded transition-all"
                      title={cl.isPublic ? 'Make Private' : 'Share Codelist'}
                    >
                      <Share2 className="w-3 h-3 text-cyan-400" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); handleDeleteCodelist(cl.id); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/20 rounded transition-all"
                    >
                      <X className="w-3 h-3 text-red-400" />
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Create Codelist Button/Form */}
              <AnimatePresence mode="wait">
                {showCreateCodelist ? (
                  <motion.div 
                    key="form"
                    initial={{ opacity: 0, scale: 0.9, width: 0 }}
                    animate={{ opacity: 1, scale: 1, width: 'auto' }}
                    exit={{ opacity: 0, scale: 0.9, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 overflow-hidden"
                  >
                    <input
                      type="text"
                      value={newCodelistName}
                      onChange={(e) => setNewCodelistName(e.target.value)}
                      placeholder="Codelist name..."
                      className="px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 w-40"
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateCodelist()}
                      autoFocus
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCreateCodelist}
                      disabled={creatingCodelist || !newCodelistName.trim()}
                      className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {creatingCodelist ? (
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                        >
                          ...
                        </motion.span>
                      ) : 'Add'}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => { setShowCreateCodelist(false); setNewCodelistName(''); }}
                      className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="button"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ scale: 1.05, borderColor: 'rgba(255,255,255,0.4)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowCreateCodelist(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800/50 border border-dashed border-white/20 rounded-lg text-sm text-zinc-400 hover:text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    New
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
        
        {/* Results count and View Toggle */}
        <div className="mb-4 flex items-center justify-between">
          <motion.span 
            key={`${filteredProblems.length}-${problems.length}`}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-zinc-500"
          >
            Showing {filteredProblems.length} of {problems.length} problems
          </motion.span>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-white/10 rounded-lg p-1 relative">
            {/* Sliding background indicator */}
            <motion.div
              layout
              className="absolute inset-y-1 w-[calc(50%-2px)] bg-cyan-500/20 rounded"
              animate={{ x: viewMode === 'grid' ? 0 : '100%' }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('grid')}
              className={`relative z-10 p-2 rounded transition-colors ${
                viewMode === 'grid' 
                  ? 'text-cyan-400' 
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('list')}
              className={`relative z-10 p-2 rounded transition-colors ${
                viewMode === 'list' 
                  ? 'text-cyan-400' 
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="List view"
            >
              <LayoutList className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
        
        {/* Problems Grid */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <p className="mt-4 text-zinc-400">Loading your vault...</p>
            </motion.div>
          ) : filteredProblems.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="text-center py-20"
            >
              <Activity className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              {problems.length === 0 ? (
                <>
                  <p className="text-zinc-400 text-lg">No problems yet</p>
                  <p className="text-zinc-500 text-sm mt-2">
                    Add your first problem to start tracking!
                  </p>
                </>
              ) : (
                <>
                  <p className="text-zinc-400 text-lg">No problems match your filters</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={clearAllFilters}
                    className="mt-4 px-4 py-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Clear all filters
                  </motion.button>
                </>
              )}
            </motion.div>
          ) : viewMode === 'grid' ? (
          <motion.div 
            key={`grid-${platformFilter}-${solvedFilter}-${codelistFilter}-${searchQuery}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredProblems.map((problem, index) => (
                <ProblemCard
                  key={problem.id}
                  problem={problem}
                  onDelete={handleDelete}
                  codelists={codelists}
                  onAddToCodelist={handleAddToCodelist}
                  onRemoveFromCodelist={handleRemoveFromCodelist}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div 
            key={`list-${platformFilter}-${solvedFilter}-${codelistFilter}-${searchQuery}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-2"
          >
            <AnimatePresence mode="popLayout">
              {filteredProblems.map((problem, index) => (
                <ProblemCard
                  key={problem.id}
                  problem={problem}
                  onDelete={handleDelete}
                  codelists={codelists}
                  onAddToCodelist={handleAddToCodelist}
                  onRemoveFromCodelist={handleRemoveFromCodelist}
                  viewMode="list"
                  index={index}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
        </AnimatePresence>
      </main>
    </div>
  );
}
