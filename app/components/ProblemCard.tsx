'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProblemWithDetails, Codelist } from '@/lib/types';
import { CheckCircle2, Circle, Trash2, List, Check, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getPlatformLogo } from './PlatformLogos';

interface ProblemCardProps {
  problem: ProblemWithDetails;
  onDelete?: (id: string) => void;
  codelists?: Codelist[];
  onAddToCodelist?: (problemId: string, codelistId: string) => void;
  onRemoveFromCodelist?: (problemId: string, codelistId: string) => void;
  viewMode?: 'grid' | 'list';
  index?: number;
}

const platformTheme = {
  codeforces: {
    bg: 'bg-blue-500/5',
    border: 'border-blue-500/30',
    hoverBorder: 'hover:border-blue-500/60',
    text: 'text-blue-400',
    glow: 'hover:shadow-blue-500/10',
  },
  leetcode: {
    bg: 'bg-orange-500/5',
    border: 'border-orange-500/30',
    hoverBorder: 'hover:border-orange-500/60',
    text: 'text-orange-400',
    glow: 'hover:shadow-orange-500/10',
  },
  atcoder: {
    bg: 'bg-green-500/5',
    border: 'border-green-500/30',
    hoverBorder: 'hover:border-green-500/60',
    text: 'text-green-400',
    glow: 'hover:shadow-green-500/10',
  },
  codechef: {
    bg: 'bg-purple-500/5',
    border: 'border-purple-500/30',
    hoverBorder: 'hover:border-purple-500/60',
    text: 'text-purple-400',
    glow: 'hover:shadow-purple-500/10',
  },
};

const platformLabels = {
  codeforces: 'Codeforces',
  leetcode: 'LeetCode',
  atcoder: 'AtCoder',
  codechef: 'CodeChef',
};

