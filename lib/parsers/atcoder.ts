import * as cheerio from 'cheerio';
import { ProblemMetadata } from '../types';
import { withBrowserContext } from './browser-manager';

/**
 * Clean up LaTeX/math expressions in text
 * - Convert Codeforces-style $$$ to single $
 * - Clean up MathJax artifacts
 */
function cleanLatexText(text: string): string {
  // Convert $$$ inline math to $ (Codeforces style)
  let result = text.replace(/\$\$\$([^$]+)\$\$\$/g, '$$$1$$');
  
  // Clean up any remaining MathJax artifacts
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

/**
 * Extract text from HTML while preserving spaces around inline elements
 * Also handles KaTeX (used by AtCoder) by extracting LaTeX source
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTextWithSpaces($: cheerio.CheerioAPI, element: any): string {
  // Clone to avoid modifying original
  const clone = element.clone();
  
  // Step 1: Handle KaTeX (AtCoder uses KaTeX, not MathJax)
  // KaTeX stores original LaTeX in annotation element or in data attributes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clone.find('.katex').each((_: number, elem: any) => {
    // Try to find the LaTeX source in annotation element
    const annotation = $(elem).find('annotation[encoding="application/x-tex"]');
    if (annotation.length > 0) {
      const latex = annotation.text().trim();
      // Always use single $ for inline - let the renderer decide display vs inline
      // based on content complexity, not AtCoder's markup
      $(elem).replaceWith(` $${latex}$ `);
    } else {
      // Fallback: try to get text content (will be the rendered math)
      const text = $(elem).text().trim();
      if (text) {
        $(elem).replaceWith(` $${text}$ `);
      } else {
        $(elem).remove();
      }
    }
  });
  
  // Also handle <var> tags which AtCoder sometimes uses for simple math
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clone.find('var').each((_: number, elem: any) => {
    const text = $(elem).text().trim();
    if (text) {
      $(elem).replaceWith(` $${text}$ `);
    }
  });
  
  // Step 2: Replace MathJax script tags with their LaTeX content wrapped in $
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clone.find('script[type="math/tex"]').each((_: number, elem: any) => {
    const latex = $(elem).text().trim();
    const id = $(elem).attr('id') || '';
    const isDisplay = id.includes('Display');
    const replacement = isDisplay ? ` $$${latex}$$ ` : ` $${latex}$ `;
    $(elem).replaceWith(replacement);
  });
  
  // Step 3: Handle mjx-container (newer MathJax) - extract from aria-label or assistive text
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clone.find('mjx-container').each((_: number, elem: any) => {
    const ariaLabel = $(elem).attr('aria-label');
    if (ariaLabel) {
      $(elem).replaceWith(` $${ariaLabel}$ `);
    } else {
      const assistive = $(elem).find('.MJX_Assistive_MathML').text().trim();
      if (assistive) {
        $(elem).replaceWith(` $${assistive}$ `);
      } else {
        $(elem).remove();
      }
    }
  });
  
  // Step 4: Remove any remaining MathJax visual rendering
  clone.find('.MathJax, .MathJax_Display, .MathJax_Preview').remove();
  clone.find('.MJX_Assistive_MathML').remove();
  clone.find('[class*="Assistive"]').remove();
  clone.find('nobr[aria-hidden="true"]').remove();
  clone.find('span.math').remove();
  
  // Get HTML and process it
  let html = clone.html() || '';
  
  // Add spaces around block-level elements to ensure proper text separation
  html = html.replace(/<(p|div|br|li|ul|ol|h[1-6])[^>]*>/gi, ' ');
  html = html.replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, ' ');
  
  // Add spaces around inline math and span elements to preserve word boundaries
  html = html.replace(/<span[^>]*>/gi, ' ');
  html = html.replace(/<\/span>/gi, ' ');
  
  // Convert HTML entities
  html = html.replace(/&nbsp;/g, ' ');
  html = html.replace(/&lt;/g, '<');
  html = html.replace(/&gt;/g, '>');
  html = html.replace(/&amp;/g, '&');
  html = html.replace(/&quot;/g, '"');
  
  // Remove all remaining HTML tags
  html = html.replace(/<[^>]+>/g, ' ');
  
  // Apply LaTeX cleanup
  html = cleanLatexText(html);
  
  // Clean up multiple spaces but preserve single spaces
  html = html.replace(/\s+/g, ' ').trim();
  
  return html;
}

export async function parseAtcoder(url: string): Promise<ProblemMetadata> {
  // Extract problem ID from URL first (needed for proper identification)
  // AtCoder URL formats:
  // - https://atcoder.jp/contests/abc123/tasks/abc123_a
  // - https://atcoder.jp/contests/agc001/tasks/agc001_a
  const urlMatch = url.match(/\/contests\/([a-z0-9]+)\/tasks\/([a-z0-9_]+)/i);
  if (!urlMatch || !urlMatch[1] || !urlMatch[2]) {
    throw new Error('Invalid AtCoder URL. Expected format: https://atcoder.jp/contests/contest-name/tasks/problem-id');
  }
  
  const contestId = urlMatch[1];
  const taskId = urlMatch[2];
  const problemId = `${contestId}-${taskId}`;
  
  return withBrowserContext(async (context) => {
    const page = await context.newPage();
    
    console.log(`Navigating to AtCoder: ${url}`);
    
    // Navigate to the page
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for content to load
    try {
      await page.waitForSelector('span.h2, .lang-en, #task-statement', { 
        timeout: 10000 
      });
    } catch {
      console.log('Waiting for AtCoder content...');
    }
    
    // Additional wait for content
    await page.waitForTimeout(2000);
    
    // Get the HTML content
    const html = await page.content();
    
    // Parse with Cheerio
    const $ = cheerio.load(html);
    
    // Extract title - AtCoder structure: <span class="h2">B - Nearest Taller</span>
    let title = '';
    
    // First, try to find the title in span.h2 (AtCoder's specific structure)
    const spanH2 = $('span.h2').first().text().trim();
    if (spanH2) {
      // Remove the problem letter prefix (e.g., "B - " or "A - ") and any buttons/links
      title = spanH2
        .replace(/^[A-Z]\s*-\s*/, '') // Remove "B - " prefix
        .replace(/\s*Editorial.*$/, '') // Remove "Editorial" button text
        .trim();
    }
    
    // If not found, try English title sections
    if (!title) {
      const englishTitle = $('.lang-en h2, .lang-en h3, h2.lang-en, h3.lang-en').first().text().trim();
      if (englishTitle) {
        title = englishTitle;
      } else {
        // Look for title in English sections
        $('.lang-en').each((_, elem) => {
          const h2 = $(elem).find('h2').first().text().trim();
          const h3 = $(elem).find('h3').first().text().trim();
          if (h2 && !title) title = h2;
          if (h3 && !title) title = h3;
        });
      }
    }
    
    // If still no title, try general selectors but filter out Japanese
    if (!title) {
      $('h2, h3, span.h2').each((_, elem) => {
        const text = $(elem).text().trim();
        // Filter out Japanese characters (hiragana, katakana, kanji)
        const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
        if (text && !hasJapanese && !title) {
          // Remove problem letter prefix if present
          title = text.replace(/^[A-Z]\s*-\s*/, '').replace(/\s*Editorial.*$/, '').trim();
        }
      });
    }
    
    // Fallback to page title if nothing found
    if (!title) {
      const pageTitle = $('title').text().trim();
      // Remove "AtCoder" and other common prefixes
      title = pageTitle.replace(/^.*?[-|]/, '').trim() || pageTitle;
    }
    
    // Extract problem statement - prefer English version
    let description = '';
    
    // Look for English problem statement in #task-statement
    const taskStatement = $('#task-statement');
    if (taskStatement.length > 0) {
      // Find English version
      let englishSection = taskStatement.find('.lang-en, span.lang-en');
      if (englishSection.length > 0) {
        // Clone the section to avoid modifying the original
        const clonedSection = englishSection.first().clone();
        
        // Remove elements we don't want in the problem statement
        // 1. Remove all copy buttons
        clonedSection.find('.btn-copy, .btn, [class*="copy"], button').remove();
        
        // 2. Remove sample test sections (Sample Input/Output sections)
        clonedSection.find('section, div').each((_, elem) => {
          const sectionText = $(elem).text().toLowerCase();
          if (sectionText.includes('sample input') || 
              sectionText.includes('sample output') ||
              sectionText.includes('入力例') ||
              sectionText.includes('出力例')) {
            $(elem).remove();
          }
        });
        
        // 3. Remove "Score" section if present
        clonedSection.find('p, div').each((_, elem) => {
          const text = $(elem).text().trim();
          if (/^Score\s*:\s*\d+/i.test(text) || /^配点\s*:\s*\d+/i.test(text)) {
            $(elem).remove();
          }
        });
        
        // 4. Remove the "Problem Statement" header itself since we'll have our own
        clonedSection.find('h3, h2').each((_, elem) => {
          const text = $(elem).text().trim().toLowerCase();
          if (text === 'problem statement' || text === '問題文') {
            $(elem).remove();
          }
        });
        
        description = clonedSection.html() || '';
      } else {
        // If no English section, get the first visible lang section
        const langSections = taskStatement.find('span.lang > span');
        langSections.each((_, elem) => {
          const clonedElem = $(elem).clone();
          
          // Remove unwanted elements
          clonedElem.find('.btn-copy, .btn, [class*="copy"], button').remove();
          clonedElem.find('section, div').each((_, section) => {
            const sectionText = $(section).text().toLowerCase();
            if (sectionText.includes('sample input') || 
                sectionText.includes('sample output') ||
                sectionText.includes('入力例') ||
                sectionText.includes('出力例')) {
              $(section).remove();
            }
          });
          clonedElem.find('p, div').each((_, p) => {
            const text = $(p).text().trim();
            if (/^Score\s*:\s*\d+/i.test(text) || /^配点\s*:\s*\d+/i.test(text)) {
              $(p).remove();
            }
          });
          
          const html = clonedElem.html() || '';
          const text = clonedElem.text() || '';
          // Check if it's English (no Japanese characters)
          const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
          if (html.length > description.length && !hasJapanese) {
            description = html;
          }
        });
      }
    }
    
    // If still no description, try other selectors
    if (!description) {
      $('.lang-en').each((_, elem) => {
        const clonedElem = $(elem).clone();
        clonedElem.find('.btn-copy, .btn, [class*="copy"], button').remove();
        clonedElem.find('section, div').each((_, section) => {
          const sectionText = $(section).text().toLowerCase();
          if (sectionText.includes('sample input') || sectionText.includes('sample output')) {
            $(section).remove();
          }
        });
        const html = clonedElem.html() || '';
        if (html.length > description.length) {
          description = html;
        }
      });
    }
    
    if (!description) {
      $('.part, [class*="problem"], [class*="statement"]').each((_, elem) => {
        const clonedElem = $(elem).clone();
        clonedElem.find('.btn-copy, .btn, [class*="copy"], button').remove();
        const html = clonedElem.html() || '';
        if (html.length > description.length) {
          description = html;
        }
      });
    }
    
    // Fallback to main content
    if (!description) {
      const mainContent = $('main, .container, #main-container').clone();
      mainContent.find('.btn-copy, .btn, [class*="copy"], button').remove();
      description = mainContent.html() || '';
    }
    
    // Clean up description - remove "Copy" text that may remain
    description = description
      .replace(/Copy\s*Copy/gi, '')
      .replace(/>Copy</gi, '><')
      .replace(/\bCopy\b(?=\s*<)/gi, '')
      .trim();
    
    // Extract sample tests - look for input/output sections in English
    const sampleTests: Array<{ input: string; output: string; explanation?: string }> = [];
    
    // Method 1: Look for sample input/output sections with their explanations
    // AtCoder structure: sections with h3 headers "Sample Input X", "Sample Output X"
    // Explanations typically follow the output section or are in a separate section
    const englishContent = $('.lang-en, span.lang-en').first();
    const allSections = englishContent.find('section');
    
    // Collect all sample inputs, outputs, and explanations
    const sampleData: { [key: number]: { input?: string; output?: string; explanation?: string } } = {};
    
    allSections.each((_, section) => {
      const header = $(section).find('h3').first().text().trim();
      const headerLower = header.toLowerCase();
      
      // Match "Sample Input 1", "Sample Output 2", etc.
      const inputMatch = headerLower.match(/sample\s*input\s*(\d+)/);
      const outputMatch = headerLower.match(/sample\s*output\s*(\d+)/);
      
      if (inputMatch) {
        const num = parseInt(inputMatch[1]);
        const pre = $(section).find('pre[id^="pre-sample"]').first();
        if (pre.length > 0) {
          let text = pre.text().trim();
          text = text.replace(/^Copy\s*/i, '').replace(/\s*Copy$/i, '').trim();
          if (!sampleData[num]) sampleData[num] = {};
          sampleData[num].input = text;
        }
      } else if (outputMatch) {
        const num = parseInt(outputMatch[1]);
        const pre = $(section).find('pre[id^="pre-sample"]').first();
        if (pre.length > 0) {
          let text = pre.text().trim();
          text = text.replace(/^Copy\s*/i, '').replace(/\s*Copy$/i, '').trim();
          if (!sampleData[num]) sampleData[num] = {};
          sampleData[num].output = text;
          
          // Look for explanation - it's usually the text after the pre tag
          // or in paragraphs within the same section
          const sectionClone = $(section).clone();
          sectionClone.find('h3, pre, .btn-copy, .btn, button').remove();
          let explanationText = extractTextWithSpaces($, sectionClone);
          
          if (explanationText && explanationText.length > 5) {
            sampleData[num].explanation = explanationText;
          }
        }
      }
    });
    
    // Also look for dedicated explanation sections (common in some AtCoder problems)
    allSections.each((_, section) => {
      const sectionText = $(section).text();
      
      // Look for patterns like "When (i,j)=(1,1)" or explanation patterns
      Object.keys(sampleData).forEach(numStr => {
        const num = parseInt(numStr);
        if (!sampleData[num].explanation) {
          // Check if this section contains explanation for this sample
          const header = $(section).find('h3').first().text().trim().toLowerCase();
          if (header.includes(`sample ${num}`) && !header.includes('input') && !header.includes('output')) {
            const sectionClone = $(section).clone();
            sectionClone.find('h3, .btn-copy, .btn, button').remove();
            let text = extractTextWithSpaces($, sectionClone);
            if (text && text.length > 5) {
              sampleData[num].explanation = text;
            }
          }
        }
      });
    });
    
    // Convert to array
    const sortedNums = Object.keys(sampleData).map(n => parseInt(n)).sort((a, b) => a - b);
    for (const num of sortedNums) {
      const data = sampleData[num];
      if (data.input && data.output) {
        sampleTests.push({
          input: data.input,
          output: data.output,
          explanation: data.explanation,
        });
      }
    }
    
    // Fallback Method: Look for pre tags with IDs if structured method didn't work
    if (sampleTests.length === 0) {
      const samplePreTags = $('pre[id^="pre-sample"]');
      
      // Group them into pairs (input/output)
      for (let i = 0; i < samplePreTags.length - 1; i += 2) {
        const inputPre = samplePreTags.eq(i);
        const outputPre = samplePreTags.eq(i + 1);
        
        let inputText = inputPre.text().trim();
        let outputText = outputPre.text().trim();
        
        inputText = inputText.replace(/^Copy\s*/i, '').replace(/\s*Copy$/i, '').trim();
        outputText = outputText.replace(/^Copy\s*/i, '').replace(/\s*Copy$/i, '').trim();
        
        if (inputText && outputText && inputText.length > 0 && outputText.length > 0) {
          sampleTests.push({
            input: inputText,
            output: outputText,
          });
        }
      }
    }
    
    // Extract difficulty/rating if available
    const difficulty = $('[class*="difficulty"], [class*="Difficulty"], [class*="rating"]').first().text().trim();
    
    // Extract tags if available
    const tags: string[] = [];
    $('[class*="tag"], [class*="Tag"], .tag').each((_, elem) => {
      const tag = $(elem).text().trim();
      if (tag && !tags.includes(tag)) {
        tags.push(tag);
      }
    });
    
    const id = `atcoder-${problemId}`;
    const now = new Date().toISOString();
    
    console.log(`AtCoder extracted - Title: ${title}, Description: ${description ? 'Yes (' + description.length + ' chars)' : 'No'}, Tests: ${sampleTests.length}`);
    
    return {
      id,
      platform: 'atcoder',
      problemId,
      title: title || `AtCoder Problem ${taskId}`,
      description: description || '',
      sampleTests,
      difficulty,
      tags,
      url,
      createdAt: now,
      updatedAt: now,
    };
  });
}
