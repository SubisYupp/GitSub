import puppeteer from 'puppeteer';
import { ProblemMetadata } from '../types';

export async function parseCodechef(url: string): Promise<ProblemMetadata> {
  // CodeChef uses React and loads content dynamically, so we need Puppeteer
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for problem content to load - CodeChef uses various selectors
    await page.waitForSelector('h1, [class*="problem"], [class*="statement"]', { timeout: 10000 }).catch(() => {
      // Continue even if specific selector not found
    });
    
    // Extract problem details
    const problemData = await page.evaluate(() => {
      // Try multiple selectors for title
      const titleSelectors = [
        'h1',
        '[class*="problem-title"]',
        '[class*="ProblemTitle"]',
        '.problem-statement h1',
        'header h1',
      ];
      
      let title = '';
      for (const selector of titleSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          title = el.textContent?.trim() || '';
          if (title) break;
        }
      }
      
      // Try multiple selectors for problem statement
      const descriptionSelectors = [
        '[class*="problem-statement"]',
        '[class*="ProblemStatement"]',
        '[class*="problem-content"]',
        '[class*="content"]',
        '.problem-statement',
        'main',
      ];
      
      let description = '';
      for (const selector of descriptionSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          const html = el.innerHTML || '';
          if (html.length > 100) { // Make sure we got substantial content
            description = html;
            break;
          }
        }
      }
      
      // If still no description, try to get the main content area
      if (!description) {
        const mainContent = document.querySelector('main, [role="main"], .main-content');
        if (mainContent) {
          description = mainContent.innerHTML || '';
        }
      }
      
      // Extract sample test cases
      const sampleTests: Array<{ input: string; output: string }> = [];
      
      // Look for input/output sections
      const inputOutputSections = document.querySelectorAll('[class*="input"], [class*="output"], [class*="sample"]');
      inputOutputSections.forEach((section) => {
        const preTags = section.querySelectorAll('pre');
        if (preTags.length >= 2) {
          sampleTests.push({
            input: preTags[0].textContent?.trim() || '',
            output: preTags[1].textContent?.trim() || '',
          });
        }
      });
      
      // Alternative: look for adjacent pre tags
      if (sampleTests.length === 0) {
        const allPre = document.querySelectorAll('pre');
        for (let i = 0; i < allPre.length - 1; i++) {
          const prevText = allPre[i].previousElementSibling?.textContent?.toLowerCase() || '';
          const nextText = allPre[i + 1].previousElementSibling?.textContent?.toLowerCase() || '';
          
          if ((prevText.includes('input') || prevText.includes('sample')) && 
              (nextText.includes('output') || nextText.includes('sample'))) {
            sampleTests.push({
              input: allPre[i].textContent?.trim() || '',
              output: allPre[i + 1].textContent?.trim() || '',
            });
            i++; // Skip next pre as we used it
          }
        }
      }
      
      // Extract difficulty/rating
      const difficultySelectors = [
        '[class*="difficulty"]',
        '[class*="rating"]',
        '[class*="Difficulty"]',
        '[class*="Rating"]',
      ];
      
      let difficulty = '';
      for (const selector of difficultySelectors) {
        const el = document.querySelector(selector);
        if (el) {
          difficulty = el.textContent?.trim() || '';
          if (difficulty) break;
        }
      }
      
      // Extract tags
      const tags: string[] = [];
      document.querySelectorAll('[class*="tag"], [class*="Tag"], .tag').forEach((tag) => {
        const tagText = tag.textContent?.trim();
        if (tagText && !tags.includes(tagText)) {
          tags.push(tagText);
        }
      });
      
      return {
        title,
        description,
        difficulty,
        sampleTests,
        tags,
      };
    });
    
    await browser.close();
    
    // Validate that we got at least a title or description
    if (!problemData.title && !problemData.description) {
      throw new Error('Could not extract problem content. The page structure may have changed or the URL is invalid.');
    }
    
    // Extract problem ID from URL
    const urlMatch = url.match(/problems\/([^\/\?]+)/);
    const problemId = urlMatch ? urlMatch[1] : '';
    
    if (!problemId) {
      throw new Error('Could not extract problem ID from URL');
    }
    
    const id = `codechef-${problemId}`;
    const now = new Date().toISOString();
    
    return {
      id,
      platform: 'codechef',
      problemId,
      title: problemData.title || `CodeChef Problem ${problemId}`,
      description: problemData.description || '<p>Problem description could not be extracted.</p>',
      sampleTests: problemData.sampleTests,
      difficulty: problemData.difficulty,
      tags: problemData.tags,
      url,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

