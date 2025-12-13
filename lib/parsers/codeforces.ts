import * as cheerio from 'cheerio';
import { ProblemMetadata } from '../types';
import { fetchWithHeaders } from './utils';

export async function parseCodeforces(url: string): Promise<ProblemMetadata> {
  const response = await fetchWithHeaders(url);
  
  const html = await response.text();
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
  
  // Extract problem ID from URL (e.g., "158A" from /problem/158/A)
  const urlMatch = url.match(/\/problem\/(\d+)\/([A-Z])/);
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
}

