'use client';

import { useState } from 'react';
import { Save, FileText, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotesEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  onSave: () => Promise<void> | void;
  saving?: boolean;
}

export default function NotesEditor({
  content,
  onContentChange,
  onSave,
  saving = false,
}: NotesEditorProps) {
  const [showSaved, setShowSaved] = useState(false);
  
  const handleSave = async () => {
    await onSave();
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };
  
  return (
    <div className="flex flex-col h-full bg-zinc-900/30 backdrop-blur-xl rounded-lg border border-white/10 overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-b border-white/10">
        <div className="flex items-center gap-2 text-white">
          <FileText className="w-4 h-4" />
          <span className="font-medium">Notes</span>
        </div>
        <motion.button
          onClick={handleSave}
          disabled={saving}
          whileHover={!saving ? { scale: 1.02 } : {}}
          whileTap={!saving ? { scale: 0.98 } : {}}
          className="
            flex items-center gap-2 px-4 py-1.5
            bg-cyan-500/20 hover:bg-cyan-500/30
            text-cyan-400 rounded text-sm
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          <motion.span
            animate={saving ? { rotate: 360 } : { rotate: 0 }}
            transition={saving ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
          >
            <Save className="w-4 h-4" />
          </motion.span>
          <AnimatePresence mode="wait">
            <motion.span
              key={saving ? 'saving' : 'save'}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              {saving ? 'Saving...' : 'Save'}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
      
      {/* Saved Toast Notification */}
      <AnimatePresence>
        {showSaved && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="
              absolute top-14 right-4 z-20
              flex items-center gap-2 px-4 py-2
              bg-green-500/20 border border-green-500/30
              text-green-400 rounded-lg
              backdrop-blur-sm
            "
          >
            <Check className="w-4 h-4" />
            <span className="text-sm font-medium">Saved!</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Editor */}
      <textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder="Write your notes here... Why was this problem important? What algorithm did you use? What did you learn?"
        className="
          flex-1 w-full p-4
          bg-transparent
          text-white placeholder-zinc-500
          resize-none
          focus:outline-none
          font-mono text-sm
        "
      />
    </div>
  );
}

