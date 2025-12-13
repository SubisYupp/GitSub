// Normalize URLs to a canonical form for duplicate detection
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Remove trailing slashes
    urlObj.pathname = urlObj.pathname.replace(/\/+$/, '');
    
    // Platform-specific normalizations
    if (urlObj.hostname.includes('leetcode.com')) {
      // Remove /description/ from LeetCode URLs
      urlObj.pathname = urlObj.pathname.replace(/\/description\/?$/, '');
    }
    
    // Remove query parameters and fragments for duplicate detection
    urlObj.search = '';
    urlObj.hash = '';
    
    return urlObj.toString();
  } catch (error) {
    // If URL parsing fails, return original
    return url;
  }
}

