import { ProblemMetadata } from '../types';

const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql/';

interface LeetCodeGraphQLResponse {
  data: {
    question: {
      questionId: string;
      title: string;
      difficulty: string;
      content: string;
      exampleTestcases: string;
      topicTags: Array<{ name: string }>;
      codeSnippets?: Array<{ lang: string; code: string }>;
    } | null;
  };
}

export async function parseLeetcode(url: string): Promise<ProblemMetadata> {
  // Normalize URL - remove /description/ if present
  const normalizedUrl = url.replace(/\/description\/?$/, '');
  
  // Extract problem slug from URL
  // Format: https://leetcode.com/problems/two-sum/ or https://leetcode.com/problems/two-sum
  const slugMatch = normalizedUrl.match(/\/problems\/([^\/\?]+)/);
  if (!slugMatch || !slugMatch[1]) {
    throw new Error('Invalid LeetCode URL. Expected format: https://leetcode.com/problems/problem-name/');
  }
  
  const titleSlug = slugMatch[1];
  console.log(`Fetching LeetCode problem via GraphQL: ${titleSlug}`);
  
  // GraphQL query to get problem details
  const query = `
    query getQuestionDetail($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        title
        difficulty
        content
        exampleTestcases
        topicTags {
          name
        }
        codeSnippets {
          lang
          code
        }
      }
    }
  `;
  
  const variables = {
    titleSlug: titleSlug,
  };
  
  try {
    // Make GraphQL request
    const response = await fetch(LEETCODE_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': normalizedUrl,
        'Origin': 'https://leetcode.com',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
    }
    
    const result: LeetCodeGraphQLResponse = await response.json();
    
    if (!result.data || !result.data.question) {
      throw new Error('Problem not found. Please check the URL and try again.');
    }
    
    const question = result.data.question;
    
    // Parse example test cases
    const sampleTests: Array<{ input: string; output: string; explanation?: string }> = [];
    
    if (question.exampleTestcases) {
      // LeetCode provides test cases in a specific format
      // Usually: "input1\noutput1\ninput2\noutput2" or JSON format
      const testCases = question.exampleTestcases.trim();
      
      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(testCases);
        if (Array.isArray(parsed)) {
          parsed.forEach((test: any) => {
            if (test.input && test.output) {
              sampleTests.push({
                input: typeof test.input === 'string' ? test.input : JSON.stringify(test.input),
                output: typeof test.output === 'string' ? test.output : JSON.stringify(test.output),
                explanation: test.explanation,
              });
            }
          });
        }
      } catch {
        // If not JSON, try to parse line by line
        // Format might be: input1\noutput1\ninput2\noutput2
        const lines = testCases.split('\n').filter(line => line.trim());
        for (let i = 0; i < lines.length - 1; i += 2) {
          sampleTests.push({
            input: lines[i].trim(),
            output: lines[i + 1].trim(),
          });
        }
      }
    }
    
    // Extract tags
    const tags = question.topicTags.map(tag => tag.name);
    
    // Parse content (HTML) - LeetCode returns HTML content
    const description = question.content || '';
    
    // Generate problem ID
    const problemId = question.questionId ? `${question.questionId}-${titleSlug}` : titleSlug;
    const id = `leetcode-${problemId}`;
    
    const now = new Date().toISOString();
    
    // Extract constraints from content if available
    let constraints = '';
    const constraintsMatch = description.match(/<strong>Constraints?:<\/strong>[\s\S]*?(?=<h3|$)/i);
    if (constraintsMatch) {
      constraints = constraintsMatch[0];
    }
    
    return {
      id,
      platform: 'leetcode',
      problemId,
      title: question.title,
      description,
      constraints,
      sampleTests,
      difficulty: question.difficulty.toLowerCase(),
      tags,
      url: normalizedUrl,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    console.error('LeetCode GraphQL error:', error);
    throw new Error(
      error instanceof Error 
        ? `Failed to fetch LeetCode problem: ${error.message}`
        : 'Failed to fetch LeetCode problem. Please check the URL and try again.'
    );
  }
}
