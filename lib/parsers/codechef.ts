import { chromium } from 'playwright';
import { ProblemMetadata } from '../types';

export async function parseCodechef(url: string): Promise<ProblemMetadata> {
  const browser = await chromium.launch({ 
    headless: true 
  });
  
  try {
    const page = await browser.newPage();
    
    // Block images and fonts to speed up loading
    await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2}', route => route.abort());
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for the problem statement to be visible
    try {
      await page.waitForSelector('#problem-statement, .problem-statement, h1', { timeout: 15000 });
    } catch (e) {
      console.log('Timeout waiting for specific selector, proceeding with available content...');
    }

    // Extract data using page.evaluate to run in browser context
    const data = await page.evaluate(() => {
      const doc = document;
      
      // 1. Find Title
      let title = '';
      const titleSelectors = ['h1', '.problem-title', 'header h1', '[class*="ProblemTitle"]'];
      for (const selector of titleSelectors) {
        const el = doc.querySelector(selector);
        if (el && el.textContent?.trim()) {
          title = el.textContent.trim();
          break;
        }
      }

      // 2. Find Content Container
      let content = doc.querySelector('#problem-statement');
      if (!content) content = doc.querySelector('[class*="problem-statement"]');
      if (!content) content = doc.querySelector('.problem-statement');
      if (!content) content = doc.querySelector('main'); // Fallback

      if (!content) throw new Error('Could not locate problem content');

      // 3. CLEANING - CRITICAL FOR DUPLICATES
      
      // A. Remove MathJax/Katex duplicates
      // Remove assistive MathML (hidden text for screen readers that causes "S S SS")
      content.querySelectorAll('.mjx-assistive-mathml').forEach(el => el.remove());
      content.querySelectorAll('annotation').forEach(el => el.remove());
      content.querySelectorAll('.katex-mathml').forEach(el => el.remove());
      
      // Note: Do NOT remove [aria-hidden="true"] or script tags blindly. 
      // MathJax often marks the visual output as aria-hidden="true" so screen readers use the assistive-mathml.
      // Since we removed the assistive-mathml, we MUST keep the visual output.

      // B. Remove UI Clutter
      content.querySelectorAll('button').forEach(el => el.remove());
      content.querySelectorAll('[class*="copy"]').forEach(el => el.remove());
      content.querySelectorAll('[aria-label="Copy to clipboard"]').forEach(el => el.remove());
      content.querySelectorAll('a[href*="learning"]').forEach(el => el.remove());
      content.querySelectorAll('[class*="bootcamp"], [class*="banner"], [class*="social"]').forEach(el => el.remove());
      
      // Remove "Submit" or "My Submissions" buttons often found at bottom
      content.querySelectorAll('a[href*="/submit/"]').forEach(el => el.remove());
      content.querySelectorAll('a[href*="/status/"]').forEach(el => el.remove());

      // 4. Extract Sample Test Cases
      const sampleTests: Array<{ input: string; output: string }> = [];
      
      // Strategy 1: Look for specific CodeChef "values" containers (New UI)
      // These usually contain two pre tags: one for input, one for output.
      const valueContainers = content.querySelectorAll('[class*="values"]');
      if (valueContainers.length > 0) {
          valueContainers.forEach(container => {
              const pres = container.querySelectorAll('pre');
              if (pres.length >= 2) {
                  const input = pres[0].textContent?.trim() || '';
                  const output = pres[1].textContent?.trim() || '';
                  if (input && output) {
                      sampleTests.push({ input, output });
                      container.remove(); // Remove from description
                  }
              }
          });
      }

      // Strategy 2: Header Scanning (Fallback)
      // Only run if we haven't found enough samples, or to catch stragglers
      const headers = Array.from(content.querySelectorAll('h3, h2, h4, strong, b'));
      
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        const text = header.textContent?.toLowerCase() || '';
        
        // Check for "Sample 1", "Sample Case 1", "Input", etc.
        if (text.includes('sample') || (text.includes('input') && !text.includes('format'))) {
            let inputEl = null;
            let outputEl = null;
            let outputHeader = null;

            // 1. Find Input Element (next PRE)
            let next = header.nextElementSibling;
            while(next && !inputEl) {
                // Stop if we hit another major header
                if (['H1','H2'].includes(next.tagName)) break;
                
                if (next.tagName === 'PRE') {
                    inputEl = next;
                } else if (next.querySelector('pre')) {
                    inputEl = next.querySelector('pre');
                }
                next = next.nextElementSibling;
            }

            if (inputEl) {
                // 2. Find Output Element
                // First, look for an explicit "Output" header between Input and next PRE
                // We need to look at the siblings of the CONTAINER of the input pre if it was nested
                let sibling = (inputEl.tagName === 'PRE' && inputEl.parentElement !== content) 
                    ? inputEl.parentElement?.nextElementSibling 
                    : inputEl.nextElementSibling;

                let potentialOutputHeader = null;
                
                // Scan a few siblings to find Output header or Output PRE
                let scanCount = 0;
                while(sibling && scanCount < 5 && !outputEl) {
                    const sText = sibling.textContent?.toLowerCase() || '';
                    
                    if (['H1','H2'].includes(sibling.tagName)) break; // Stop at major section

                    if (sText.includes('output')) {
                        potentialOutputHeader = sibling;
                    } else if (sibling.tagName === 'PRE') {
                         if (potentialOutputHeader || text.includes('sample')) {
                            outputEl = sibling;
                            outputHeader = potentialOutputHeader;
                        }
                    } else if (sibling.querySelector('pre')) {
                        // Found a wrapper with PRE
                        if (potentialOutputHeader || text.includes('sample')) {
                            outputEl = sibling.querySelector('pre');
                            outputHeader = potentialOutputHeader;
                        }
                    }
                    sibling = sibling.nextElementSibling;
                    scanCount++;
                }
            }

            if (inputEl && outputEl) {
                const inputVal = inputEl.textContent?.trim() || '';
                const outputVal = outputEl.textContent?.trim() || '';
                
                if (inputVal && outputVal) {
                    sampleTests.push({ input: inputVal, output: outputVal });
                    
                    // Remove elements from DOM to clean description
                    // Be careful to remove the wrapper if we selected a child PRE
                    header.remove();
                    
                    const inputToRemove = inputEl.closest('div') && inputEl.closest('div') !== content 
                        ? inputEl.closest('div') 
                        : inputEl;
                    inputToRemove?.remove();

                    if (outputHeader) outputHeader.remove();
                    
                    const outputToRemove = outputEl.closest('div') && outputEl.closest('div') !== content 
                        ? outputEl.closest('div') 
                        : outputEl;
                    outputToRemove?.remove();
                }
            }
        }
    }

      // 5. Extract Metadata
      let difficulty = '';
      const diffEl = doc.querySelector('[class*="difficulty"], [class*="rating"]');
      if (diffEl) difficulty = diffEl.textContent?.replace('Difficulty', '').trim() || '';

      const tags: string[] = [];
      doc.querySelectorAll('[class*="tag"]').forEach(el => {
        const t = el.textContent?.trim();
        if (t) tags.push(t);
      });

      // 6. Final HTML
      // Trim whitespace
      let descriptionHtml = content.innerHTML;
      
      return {
        title,
        descriptionHtml,
        sampleTests,
        difficulty,
        tags
      };
    });

    // 7. Construct Result
    const urlMatch = url.match(/problems\/([^\/\?]+)/);
    const problemId = urlMatch ? urlMatch[1] : 'unknown';
    const id = `codechef-${problemId}`;
    const now = new Date().toISOString();

    // Add title to description if not present (User requested Bold Title)
    // We prepend it to the HTML
    const finalDescription = `<h2 class="text-2xl font-bold mb-4">${data.title}</h2>${data.descriptionHtml}`;

    return {
      id,
      platform: 'codechef',
      problemId,
      title: data.title || `CodeChef Problem ${problemId}`,
      description: finalDescription,
      sampleTests: data.sampleTests,
      difficulty: data.difficulty,
      tags: data.tags,
      url,
      createdAt: now,
      updatedAt: now,
    };

  } catch (error) {
    console.error(`Error parsing CodeChef URL ${url}:`, error);
    throw error;
  } finally {
    await browser.close();
  }
}

