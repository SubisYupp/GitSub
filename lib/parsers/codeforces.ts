import * as cheerio from 'cheerio';
import { ProblemMetadata } from '../types';
import { withBrowserContext } from './browser-manager';

/**
 * Convert Codeforces $$$ delimiters to standard $ delimiters
 * Codeforces uses $$$...$$$  for inline math instead of standard $...$
 */
function convertCodeforcesLatex(text: string): string {
  // Convert $$$ inline math to $ (must be done before $$ block math)
  // Match $$$...$$$  and convert to $...$
  return text.replace(/\$\$\$([^$]+)\$\$\$/g, '$$$1$$');
}

/**
 * Extract text from HTML while preserving spaces around inline elements
 * This is crucial for Codeforces which uses inline math that can lose spacing
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTextWithSpaces($: cheerio.CheerioAPI, element: any): string {
  // Clone to avoid modifying original
  const clone = element.clone();
  
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
  
  // Convert Codeforces $$$ to standard $
  html = convertCodeforcesLatex(html);
  
  // Clean up multiple spaces but preserve single spaces
  html = html.replace(/\s+/g, ' ').trim();
  
  return html;
}

/**
 * Convert MathJax-rendered HTML back to clean text with $latex$ markers
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cleanMathJaxHtml($: cheerio.CheerioAPI, element: any): string {
  // Clone to avoid modifying original
  const clone = element.clone();
  
  // Step 1: Replace <script type="math/tex"> with $latex$
  // The script tags contain the original LaTeX - this is the source of truth
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  clone.find('script[type="math/tex"]').each((_: number, elem: any) => {
    const latex = $(elem).text().trim();
    const id = $(elem).attr('id') || '';
    const isDisplay = id.includes('Display');
    const replacement = isDisplay ? ` $$${latex}$$ ` : ` $${latex}$ `;
    $(elem).replaceWith(replacement);
  });
  
  // Step 2: Remove all MathJax visual rendering (the span soup)
  // These are duplicates of what's in the script tags
  clone.find('.MathJax, .MathJax_Display, .MathJax_Preview').remove();
  clone.find('mjx-container').remove();
  clone.find('.MJX_Assistive_MathML').remove();
  clone.find('[class*="Assistive"]').remove();
  clone.find('nobr[aria-hidden="true"]').remove();
  clone.find('span.math').remove();
  
  // Step 3: Get cleaned HTML
  let html = clone.html() || '';
  
  // Step 4: Convert Codeforces $$$ delimiters to standard $ delimiters
  html = convertCodeforcesLatex(html);
  
  // Step 5: Clean up whitespace carefully - preserve $...$ intact
  // First, protect the $...$ expressions
  const mathExpressions: string[] = [];
  html = html.replace(/\$\$[^$]+\$\$|\$[^$]+\$/g, (match: string) => {
    mathExpressions.push(match);
    return `__MATH_${mathExpressions.length - 1}__`;
  });
  
  // Now clean up whitespace
  html = html
    .replace(/\s+/g, ' ')  // Collapse whitespace
    .replace(/>\s+</g, '> <')  // Keep single space between tags for text flow
    .trim();
  
  // Restore math expressions with proper spacing
  html = html.replace(/__MATH_(\d+)__/g, (_: string, index: string) => {
    return ` ${mathExpressions[parseInt(index)]} `;
  });
  
  // Clean up any double spaces
  html = html.replace(/\s+/g, ' ').trim();
  
  return html;
}

export async function parseCodeforces(url: string): Promise<ProblemMetadata> {
  return withBrowserContext(async (context) => {
    // Configure context for Codeforces - disable JS to get raw HTML with script tags intact
    const page = await context.newPage();
    
    // Disable JavaScript by intercepting and modifying the page
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (resourceType === 'script') {
        route.abort();
      } else {
        route.continue();
      }
    });
  
    console.log(`Navigating to Codeforces: ${url}`);
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    const html = await page.content();
    
    const $ = cheerio.load(html);
    
    const problemStatement = $('.problem-statement');
    if (problemStatement.length === 0) {
      throw new Error('Could not find problem statement. The URL might be invalid or the page structure has changed.');
    }
    
    // Extract problem title (clean text, no HTML)
    const title = $('.title').first().text().trim() || 
                  problemStatement.find('.title').first().text().trim() ||
                  $('h1, h2').first().text().trim() ||
                  'Untitled Problem';
    
    // Extract problem statement with cleaned MathJax
    const descriptionElem = problemStatement.find('.header + div');
    let description = '';
    if (descriptionElem.length > 0) {
      description = cleanMathJaxHtml($, descriptionElem);
    } else {
      const altElem = problemStatement.find('> div').not('.header').first();
      if (altElem.length > 0) {
        description = cleanMathJaxHtml($, altElem);
      } else {
        description = cleanMathJaxHtml($, problemStatement);
      }
    }
    
    // Extract input/output specifications with cleaned MathJax
    const inputSpecElem = problemStatement.find('.input-specification');
    const outputSpecElem = problemStatement.find('.output-specification');
    const inputSpec = inputSpecElem.length > 0 ? cleanMathJaxHtml($, inputSpecElem) : '';
    const outputSpec = outputSpecElem.length > 0 ? cleanMathJaxHtml($, outputSpecElem) : '';
    
    // Extract sample tests - preserve newlines properly
    const sampleTests: Array<{ input: string; output: string; explanation?: string; images?: string[] }> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $('.sample-test').each((_: number, elem: any) => {
      // Get all input/output pairs within this sample-test block
      const inputs = $(elem).find('.input');
      const outputs = $(elem).find('.output');
      
      inputs.each((i, inputElem) => {
        const outputElem = outputs.eq(i);
        
        // Get the pre element and preserve line breaks
        // Codeforces uses <br> tags for line breaks in some cases
        const inputPre = $(inputElem).find('pre');
        const outputPre = $(outputElem).find('pre');
        
        // Replace <br> with newlines and get text
        let inputText = '';
        let outputText = '';
        
        // Handle input - check for divs inside pre (Codeforces sometimes wraps lines in divs)
        const inputDivs = inputPre.find('div');
        if (inputDivs.length > 0) {
          const lines: string[] = [];
          inputDivs.each((_, div) => {
            lines.push($(div).text());
          });
          inputText = lines.join('\n');
        } else {
          // Replace <br> tags with newlines, then get text
          inputText = inputPre.html()?.replace(/<br\s*\/?>/gi, '\n') || '';
          inputText = $('<div>').html(inputText).text().trim();
        }
        
        // Handle output similarly
        const outputDivs = outputPre.find('div');
        if (outputDivs.length > 0) {
          const lines: string[] = [];
          outputDivs.each((_, div) => {
            lines.push($(div).text());
          });
          outputText = lines.join('\n');
        } else {
          outputText = outputPre.html()?.replace(/<br\s*\/?>/gi, '\n') || '';
          outputText = $('<div>').html(outputText).text().trim();
        }
        
        if (inputText && outputText) {
          sampleTests.push({ input: inputText, output: outputText });
        }
      });
    });
    
    // Extract Note section (contains explanations for sample tests)
    const noteSection = problemStatement.find('.note');
    if (noteSection.length > 0 && sampleTests.length > 0) {
      // Extract images from the Note section
      const noteImages: string[] = [];
      noteSection.find('img').each((_, elem) => {
        let src = $(elem).attr('src');
        if (src) {
          // Make relative URLs absolute
          if (src.startsWith('//')) {
            src = 'https:' + src;
          } else if (src.startsWith('/')) {
            src = 'https://codeforces.com' + src;
          }
          if (!noteImages.includes(src)) {
            noteImages.push(src);
          }
        }
      });
      
      // Use extractTextWithSpaces to properly preserve spacing around inline math
      let noteText = extractTextWithSpaces($, noteSection);
      
      // Try to parse and assign explanations to specific test cases
      // Codeforces often has patterns like "In the first test case..." or "In the first example..."
      const testPatterns = [
        /(?:in\s+)?(?:the\s+)?(?:first|1st)\s+(?:test\s+case|example|sample)/gi,
        /(?:in\s+)?(?:the\s+)?(?:second|2nd)\s+(?:test\s+case|example|sample)/gi,
        /(?:in\s+)?(?:the\s+)?(?:third|3rd)\s+(?:test\s+case|example|sample)/gi,
        /(?:in\s+)?(?:the\s+)?(?:fourth|4th)\s+(?:test\s+case|example|sample)/gi,
      ];
      
      // If there's only one sample test, assign the whole note to it
      if (sampleTests.length === 1) {
        // Remove "Note" header if present
        let cleanNote = noteText.replace(/^Note\s*/i, '').trim();
        if (cleanNote) {
          sampleTests[0].explanation = cleanNote;
          if (noteImages.length > 0) {
            sampleTests[0].images = noteImages;
          }
        }
      } else {
        // Try to split the note by test case references
        // For now, if we can't parse individual explanations, 
        // attach the entire note to the first sample as general explanation
        let cleanNote = noteText.replace(/^Note\s*/i, '').trim();
        if (cleanNote) {
          // Try to find sections for each test
          const lines = cleanNote.split('\n');
          let currentTestIndex = -1;
          let explanations: string[] = [];
          
          lines.forEach(line => {
            const lineLower = line.toLowerCase();
            if (lineLower.includes('first') || lineLower.includes('1st') || /\b1\b/.test(line)) {
              if (lineLower.includes('test') || lineLower.includes('example') || lineLower.includes('sample')) {
                currentTestIndex = 0;
              }
            } else if (lineLower.includes('second') || lineLower.includes('2nd') || /\b2\b/.test(line)) {
              if (lineLower.includes('test') || lineLower.includes('example') || lineLower.includes('sample')) {
                currentTestIndex = 1;
              }
            } else if (lineLower.includes('third') || lineLower.includes('3rd') || /\b3\b/.test(line)) {
              if (lineLower.includes('test') || lineLower.includes('example') || lineLower.includes('sample')) {
                currentTestIndex = 2;
              }
            }
            
            if (currentTestIndex >= 0 && currentTestIndex < sampleTests.length) {
              if (!explanations[currentTestIndex]) {
                explanations[currentTestIndex] = '';
              }
              explanations[currentTestIndex] += line + '\n';
            }
          });
          
          // Assign parsed explanations
          explanations.forEach((exp, idx) => {
            if (exp && sampleTests[idx]) {
              sampleTests[idx].explanation = exp.trim();
            }
          });
          
          // If no individual explanations were parsed, add the whole note to first test
          const hasAnyExplanation = sampleTests.some(t => t.explanation);
          if (!hasAnyExplanation && cleanNote) {
            sampleTests[0].explanation = cleanNote;
            if (noteImages.length > 0) {
              sampleTests[0].images = noteImages;
            }
          } else if (noteImages.length > 0) {
            // If there are images but we parsed individual explanations,
            // add images to the first sample that has an explanation
            const firstWithExplanation = sampleTests.find(t => t.explanation);
            if (firstWithExplanation) {
              firstWithExplanation.images = noteImages;
            }
          }
        }
      }
    }
    
    // Extract tags
    const tags: string[] = [];
    $('.tag-box').each((_, elem) => {
      const tag = $(elem).text().trim();
      if (tag && !tags.includes(tag)) {
        tags.push(tag);
      }
    });
    
    // Extract problem ID from URL - handle both formats
    // Format 1: /problemset/problem/158/A
    // Format 2: /contest/2176/problem/D
    let urlMatch = url.match(/\/problem\/(\d+)\/([A-Z])/);
    if (!urlMatch) {
      urlMatch = url.match(/\/contest\/(\d+)\/problem\/([A-Z])/);
    }
    const problemId = urlMatch ? `${urlMatch[1]}${urlMatch[2]}` : '';
    
    // Generate unique ID
    const id = `codeforces-${problemId}`;
    
    const now = new Date().toISOString();
    
    return {
      id,
      platform: 'codeforces',
      problemId,
      title,
      description: description || problemStatement.html() || '',
      inputFormat: inputSpec,
      outputFormat: outputSpec,
      sampleTests,
      tags,
      url,
      createdAt: now,
      updatedAt: now,
    };
  });
}

