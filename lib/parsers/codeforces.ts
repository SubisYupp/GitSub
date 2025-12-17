import * as cheerio from 'cheerio';
import { ProblemMetadata } from '../types';
import { withBrowserContext } from './browser-manager';

/**
 * Convert MathJax-rendered HTML back to clean text with $latex$ markers
 */
function cleanMathJaxHtml($: cheerio.CheerioAPI, element: cheerio.Cheerio<cheerio.Element>): string {
  // Clone to avoid modifying original
  const clone = element.clone();
  
  // Step 1: Replace <script type="math/tex"> with $latex$
  // The script tags contain the original LaTeX - this is the source of truth
  clone.find('script[type="math/tex"]').each((_, elem) => {
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
  
  // Step 4: Clean up whitespace carefully - preserve $...$ intact
  // First, protect the $...$ expressions
  const mathExpressions: string[] = [];
  html = html.replace(/\$\$[^$]+\$\$|\$[^$]+\$/g, (match) => {
    mathExpressions.push(match);
    return `__MATH_${mathExpressions.length - 1}__`;
  });
  
  // Now clean up whitespace
  html = html
    .replace(/\s+/g, ' ')  // Collapse whitespace
    .replace(/>\s+</g, '> <')  // Keep single space between tags for text flow
    .trim();
  
  // Restore math expressions with proper spacing
  html = html.replace(/__MATH_(\d+)__/g, (_, index) => {
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
    await context.close();
    await browser.close();
    
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
    const sampleTests: Array<{ input: string; output: string }> = [];
    $('.sample-test').each((_, elem) => {
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

