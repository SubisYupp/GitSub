'use client';

import { useEffect, useRef, memo } from 'react';
import 'katex/dist/katex.min.css';
import katex from 'katex';

interface ProblemStatementProps {
  content: string;
}

function ProblemStatementInner({ content }: ProblemStatementProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!contentRef.current) return;
    
    const container = contentRef.current;
    
    // ===== CLEANUP: Remove MathJax elements that weren't converted =====
    container.querySelectorAll('.mjx-assistive-mathml').forEach(el => el.remove());
    container.querySelectorAll('.MJX_Assistive_MathML').forEach(el => el.remove());
    container.querySelectorAll('[class*="Assistive"]').forEach(el => el.remove());
    container.querySelectorAll('.katex-mathml').forEach(el => el.remove());
    container.querySelectorAll('annotation').forEach(el => el.remove());
    container.querySelectorAll('[class*="sr-only"]').forEach(el => el.remove());
    
    // Remove MathJax visual elements that weren't converted (they show garbled text)
    container.querySelectorAll('.MathJax, .MathJax_Display, mjx-container').forEach(el => {
      // Check if it has already been processed or has $ text nearby
      const text = el.textContent?.trim() || '';
      // If it's a MathJax element with just letters/numbers, it's unconverted math
      // Replace with the text wrapped in $ for KaTeX to render
      if (text && text.length < 200) {
        const span = document.createElement('span');
        span.textContent = `$${text}$`;
        el.replaceWith(span);
      } else {
        el.remove();
      }
    });
    
    // ===== RENDER LATEX WITH KATEX =====
    const renderMathInElement = (element: HTMLElement) => {
      // Process text nodes for inline math ($...$) and display math ($$...$$)
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
        
        // Match $$...$$ (display) first, then $...$ (inline)
        // The regex captures: group 1 = display math content, group 2 = inline math content
        const mathRegex = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;
        const matches = Array.from(text.matchAll(mathRegex));
        
        if (matches.length === 0) return;
        
        // Build new content with rendered math
        let lastIndex = 0;
        const fragment = document.createDocumentFragment();
        
        matches.forEach((match) => {
          // Add text before match (preserve spaces!)
          if (match.index! > lastIndex) {
            const beforeText = text.substring(lastIndex, match.index!);
            fragment.appendChild(document.createTextNode(beforeText));
          }
          
          // Determine if display or inline math
          const isDisplay = match[0].startsWith('$$');
          const latex = isDisplay ? match[1] : match[2];
          
          if (!latex) return;
          
          // Create appropriate container for math
          const mathSpan = document.createElement('span');
          
          if (isDisplay) {
            // Display math: centered block
            mathSpan.style.display = 'block';
            mathSpan.style.textAlign = 'center';
            mathSpan.style.margin = '0.75em 0';
          } else {
            // Inline math: flows with text
            mathSpan.style.display = 'inline';
            mathSpan.style.whiteSpace = 'nowrap';
          }
          
          try {
            katex.render(latex.trim(), mathSpan, {
              throwOnError: false,
              displayMode: isDisplay, // Use appropriate mode
              strict: false,
            });
          } catch (e) {
            // Fallback: just show the LaTeX code
            mathSpan.textContent = latex;
            mathSpan.style.fontFamily = 'monospace';
            mathSpan.style.color = '#e879f9';
          }
          fragment.appendChild(mathSpan);
          
          lastIndex = match.index! + match[0].length;
        });
        
        // Add remaining text (preserve spaces!)
        if (lastIndex < text.length) {
          const afterText = text.substring(lastIndex);
          fragment.appendChild(document.createTextNode(afterText));
        }
        
        // Replace the text node
        parent.replaceChild(fragment, textNode);
      });
    };
    
    // Render math after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      renderMathInElement(container);
    }, 100);
    
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

// Memoize to prevent re-renders when parent state (like solved) changes
// This preserves the KaTeX-rendered DOM
const ProblemStatement = memo(ProblemStatementInner);
export default ProblemStatement;