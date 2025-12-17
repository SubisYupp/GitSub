'use client';

import React from 'react';
import 'katex/dist/katex.min.css';
import katex from 'katex';

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Check if a LaTeX expression should be rendered inline
 * Simple expressions (single letters, numbers, short formulas) should always be inline
 */
function shouldBeInline(latex: string): boolean {
  const trimmed = latex.trim();
  
  // Single character or number - always inline
  if (trimmed.length <= 3) return true;
  
  // Simple variable with subscript like A_{1,j} - inline
  if (/^[A-Za-z](_\{[^}]+\})?$/.test(trimmed)) return true;
  
  // Simple expressions without complex structures - inline
  // Display math should be reserved for multi-line or very complex expressions
  if (!trimmed.includes('\\begin') && 
      !trimmed.includes('\\\\') && 
      !trimmed.includes('\\displaystyle') &&
      trimmed.length < 80) {
    return true;
  }
  
  return false;
}

/**
 * Renders text with inline LaTeX math expressions.
 * Supports:
 * - $...$  for inline math
 * - $$...$$ for display/block math (only for complex expressions)
 */
export function MathText({ text, className = '' }: MathTextProps) {
  const renderMath = (content: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;
    
    // Match both display math ($$...$$) and inline math ($...$)
    // We need to match $$ first to avoid matching $ twice
    const mathRegex = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;
    
    let match;
    while ((match = mathRegex.exec(content)) !== null) {
      // Add text before the math
      if (match.index > lastIndex) {
        parts.push(
          <span key={key++}>{content.slice(lastIndex, match.index)}</span>
        );
      }
      
      // Determine if it's display or inline math based on delimiters AND content
      const wasMarkedAsDisplay = match[1] !== undefined;
      const latex = wasMarkedAsDisplay ? match[1] : match[2];
      
      // Override to inline if the content is simple, even if marked as display
      const forceInline = shouldBeInline(latex);
      const isDisplay = wasMarkedAsDisplay && !forceInline;
      
      try {
        const html = katex.renderToString(latex.trim(), {
          throwOnError: false,
          displayMode: isDisplay,
          output: 'html',
        });
        
        if (isDisplay) {
          parts.push(
            <span 
              key={key++} 
              className="block my-2 text-center"
              dangerouslySetInnerHTML={{ __html: html }} 
            />
          );
        } else {
          parts.push(
            <span 
              key={key++} 
              className="inline-math"
              dangerouslySetInnerHTML={{ __html: html }} 
            />
          );
        }
      } catch (e) {
        // If KaTeX fails, just show the raw text
        parts.push(<span key={key++}>${latex}$</span>);
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(<span key={key++}>{content.slice(lastIndex)}</span>);
    }
    
    return parts;
  };
  
  return (
    <div className={className}>
      {renderMath(text)}
    </div>
  );
}
