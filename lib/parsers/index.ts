import { Platform, ProblemMetadata } from '../types';
import { parseCodeforces } from './codeforces';
import { parseLeetcode } from './leetcode';
import { parseAtcoder } from './atcoder';
import { parseCodechef } from './codechef';

export function detectPlatform(url: string): Platform | null {
  if (url.includes('codeforces.com')) return 'codeforces';
  if (url.includes('leetcode.com')) return 'leetcode';
  if (url.includes('atcoder.jp')) return 'atcoder';
  if (url.includes('codechef.com')) return 'codechef';
  return null;
}

export async function parseProblem(url: string): Promise<ProblemMetadata> {
  const platform = detectPlatform(url);
  
  if (!platform) {
    throw new Error('Unsupported platform. Supported: Codeforces, LeetCode, AtCoder, CodeChef');
  }
  
  switch (platform) {
    case 'codeforces':
      return parseCodeforces(url);
    case 'leetcode':
      return parseLeetcode(url);
    case 'atcoder':
      return parseAtcoder(url);
    case 'codechef':
      return parseCodechef(url);
    default:
      throw new Error('Unsupported platform');
  }
}

