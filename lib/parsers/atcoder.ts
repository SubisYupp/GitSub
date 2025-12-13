import * as cheerio from 'cheerio';
import { ProblemMetadata } from '../types';
import { fetchWithHeaders } from './utils';

export async function parseAtcoder(url: string): Promise<ProblemMetadata> {
  const response = await fetchWithHeaders(url);
  
  const html = await response.text();
  const $ = cheerio.load(html);
  
  // Extract problem title
  const title = $('h2, h3').first().text().trim() || $('title').text().trim();
  
  // Extract problem statement
  const problemSection = $('.part, .lang-en, [class*="problem"]');
  let description = '';
  problemSection.each((_, elem) => {
    const text = $(elem).html() || '';
    if (text.length > description.length) {
      description = text;
    }
  });
  
  // If no specific section found, get main content
  if (!description) {
    description = $('main, .container').html() || '';
  }
  
  // Extract sample tests
  const sampleTests: Array<{ input: string; output: string }> = [];
  $('pre').each((_, elem) => {
    const text = $(elem).text().trim();
    if (text && text.length > 0) {
      // AtCoder typically has input/output in separate pre tags
      const prevText = $(elem).prev().text().toLowerCase();
      if (prevText.includes('input') || prevText.includes('sample input')) {
        const nextPre = $(elem).nextAll('pre').first();
        if (nextPre.length) {
          sampleTests.push({
            input: text,
            output: nextPre.text().trim(),
          });
        }
      }
    }
  });
  
  // Extract problem ID from URL
  const urlMatch = url.match(/\/([a-z]+)\/(\d+)\/tasks\/([a-z0-9_]+)/i);
  const problemId = urlMatch ? `${urlMatch[1]}-${urlMatch[3]}` : '';
  
  const id = `atcoder-${problemId}`;
  const now = new Date().toISOString();
  
  return {
    id,
    platform: 'atcoder',
    problemId,
    title,
    description,
    sampleTests,
    tags: [],
    url,
    createdAt: now,
    updatedAt: now,
  };
}

