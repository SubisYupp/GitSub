import puppeteer from 'puppeteer';
import { ProblemMetadata } from '../types';

export async function parseLeetcode(url: string): Promise<ProblemMetadata> {
  // Normalize URL - remove /description/ if present
  const normalizedUrl = url.replace(/\/description\/?$/, '');
  
  // LeetCode requires JavaScript rendering, so we use Puppeteer
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  
  try {
    // Set a realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log(`Navigating to: ${normalizedUrl}`);
    
    // Navigate to the page
    await page.goto(normalizedUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Check if we're on a login page or error page
    const currentUrl = page.url();
    if (currentUrl.includes('accounts/login') || currentUrl.includes('signin')) {
      throw new Error('LeetCode requires login. Please ensure you can access the problem page in a browser first.');
    }
    
    // Wait longer for LeetCode's React app to fully load
    await page.waitForTimeout(5000);
    
    // Scroll down a bit to trigger lazy loading
    await page.evaluate(() => {
      window.scrollTo(0, 300);
    });
    await page.waitForTimeout(2000);
    
    // Wait for any content to load - try multiple selectors with longer timeout
    await Promise.race([
      page.waitForSelector('div[class*="description"]', { timeout: 10000 }).catch(() => null),
      page.waitForSelector('[data-track-load="qd_description_content"]', { timeout: 10000 }).catch(() => null),
      page.waitForSelector('h1', { timeout: 10000 }).catch(() => null),
      page.waitForSelector('div[class*="content"]', { timeout: 10000 }).catch(() => null),
      page.waitForTimeout(5000), // Wait at least 5 seconds for content to load
    ]);
    
    // Extract problem details
    const problemData = await page.evaluate(() => {
      // Try multiple selectors for title - LeetCode's current structure
      const titleSelectors = [
        'div[class*="text-title-large"]',
        '[data-cy="question-title"]',
        'h1',
        'div[class*="question-title"]',
        'div[class*="Title"]',
        'header h1',
        'div[class*="title"]',
      ];
      
      let title = '';
      for (const selector of titleSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          title = el.textContent?.trim() || '';
          // Filter out generic titles
          if (title && title.length > 3 && !title.toLowerCase().includes('leetcode')) {
            break;
          }
        }
      }
      
      // Try multiple selectors for description - LeetCode's current structure
      const descriptionSelectors = [
        'div[class*="description"]',
        'div[class*="Description"]',
        '[data-track-load="qd_description_content"]',
        'div[class*="problem-description"]',
        'div[class*="content"]',
        'div[class*="Content"]',
        'div[class*="question-content"]',
        'div[class*="QuestionContent"]',
      ];
      
      let description = '';
      for (const selector of descriptionSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of Array.from(elements)) {
          const html = (el as HTMLElement).innerHTML || '';
          const text = (el as HTMLElement).textContent || '';
          // Make sure we got substantial content (at least 200 chars of text)
          if (text.length > 200 && html.length > 100) {
            description = html;
            break;
          }
        }
        if (description) break;
      }
      
      // If still no description, try to get from main content area
      if (!description) {
        const mainContent = document.querySelector('main, [role="main"], div[class*="main"], div[class*="content"]');
        if (mainContent) {
          const html = mainContent.innerHTML || '';
          const text = mainContent.textContent || '';
          if (text.length > 200) {
            description = html;
          }
        }
      }
      
      // Extract difficulty - try multiple selectors
      const difficultySelectors = [
        '[diff]',
        '[class*="difficulty"]',
        '[class*="Difficulty"]',
        '[data-difficulty]',
      ];
      
      let difficulty = '';
      for (const selector of difficultySelectors) {
        const el = document.querySelector(selector);
        if (el) {
          difficulty = el.getAttribute('diff') || 
                      el.getAttribute('data-difficulty') || 
                      el.textContent?.trim() || 
                      '';
          if (difficulty) break;
        }
      }
      
      // Extract sample test cases - try multiple approaches
      const sampleTests: Array<{ input: string; output: string }> = [];
      
      // Method 1: Look for example sections with LeetCode's current structure
      const examples = document.querySelectorAll('div[class*="example"], div[class*="Example"], pre');
      const exampleContainers: Element[] = [];
      
      // Find containers that have "Example" in their text
      document.querySelectorAll('div, section').forEach((container) => {
        const text = container.textContent?.toLowerCase() || '';
        if (text.includes('example') && text.includes('input') && text.includes('output')) {
          exampleContainers.push(container);
        }
      });
      
      exampleContainers.forEach((container) => {
        const preTags = container.querySelectorAll('pre, code');
        if (preTags.length >= 2) {
          // Usually first is input, second is output
          sampleTests.push({
            input: preTags[0].textContent?.trim() || '',
            output: preTags[1].textContent?.trim() || '',
          });
        }
      });
      
      // Method 2: Look for input/output sections
      if (sampleTests.length === 0) {
        const inputOutputSections = document.querySelectorAll('div[class*="input"], div[class*="output"], div[class*="sample"]');
        inputOutputSections.forEach((section) => {
          const preTags = section.querySelectorAll('pre, code');
          if (preTags.length >= 2) {
            sampleTests.push({
              input: preTags[0].textContent?.trim() || '',
              output: preTags[1].textContent?.trim() || '',
            });
          }
        });
      }
      
      // Method 3: Look for adjacent pre/code tags with labels
      if (sampleTests.length === 0) {
        const allCode = document.querySelectorAll('pre, code');
        for (let i = 0; i < allCode.length - 1; i++) {
          const prevText = allCode[i].previousElementSibling?.textContent?.toLowerCase() || '';
          const nextText = allCode[i + 1].previousElementSibling?.textContent?.toLowerCase() || '';
          const parentText = allCode[i].parentElement?.textContent?.toLowerCase() || '';
          
          if ((prevText.includes('input') || parentText.includes('input')) && 
              (nextText.includes('output') || parentText.includes('output'))) {
            sampleTests.push({
              input: allCode[i].textContent?.trim() || '',
              output: allCode[i + 1].textContent?.trim() || '',
            });
            i++; // Skip next as we used it
          }
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
      
      // Extract problem number and slug from URL
      const pathname = window.location.pathname;
      const urlMatch = pathname.match(/\/problems\/([^\/]+)/);
      const problemSlug = urlMatch ? urlMatch[1] : '';
      
      // Also try to extract number if available
      const numberMatch = pathname.match(/\/(\d+)\//);
      const problemNumber = numberMatch ? numberMatch[1] : '';
      
      const problemId = problemNumber ? `${problemNumber}-${problemSlug}` : problemSlug;
      
      return {
        title,
        description,
        difficulty,
        sampleTests,
        tags,
        problemId,
      };
    });
    
    await browser.close();
    
    console.log(`Extracted - Title: ${problemData.title ? 'Yes' : 'No'}, Description: ${problemData.description ? 'Yes (' + problemData.description.length + ' chars)' : 'No'}`);
    
    // Validate that we got at least a title or description
    if (!problemData.title && !problemData.description) {
      throw new Error('Could not extract problem content. The page structure may have changed or the URL is invalid. Please try the standard problem URL format: https://leetcode.com/problems/two-sum/');
    }
    
    const id = `leetcode-${problemData.problemId}`;
    const now = new Date().toISOString();
    
    return {
      id,
      platform: 'leetcode',
      problemId: problemData.problemId,
      title: problemData.title || `LeetCode Problem ${problemData.problemId}`,
      description: problemData.description || '<p>Problem description could not be extracted.</p>',
      sampleTests: problemData.sampleTests,
      difficulty: problemData.difficulty,
      tags: problemData.tags,
      url: normalizedUrl, // Use normalized URL
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    await browser.close();
    throw error;
  }
}

