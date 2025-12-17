import { ProblemMetadata } from '../types';
import { withBrowserContext } from './browser-manager';

export async function parseCodechef(url: string): Promise<ProblemMetadata> {
  return withBrowserContext(async (context) => {
    const page = await context.newPage();
    
    // Block images and fonts to speed up loading
    await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2}', route => route.abort());
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for the problem statement to be visible
    try {
      await page.waitForSelector('#problem-statement', { timeout: 15000 });
    } catch (e) {
      console.log('Timeout waiting for #problem-statement, trying alternatives...');
      try {
        await page.waitForSelector('.problem-statement, [class*="problemBody"]', { timeout: 5000 });
      } catch {
        console.log('Could not find problem statement container');
      }
    }

    // Additional wait for dynamic content
    await page.waitForTimeout(2000);

    // Extract data using page.evaluate to run in browser context
    const data = await page.evaluate(() => {
      // ===== 1. EXTRACT TITLE =====
      let title = '';
      const titleEl = document.querySelector('#problem-statement h3') || 
                      document.querySelector('h1') ||
                      document.querySelector('[class*="problem"] h3');
      if (titleEl) {
        title = titleEl.textContent?.trim() || '';
      }

      // ===== 2. GET PROBLEM STATEMENT CONTAINER =====
      const container = document.querySelector('#problem-statement') ||
                        document.querySelector('[class*="problemBody"]') ||
                        document.querySelector('.problem-statement');
      
      if (!container) {
        return {
          title,
          descriptionHtml: '<p>Could not find problem content.</p>',
          sampleTests: [],
          difficulty: '',
          tags: []
        };
      }

      // ===== 3. EXTRACT SAMPLE TESTS FIRST (before cleaning) =====
      const sampleTests: Array<{ input: string; output: string }> = [];
      
      // Strategy 1: Look for the input/output table structure
      // CodeChef uses a table-like structure with _input_output__table class
      const ioTable = container.querySelector('[class*="input_output__table"]');
      if (ioTable) {
        const valuesContainer = ioTable.querySelector('[class*="values__container"]');
        if (valuesContainer) {
          const valueDivs = valuesContainer.querySelectorAll('[class*="values"]');
          if (valueDivs.length >= 2) {
            const inputPre = valueDivs[0].querySelector('pre');
            const outputPre = valueDivs[1].querySelector('pre');
            if (inputPre && outputPre) {
              sampleTests.push({
                input: inputPre.textContent?.trim() || '',
                output: outputPre.textContent?.trim() || ''
              });
            }
          }
        }
      }

      // Strategy 2: Find all PRE tags and pair them
      if (sampleTests.length === 0) {
        const allPres = container.querySelectorAll('pre');
        const preArray = Array.from(allPres);
        
        for (let i = 0; i < preArray.length - 1; i += 2) {
          const inputText = preArray[i].textContent?.trim() || '';
          const outputText = preArray[i + 1]?.textContent?.trim() || '';
          if (inputText && outputText) {
            sampleTests.push({
              input: inputText,
              output: outputText
            });
          }
        }
      }

      // Strategy 3: Look for Sample headers and extract following PREs
      if (sampleTests.length === 0) {
        const headers = container.querySelectorAll('h3, h4, strong, b');
        headers.forEach(header => {
          const text = header.textContent?.toLowerCase() || '';
          if (text.includes('sample') && text.includes('input')) {
            let inputPre = null;
            let outputPre = null;
            
            // Find next PRE for input
            let sibling = header.nextElementSibling;
            while (sibling && !inputPre) {
              if (sibling.tagName === 'PRE') {
                inputPre = sibling;
              } else if (sibling.querySelector('pre')) {
                inputPre = sibling.querySelector('pre');
              }
              sibling = sibling.nextElementSibling;
            }
            
            // Continue to find output PRE
            while (sibling && !outputPre) {
              if (sibling.tagName === 'PRE') {
                outputPre = sibling;
              } else if (sibling.querySelector('pre')) {
                outputPre = sibling.querySelector('pre');
              }
              sibling = sibling.nextElementSibling;
            }
            
            if (inputPre && outputPre) {
              sampleTests.push({
                input: inputPre.textContent?.trim() || '',
                output: outputPre.textContent?.trim() || ''
              });
            }
          }
        });
      }

      // ===== 4. CLEAN THE DOM FOR DESCRIPTION =====
      const clone = container.cloneNode(true) as HTMLElement;
      
      // Remove MathJax duplicates (assistive text for screen readers)
      // MathJax creates: 1) visual output (.MathJax) 2) assistive MathML (.mjx-assistive-mathml)
      // We need to keep only ONE representation
      clone.querySelectorAll('.mjx-assistive-mathml').forEach(el => el.remove());
      clone.querySelectorAll('.MJX_Assistive_MathML').forEach(el => el.remove());
      clone.querySelectorAll('annotation').forEach(el => el.remove());
      
      // Remove MathJax containers that have BOTH mjx-math and text duplicates
      // Sometimes MathJax wraps content in mjx-container with duplicate text nodes
      clone.querySelectorAll('mjx-container').forEach(container => {
        // Keep only the rendered math, remove any duplicate text
        const assistive = container.querySelector('.mjx-assistive-mathml, [class*="Assistive"]');
        if (assistive) assistive.remove();
      });
      
      // Remove Katex duplicates if present
      clone.querySelectorAll('.katex-mathml').forEach(el => el.remove());
      
      // Remove any remaining hidden/screen-reader-only elements that duplicate content
      clone.querySelectorAll('[class*="sr-only"], [class*="visually-hidden"]').forEach(el => el.remove());
      
      // Remove copy buttons and UI elements
      clone.querySelectorAll('button').forEach(el => el.remove());
      clone.querySelectorAll('[class*="copy"]').forEach(el => el.remove());
      clone.querySelectorAll('[aria-label*="Copy"]').forEach(el => el.remove());
      clone.querySelectorAll('[class*="icon"]').forEach(el => el.remove());
      
      // Remove the sample input/output section from description
      clone.querySelectorAll('[class*="input_output"]').forEach(el => el.remove());
      
      // Remove Sample headers and their content
      const sampleHeaders = clone.querySelectorAll('h3, h4');
      sampleHeaders.forEach(header => {
        const text = header.textContent?.toLowerCase() || '';
        if (text.includes('sample')) {
          // Remove this header and following siblings until next header
          let sibling = header.nextElementSibling;
          const toRemove: Element[] = [header];
          while (sibling && !['H2', 'H3', 'H4'].includes(sibling.tagName)) {
            toRemove.push(sibling);
            sibling = sibling.nextElementSibling;
          }
          toRemove.forEach(el => el.remove());
        }
      });

      // Remove Explanation section (we show sample tests separately)
      const explanationHeaders = clone.querySelectorAll('h3, h4, strong');
      explanationHeaders.forEach(header => {
        const text = header.textContent?.toLowerCase() || '';
        if (text.includes('explanation')) {
          let sibling = header.nextElementSibling;
          const toRemove: Element[] = [header];
          while (sibling && !['H2', 'H3', 'H4'].includes(sibling.tagName)) {
            toRemove.push(sibling);
            sibling = sibling.nextElementSibling;
          }
          toRemove.forEach(el => el.remove());
        }
      });

      // Remove first h3 if it's the title (we add it separately)
      const firstH3 = clone.querySelector('h3');
      if (firstH3 && firstH3.textContent?.trim() === title) {
        firstH3.remove();
      }

      // ===== 5. EXTRACT DIFFICULTY AND TAGS =====
      let difficulty = '';
      const diffEl = document.querySelector('[class*="difficulty"], [class*="rating"]');
      if (diffEl) {
        difficulty = diffEl.textContent?.trim() || '';
      }

      const tags: string[] = [];
      document.querySelectorAll('[class*="tag"]:not([class*="tagline"])').forEach(el => {
        const t = el.textContent?.trim();
        if (t && t.length < 30 && !tags.includes(t)) {
          tags.push(t);
        }
      });

      return {
        title,
        descriptionHtml: clone.innerHTML || '',
        sampleTests,
        difficulty,
        tags
      };
    });

    // Log extracted sample tests for debugging
    console.log('Extracted sample tests:', JSON.stringify(data.sampleTests, null, 2));

    // 7. Construct Result
    const urlMatch = url.match(/problems\/([^\/\?]+)/);
    const problemId = urlMatch ? urlMatch[1] : 'unknown';
    const id = `codechef-${problemId}`;
    const now = new Date().toISOString();

    // Add title to description with proper styling
    const finalDescription = `<h2 class="text-2xl font-bold mb-6">${data.title}</h2>${data.descriptionHtml}`;

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
  });
}

