import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { ProblemMetadata } from '../types';

export async function parseCodeforces(url: string): Promise<ProblemMetadata> {
  // Codeforces has anti-bot protection, so we use Playwright for better evasion
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });
  const page = await context.newPage();
  
  try {
    console.log(`Navigating to Codeforces: ${url}`);
    
    // Navigate to the page
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for problem content to load
    try {
      await page.waitForSelector('.problem-statement, .title', { 
        timeout: 10000 
      });
    } catch {
      console.log('Waiting for Codeforces content...');
    }
    
    // Additional wait for content
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    
    // Get the HTML content
    const html = await page.content();
    await context.close();
    await browser.close();
    
    // Parse with Cheerio
    const $ = cheerio.load(html);
    
    // Check if we got a valid problem page
    const problemStatement = $('.problem-statement');
    if (problemStatement.length === 0) {
      throw new Error('Could not find problem statement. The URL might be invalid or the page structure has changed.');
    }
    
    // Extract problem title
    const title = $('.title').first().text().trim() || 
                  problemStatement.find('.title').first().text().trim() ||
                  $('h1, h2').first().text().trim() ||
                  'Untitled Problem';
    
    // Extract problem statement - try multiple selectors
    let description = problemStatement.find('.header + div').html() || '';
    if (!description) {
      // Try alternative selector
      description = problemStatement.find('> div').not('.header').first().html() || '';
    }
    if (!description) {
      // Fallback to entire problem statement
      description = problemStatement.html() || '';
    }
    
    // Extract input/output specifications
    const inputSpec = problemStatement.find('.input-specification').html() || '';
    const outputSpec = problemStatement.find('.output-specification').html() || '';
    
    // Extract sample tests
    const sampleTests: Array<{ input: string; output: string }> = [];
    $('.sample-test').each((_, elem) => {
      const input = $(elem).find('.input pre').text().trim();
      const output = $(elem).find('.output pre').text().trim();
      if (input && output) {
        sampleTests.push({ input, output });
      }
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
  } catch (error) {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    throw error;
  }
}

