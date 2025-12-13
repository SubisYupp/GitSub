'use client';

import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { CheckCircle2, Circle, Save } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  language: string;
  solved: boolean;
  onCodeChange: (code: string) => void;
  onLanguageChange: (language: string) => void;
  onSolvedChange: (solved: boolean) => void;
  onSave: () => void;
  saving?: boolean;
}

const languages = [
  { value: 'cpp', label: 'C++' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
];

export default function CodeEditor({
  code,
  language,
  solved,
  onCodeChange,
  onLanguageChange,
  onSolvedChange,
  onSave,
  saving = false,
}: CodeEditorProps) {
  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] rounded-lg overflow-hidden border border-white/10">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-b border-white/10">
        <div className="flex items-center gap-4">
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="
              px-3 py-1.5
              bg-white/5 border border-white/10 rounded
              text-white text-sm
              focus:outline-none focus:ring-2 focus:ring-cyan-500/50
            "
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => onSolvedChange(!solved)}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded text-sm
              transition-colors
              ${solved
                ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                : 'bg-white/5 text-zinc-400 hover:bg-white/10'
              }
            `}
          >
            {solved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Solved
              </>
            ) : (
              <>
                <Circle className="w-4 h-4" />
                Unsolved
              </>
            )}
          </button>
        </div>
        
        <button
          onClick={onSave}
          disabled={saving}
          className="
            flex items-center gap-2 px-4 py-1.5
            bg-cyan-500/20 hover:bg-cyan-500/30
            text-cyan-400 rounded
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      
      {/* Editor */}
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={(value) => onCodeChange(value || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
}

