'use client';

import { useState } from 'react';
import { Save, FileText } from 'lucide-react';

interface NotesEditorProps {
  content: string;
  onContentChange: (content: string) => void;
  onSave: () => void;
  saving?: boolean;
}

export default function NotesEditor({
  content,
  onContentChange,
  onSave,
  saving = false,
}: NotesEditorProps) {
  return (
    <div className="flex flex-col h-full bg-zinc-900/30 backdrop-blur-xl rounded-lg border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-b border-white/10">
        <div className="flex items-center gap-2 text-white">
          <FileText className="w-4 h-4" />
          <span className="font-medium">Notes</span>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="
            flex items-center gap-2 px-4 py-1.5
            bg-cyan-500/20 hover:bg-cyan-500/30
            text-cyan-400 rounded text-sm
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      
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

