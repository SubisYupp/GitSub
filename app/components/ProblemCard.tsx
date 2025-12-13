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

const platformColors = {
  codeforces: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
  leetcode: 'from-orange-500/20 to-yellow-500/20 border-orange-500/30',
  atcoder: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
  codechef: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
};

const platformLabels = {
  codeforces: 'CF',
  leetcode: 'LC',
  atcoder: 'AC',
  codechef: 'CC',
};

export default function ProblemCard({ problem, onDelete }: ProblemCardProps) {
  const router = useRouter();
  
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
        bg-gradient-to-br ${platformColors[problem.platform]}
        backdrop-blur-xl border rounded-xl p-6
        transition-all duration-300
        hover:shadow-2xl hover:shadow-cyan-500/10
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
            bg-white/10 backdrop-blur-sm
            text-white
          `}>
            {platformLabels[problem.platform]}
          </div>
          {problem.difficulty && (
            <span className="text-xs px-2 py-1 rounded bg-white/5 text-zinc-300">
              {problem.difficulty}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {problem.solution?.solved ? (
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          ) : (
            <Circle className="w-5 h-5 text-zinc-500" />
          )}
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
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

