'use client';

import { useEffect, useRef } from 'react';
import 'katex/dist/katex.min.css';
import katex from 'katex';

interface ProblemStatementProps {
  content: string;
}

export default function ProblemStatement({ content }: ProblemStatementProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!contentRef.current) return;
    
    // Render LaTeX math expressions in the content
    const container = contentRef.current;
    
    // Find and render math expressions wrapped in $ or $$
    const renderMathInElement = (element: HTMLElement) => {
      // Process text nodes for inline math ($...$)
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      const nodesToProcess: Text[] = [];
      let node: Node | null;
      
      while ((node = walker.nextNode())) {
        const text = node.textContent || '';
        if (text.includes('$')) {
          nodesToProcess.push(node as Text);
        }
      }
      
      // Process each text node
      nodesToProcess.forEach((textNode) => {
        const text = textNode.textContent || '';
        const parent = textNode.parentNode;
        if (!parent) return;
        
        // Match $...$ (inline) and $$...$$ (display)
        const mathRegex = /\$\$?([^$\n]+?)\$\$?/g;
        const matches = Array.from(text.matchAll(mathRegex));
        
        if (matches.length === 0) return;
        
        // Build new content with rendered math
        let lastIndex = 0;
        const fragment = document.createDocumentFragment();
        
        matches.forEach((match) => {
          // Add text before match
          if (match.index! > lastIndex) {
            fragment.appendChild(
              document.createTextNode(text.substring(lastIndex, match.index!))
            );
          }
          
          // Render math
          const mathSpan = document.createElement('span');
          const isDisplay = match[0].startsWith('$$');
          try {
            katex.render(match[1], mathSpan, {
              throwOnError: false,
              displayMode: isDisplay,
            });
          } catch (e) {
            mathSpan.textContent = match[0];
          }
          fragment.appendChild(mathSpan);
          
          lastIndex = match.index! + match[0].length;
        });
        
        // Add remaining text
        if (lastIndex < text.length) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
        }
        
        // Replace the text node
        parent.replaceChild(fragment, textNode);
      });
      
      // Also render existing math elements that might be in the HTML
      container.querySelectorAll('[class*="math"]:not(.katex-rendered)').forEach((el) => {
        const text = el.textContent || '';
        if (text) {
          try {
            katex.render(text, el as HTMLElement, {
              throwOnError: false,
            });
            el.classList.add('katex-rendered');
          } catch (e) {
            // Ignore rendering errors
          }
        }
      });
    };
    
    // Render math after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      renderMathInElement(container);
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [content]);
  
  return (
    <div
      ref={contentRef}
      className="prose prose-invert max-w-none
        prose-headings:text-white
        prose-p:text-zinc-300
        prose-strong:text-white
        prose-code:text-cyan-400 prose-code:bg-white/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
        prose-pre:bg-zinc-900/50 prose-pre:border prose-pre:border-white/10
        prose-a:text-cyan-400
        prose-ul:text-zinc-300
        prose-ol:text-zinc-300
        prose-blockquote:text-zinc-400 prose-blockquote:border-zinc-700
      "
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