export default function ProblemCard({ 
  problem, 
  onDelete,
  codelists = [],
  onAddToCodelist,
  onRemoveFromCodelist,
  viewMode = 'grid',
  index = 0,
}: ProblemCardProps) {
  const router = useRouter();
  const theme = platformTheme[problem.platform];
  const [showCodelistMenu, setShowCodelistMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Find which codelists this problem belongs to
  const problemCodelists = codelists.filter(cl => cl.problemIds.includes(problem.id));
  
  const handleClick = () => {
    router.push(`/problems/${problem.id}`);
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(problem.id);
    }
  };
  
  const handleCodelistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCodelistMenu(!showCodelistMenu);
  };
  
  const handleCodelistAction = (e: React.MouseEvent, codelistId: string, isInCodelist: boolean) => {
    e.stopPropagation();
    if (isInCodelist) {
      onRemoveFromCodelist?.(problem.id, codelistId);
    } else {
      onAddToCodelist?.(problem.id, codelistId);
    }
  };

  // List View
  if (viewMode === 'list') {
    return (
      <motion.div
        layout="position"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ 
          duration: 0.2,
          delay: Math.min(index * 0.02, 0.15), // Cap max delay at 150ms
          ease: [0.25, 0.1, 0.25, 1]
        }}
        whileHover={{ 
          x: 4,
          transition: { duration: 0.15 }
        }}
        whileTap={{ scale: 0.995 }}
        className={`
          relative group cursor-pointer
          ${theme.bg} backdrop-blur-sm
          border ${theme.border} ${theme.hoverBorder}
          rounded-lg px-4 py-3
          transition-all duration-200
          hover:shadow-lg ${theme.glow}
          flex items-center gap-4
        `}
        onClick={handleClick}
      >
        {/* Platform badge */}
        {(() => {
          const Logo = getPlatformLogo(problem.platform);
          return (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${theme.text} ${theme.bg} border ${theme.border} min-w-[100px]`}>
              {Logo && <Logo className="w-3.5 h-3.5" />}
              {platformLabels[problem.platform]}
            </div>
          );
        })()}
        
        {/* Problem ID */}
        <span className="text-zinc-500 text-sm font-mono min-w-[80px]">
          {problem.problemId}
        </span>
        
        {/* Problem title */}
        <h3 className="text-white font-medium flex-1 truncate">
          {problem.title}
        </h3>
        
        {/* Codelist badges */}
        <div className="flex items-center gap-1">
          {problemCodelists.slice(0, 2).map(cl => (
            <span 
              key={cl.id}
              className="px-1.5 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded"
            >
              {cl.name}
            </span>
          ))}
          {problemCodelists.length > 2 && (
            <span className="text-xs text-zinc-500">+{problemCodelists.length - 2}</span>
          )}
        </div>
        
        {/* Solved indicator */}
        <div className="flex items-center gap-1.5 min-w-[80px]">
          {problem.solution?.solved ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400">Solved</span>
            </>
          ) : (
            <>
              <Circle className="w-4 h-4 text-zinc-500" />
              <span className="text-xs text-zinc-500">Unsolved</span>
            </>
          )}
        </div>
        
        {/* Codelist button */}
        {codelists.length > 0 && (
          <div className="relative">
            <button
              onClick={handleCodelistToggle}
              className={`
                p-1.5 rounded transition-all
                ${showCodelistMenu || problemCodelists.length > 0
                  ? 'bg-cyan-500/20'
                  : 'opacity-0 group-hover:opacity-100 hover:bg-white/10'
                }
              `}
            >
              <List className={`w-4 h-4 ${problemCodelists.length > 0 ? 'text-cyan-400' : 'text-zinc-400'}`} />
            </button>
            
            {/* Codelist Dropdown */}
            <AnimatePresence>
              {showCodelistMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute top-8 right-0 z-20 w-48 py-1 bg-zinc-900 border border-white/10 rounded-lg shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-3 py-2 text-xs text-zinc-500 uppercase tracking-wide border-b border-white/10">
                    Add to Codelist
                  </div>
                  {codelists.map((cl, idx) => {
                    const isInCodelist = cl.problemIds.includes(problem.id);
                    return (
                      <motion.button
                        key={cl.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={(e) => handleCodelistAction(e, cl.id, isInCodelist)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors"
                      >
                        <motion.span
                          initial={false}
                          animate={{ scale: isInCodelist ? 1 : 0.8, opacity: isInCodelist ? 1 : 0.5 }}
                          transition={{ duration: 0.15 }}
                        >
                          {isInCodelist ? (
                            <Check className="w-4 h-4 text-cyan-400" />
                          ) : (
                            <Plus className="w-4 h-4 text-zinc-500" />
                          )}
                        </motion.span>
                        <span className={isInCodelist ? 'text-cyan-400' : 'text-white'}>
                          {cl.name}
                        </span>
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        
        {/* Delete button */}
        {onDelete && (
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-500/20 rounded"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        )}
      </motion.div>
    );
  }

  // Grid View (default)
  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        duration: 0.25,
        delay: Math.min(index * 0.03, 0.2), // Cap max delay at 200ms
        ease: [0.25, 0.1, 0.25, 1]
      }}
      whileHover={{ 
        y: -4,
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative group cursor-pointer
        ${theme.bg} backdrop-blur-sm
        border ${theme.border} ${theme.hoverBorder}
        rounded-lg p-4
        transition-all duration-200
        hover:shadow-lg ${theme.glow}
      `}
      onClick={handleClick}
    >
      {/* Delete button */}
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-500/20 rounded"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      )}
      
      {/* Codelist button */}
      {codelists.length > 0 && (
        <div className="absolute top-3 right-10">
          <button
            onClick={handleCodelistToggle}
            className={`
              p-1.5 rounded transition-all
              ${showCodelistMenu || problemCodelists.length > 0
                ? 'opacity-100 bg-cyan-500/20'
                : 'opacity-0 group-hover:opacity-100 hover:bg-white/10'
              }
            `}
          >
            <List className={`w-4 h-4 ${problemCodelists.length > 0 ? 'text-cyan-400' : 'text-zinc-400'}`} />
          </button>
          
          {/* Codelist Dropdown */}
          <AnimatePresence>
            {showCodelistMenu && (
              <motion.div 
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                className="absolute top-8 right-0 z-20 w-48 py-1 bg-zinc-900 border border-white/10 rounded-lg shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-2 text-xs text-zinc-500 uppercase tracking-wide border-b border-white/10">
                  Add to Codelist
                </div>
                {codelists.map((cl, idx) => {
                  const isInCodelist = cl.problemIds.includes(problem.id);
                  return (
                    <motion.button
                      key={cl.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={(e) => handleCodelistAction(e, cl.id, isInCodelist)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/5 transition-colors"
                    >
                      <motion.span
                        initial={false}
                        animate={{ scale: isInCodelist ? 1 : 0.8, opacity: isInCodelist ? 1 : 0.5 }}
                        transition={{ duration: 0.15 }}
                      >
                        {isInCodelist ? (
                          <Check className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <Plus className="w-4 h-4 text-zinc-500" />
                        )}
                      </motion.span>
                      <span className={isInCodelist ? 'text-cyan-400' : 'text-white'}>
                        {cl.name}
                      </span>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      
      {/* Platform label */}
      {(() => {
        const Logo = getPlatformLogo(problem.platform);
        return (
          <span className={`flex items-center gap-1.5 text-xs font-medium ${theme.text} uppercase tracking-wide`}>
            {Logo && <Logo className="w-4 h-4" />}
            {platformLabels[problem.platform]}
          </span>
        );
      })()}
      
      {/* Problem title */}
      <h3 className="text-white font-medium mt-2 line-clamp-2">
        {problem.title}
      </h3>
      
      {/* Solved indicator */}
      <div className="mt-3 flex items-center gap-1.5">
        {problem.solution?.solved ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-xs text-green-400">Solved</span>
          </>
        ) : (
          <>
            <Circle className={`w-4 h-4 ${theme.text} opacity-50`} />
            <span className={`text-xs ${theme.text} opacity-50`}>Unsolved</span>
          </>
        )}
        
        {/* Show codelist badges */}
        {problemCodelists.length > 0 && (
          <div className="ml-auto flex items-center gap-1">
            {problemCodelists.slice(0, 2).map(cl => (
              <span 
                key={cl.id}
                className="px-1.5 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded"
              >
                {cl.name}
              </span>
            ))}
            {problemCodelists.length > 2 && (
              <span className="text-xs text-zinc-500">+{problemCodelists.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

