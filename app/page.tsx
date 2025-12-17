'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import URLInput from './components/URLInput';
import ProblemCard from './components/ProblemCard';
import { ProblemWithDetails, Codelist, Platform, PLATFORMS } from '@/lib/types';
import { Activity, Sparkles, Filter, List, Plus, X, ChevronDown, Search, LayoutGrid, LayoutList } from 'lucide-react';

type SolvedFilter = 'all' | 'solved' | 'unsolved';
type ViewMode = 'grid' | 'list';

export default function Home() {
  const [problems, setProblems] = useState<ProblemWithDetails[]>([]);
  const [codelists, setCodelists] = useState<Codelist[]>([]);
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
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-black to-zinc-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">CPulse</h1>
              <p className="text-sm text-zinc-400">Track your competitive programming pulse</p>
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search problems..."
                className="pl-10 pr-4 py-2 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 w-64"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Filter Icon & Label */}
            <div className="flex items-center gap-2 text-zinc-400">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </div>
            
            {/* Platform Filter */}
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as Platform | 'all')}
              className="px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
            >
              <option value="all" className="bg-zinc-900">All Platforms</option>
              {PLATFORMS.map(p => (
                <option key={p} value={p} className="bg-zinc-900">
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
            
            {/* Solved Filter */}
            <select
              value={solvedFilter}
              onChange={(e) => setSolvedFilter(e.target.value as SolvedFilter)}
              className="px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
            >
              <option value="all" className="bg-zinc-900">All Status</option>
              <option value="solved" className="bg-zinc-900">Solved</option>
              <option value="unsolved" className="bg-zinc-900">Unsolved</option>
            </select>
            
            {/* Codelist Filter */}
            <select
              value={codelistFilter}
              onChange={(e) => setCodelistFilter(e.target.value)}
              className="px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
            >
              <option value="all" className="bg-zinc-900">All Codelists</option>
              {codelists.map(cl => (
                <option key={cl.id} value={cl.id} className="bg-zinc-900">
                  {cl.name} ({cl.problemIds.length})
                </option>
              ))}
            </select>
            
            {/* Clear Filters */}
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
            
            {/* Spacer */}
            <div className="flex-1" />
            
            {/* Codelist Management */}
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-400">Codelists:</span>
              
              {codelists.map(cl => (
                <button
                  key={cl.id}
                  onClick={() => window.location.href = `/codelists/${cl.id}`}
                  className="group flex items-center gap-1 px-3 py-1.5 bg-zinc-800/50 border border-white/10 rounded-lg text-sm text-white hover:bg-zinc-700/50 transition-colors"
                >
                  <span>{cl.name}</span>
                  <span className="text-zinc-500">({cl.problemIds.length})</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); handleDeleteCodelist(cl.id); }}
                    className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 hover:bg-red-500/20 rounded transition-all"
                  >
                    <X className="w-3 h-3 text-red-400" />
                  </span>
                </button>
              ))}
              
              {/* Create Codelist Button/Form */}
              {showCreateCodelist ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newCodelistName}
                    onChange={(e) => setNewCodelistName(e.target.value)}
                    placeholder="Codelist name..."
                    className="px-3 py-1.5 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 w-40"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateCodelist()}
                    autoFocus
                  />
                  <button
                    onClick={handleCreateCodelist}
                    disabled={creatingCodelist || !newCodelistName.trim()}
                    className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {creatingCodelist ? '...' : 'Add'}
                  </button>
                  <button
                    onClick={() => { setShowCreateCodelist(false); setNewCodelistName(''); }}
                    className="p-1.5 text-zinc-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreateCodelist(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-zinc-800/50 border border-dashed border-white/20 rounded-lg text-sm text-zinc-400 hover:text-white hover:border-white/40 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Results count and View Toggle */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-zinc-500">
            Showing {filteredProblems.length} of {problems.length} problems
          </span>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-white/10 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-cyan-500/20 text-cyan-400' 
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list' 
                  ? 'bg-cyan-500/20 text-cyan-400' 
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="List view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Problems Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            <p className="mt-4 text-zinc-400">Loading your vault...</p>
          </div>
        ) : filteredProblems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
                <button
                  onClick={clearAllFilters}
                  className="mt-4 px-4 py-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Clear all filters
                </button>
              </>
            )}
          </motion.div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProblems.map((problem) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                onDelete={handleDelete}
                codelists={codelists}
                onAddToCodelist={handleAddToCodelist}
                onRemoveFromCodelist={handleRemoveFromCodelist}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProblems.map((problem) => (
              <ProblemCard
                key={problem.id}
                problem={problem}
                onDelete={handleDelete}
                codelists={codelists}
                onAddToCodelist={handleAddToCodelist}
                onRemoveFromCodelist={handleRemoveFromCodelist}
                viewMode="list"
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
