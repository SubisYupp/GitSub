'use client';

import { motion } from 'framer-motion';
import { ProblemWithDetails } from '@/lib/types';
import { 
  Code2, 
  CheckCircle2, 
  Circle, 
  ExternalLink,
  Trash2 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ProblemCardProps {
  problem: ProblemWithDetails;
  onDelete?: (id: string) => void;
}

const platformTheme = {
  codeforces: {
    border: 'border-blue-500/30',
    hoverBorder: 'group-hover:border-blue-500/60',
    badge: 'bg-blue-500/10 text-blue-400',
    icon: 'text-blue-400',
    glow: 'group-hover:shadow-blue-500/10'
  },
  leetcode: {
    border: 'border-orange-500/30',
    hoverBorder: 'group-hover:border-orange-500/60',
    badge: 'bg-orange-500/10 text-orange-400',
    icon: 'text-orange-400',
    glow: 'group-hover:shadow-orange-500/10'
  },
  atcoder: {
    border: 'border-green-500/30',
    hoverBorder: 'group-hover:border-green-500/60',
    badge: 'bg-green-500/10 text-green-400',
    icon: 'text-green-400',
    glow: 'group-hover:shadow-green-500/10'
  },
  codechef: {
    border: 'border-purple-500/30',
    hoverBorder: 'group-hover:border-purple-500/60',
    badge: 'bg-purple-500/10 text-purple-400',
    icon: 'text-purple-400',
    glow: 'group-hover:shadow-purple-500/10'
  },
};

const platformLabels = {
  codeforces: 'Codeforces',
  leetcode: 'LeetCode',
  atcoder: 'AtCoder',
  codechef: 'CodeChef',
};

export default function ProblemCard({ problem, onDelete }: ProblemCardProps) {
  const router = useRouter();
  const theme = platformTheme[problem.platform];
  
  const handleClick = () => {
    router.push(`/problems/${problem.id}`);
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(problem.id);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={`
        relative group cursor-pointer
        bg-zinc-900/50 backdrop-blur-xl 
        border ${theme.border} ${theme.hoverBorder}
        rounded-xl p-6
        transition-all duration-300
        hover:shadow-2xl ${theme.glow}
      `}
      onClick={handleClick}
    >
      {onDelete && (
        <button
          onClick={handleDelete}
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/20 rounded-lg"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      )}
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`
            px-2 py-1 rounded text-xs font-bold
            ${theme.badge}
          `}>
            {platformLabels[problem.platform]}
          </div>
          {problem.difficulty && (
            <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              {problem.difficulty}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {problem.solution?.solved ? (
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          ) : (
            <Circle className={`w-5 h-5 ${theme.icon} opacity-50`} />
          )}
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2 group-hover:text-white/90 transition-colors">
        {problem.title}
      </h3>
      
      {problem.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {problem.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="text-xs px-2 py-1 rounded bg-white/5 text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Code2 className="w-4 h-4" />
          {problem.solution?.language || 'No solution'}
        </div>
        <ExternalLink className="w-4 h-4 text-zinc-400" />
      </div>
    </motion.div>
  );
}

