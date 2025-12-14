import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import { ProblemMetadata } from '../types';

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
  
  // Use Playwright for better reliability with AtCoder
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
  });
  const page = await context.newPage();
  
  try {
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
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    
    // Get the HTML content
    const html = await page.content();
    await context.close();
    await browser.close();
    
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
      const englishSection = taskStatement.find('.lang-en, span.lang-en');
      if (englishSection.length > 0) {
        description = englishSection.first().html() || '';
      } else {
        // If no English section, get the first visible lang section
        const langSections = taskStatement.find('span.lang > span');
        langSections.each((_, elem) => {
          const html = $(elem).html() || '';
          const text = $(elem).text() || '';
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
        const html = $(elem).html() || '';
        if (html.length > description.length) {
          description = html;
        }
      });
    }
    
    if (!description) {
      $('.part, [class*="problem"], [class*="statement"]').each((_, elem) => {
        const html = $(elem).html() || '';
        if (html.length > description.length) {
          description = html;
        }
      });
    }
    
    // Fallback to main content
    if (!description) {
      description = $('main, .container, #main-container').html() || '';
    }
    
    // Extract sample tests - look for input/output sections in English
    const sampleTests: Array<{ input: string; output: string }> = [];
    
    // Method 1: Look for pre tags with IDs like pre-sample0, pre-sample1, etc. (actual test data)
    // These are the actual sample test cases, not copy buttons
    const samplePreTags = $('pre[id^="pre-sample"]').not('.btn-copy, .btn, [class*="copy"]');
    
    // Group them into pairs (input/output)
    for (let i = 0; i < samplePreTags.length - 1; i += 2) {
      const inputPre = samplePreTags.eq(i);
      const outputPre = samplePreTags.eq(i + 1);
      
      const inputText = inputPre.text().trim();
      const outputText = outputPre.text().trim();
      
      // Verify these are actual test cases (not copy buttons)
      if (inputText && outputText && 
          !inputText.toLowerCase().includes('copy') && 
          !outputText.toLowerCase().includes('copy') &&
          inputText.length > 0 && outputText.length > 0) {
        sampleTests.push({
          input: inputText,
          output: outputText,
        });
      }
    }
    
    // Method 2: Look for sections with "Sample Input" and "Sample Output" in English
    if (sampleTests.length === 0) {
      const englishSections = $('.lang-en section, .lang-en div, span.lang-en section, span.lang-en div');
      englishSections.each((_, section) => {
        const sectionText = $(section).text().toLowerCase();
        if (sectionText.includes('sample input') || sectionText.includes('sample output')) {
          // Find pre tags, but exclude those inside copy buttons or button elements
          const preTags = $(section).find('pre')
            .not('.btn-copy, .btn, [class*="copy"]')
            .filter((_, el) => {
              // Exclude if parent is a button or has copy-related classes
              const parent = $(el).parent();
              return !parent.hasClass('btn-copy') && 
                     !parent.hasClass('btn') && 
                     !parent.hasClass('btn-copy') &&
                     parent[0]?.tagName !== 'BUTTON';
            });
          
          if (preTags.length >= 2) {
            // Usually first is input, second is output
            const inputText = preTags.eq(0).text().trim();
            const outputText = preTags.eq(1).text().trim();
            // Filter out "Copy" button text and verify it's actual test data
            if (inputText && !inputText.toLowerCase().includes('copy') && 
                outputText && !outputText.toLowerCase().includes('copy') &&
                inputText.length > 2 && outputText.length > 2) {
              sampleTests.push({
                input: inputText,
                output: outputText,
              });
            }
          }
        }
      });
    }
    
    // Method 2: Look for adjacent pre tags with labels in English sections
    if (sampleTests.length === 0) {
      $('.lang-en pre, span.lang-en pre').not('.btn-copy, .btn, [class*="copy"]').each((_, elem) => {
        const text = $(elem).text().trim();
        // Skip if it's a copy button or contains "Copy" text
        if (text && text.length > 0 && !text.toLowerCase().includes('copy')) {
          const prevText = $(elem).prev().text().toLowerCase();
          const parentText = $(elem).parent().text().toLowerCase();
          
          // Skip if previous element is a copy button
          if ($(elem).prev().hasClass('btn-copy') || $(elem).prev().hasClass('btn') || 
              $(elem).prev('[class*="copy"]').length > 0) {
            return;
          }
          
          if ((prevText.includes('input') || prevText.includes('sample') || 
               parentText.includes('input') || parentText.includes('sample')) && 
              !prevText.includes('output') && !prevText.includes('copy')) {
            const nextPre = $(elem).nextAll('pre').not('.btn-copy, .btn, [class*="copy"]').first();
            if (nextPre.length) {
              const nextText = nextPre.prev().text().toLowerCase();
              const nextPreText = nextPre.text().trim();
              if ((nextText.includes('output') || nextText.includes('sample')) && 
                  !nextText.includes('copy') && 
                  !nextPreText.toLowerCase().includes('copy')) {
                sampleTests.push({
                  input: text,
                  output: nextPreText,
                });
              }
            }
          }
        }
      });
    }
    
    // Method 3: Look for all pre tags and match input/output pairs (excluding copy buttons)
    if (sampleTests.length === 0) {
      const allPre = $('pre').not('.btn-copy, .btn, [class*="copy"]');
      for (let i = 0; i < allPre.length - 1; i++) {
        const currentPre = allPre.eq(i);
        const nextPre = allPre.eq(i + 1);
        const currentText = currentPre.text().trim();
        const nextText = nextPre.text().trim();
        
        // Skip if text contains "Copy" or is too short (likely a button)
        if (currentText.toLowerCase().includes('copy') || 
            nextText.toLowerCase().includes('copy') ||
            currentText.length < 3 || nextText.length < 3) {
          continue;
        }
        
        // Check if they're in an English section
        const currentParent = currentPre.parent();
        const parentText = currentParent.text().toLowerCase();
        const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(parentText);
        
        // Skip if parent is a copy button
        if (currentParent.hasClass('btn-copy') || currentParent.hasClass('btn') || 
            currentParent[0]?.tagName === 'BUTTON') {
          continue;
        }
        
        if (currentText && nextText && !hasJapanese) {
          // Check if previous element suggests this is input (but not a copy button)
          const prevElement = currentPre.prev();
          if (prevElement.hasClass('btn-copy') || prevElement.hasClass('btn') || 
              prevElement[0]?.tagName === 'BUTTON') {
            continue;
          }
          
          const prevText = prevElement.text().toLowerCase();
          if ((prevText.includes('input') || prevText.includes('sample')) && 
              !prevText.includes('copy')) {
            const nextPrevElement = nextPre.prev();
            const nextPrevText = nextPrevElement.text().toLowerCase();
            if ((nextPrevText.includes('output') || nextPrevText.includes('sample')) && 
                !nextPrevText.includes('copy')) {
              sampleTests.push({
                input: currentText,
                output: nextText,
              });
              i++; // Skip next as we used it
            }
          }
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
  } catch (error) {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    throw error;
  }
}
