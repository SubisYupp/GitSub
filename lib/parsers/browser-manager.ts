import { Browser, BrowserContext, Page } from 'playwright';

// Check if running on Vercel/serverless
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Dynamic imports for different environments
let chromiumModule: typeof import('@sparticuz/chromium') | null = null;
let puppeteerCore: typeof import('puppeteer-core') | null = null;
let playwrightChromium: typeof import('playwright').chromium | null = null;

async function getChromiumPath(): Promise<string | undefined> {
  if (!chromiumModule) {
    chromiumModule = await import('@sparticuz/chromium');
  }
  return chromiumModule.default.executablePath();
}

async function getPuppeteer() {
  if (!puppeteerCore) {
    puppeteerCore = await import('puppeteer-core');
  }
  return puppeteerCore.default;
}

async function getPlaywright() {
  if (!playwrightChromium) {
    const playwright = await import('playwright');
    playwrightChromium = playwright.chromium;
  }
  return playwrightChromium;
}

// Unified browser interface for both Puppeteer and Playwright
interface UnifiedBrowser {
  type: 'puppeteer' | 'playwright';
  browser: any;
  close: () => Promise<void>;
}

interface UnifiedContext {
  type: 'puppeteer' | 'playwright';
  context: any;
  newPage: () => Promise<UnifiedPage>;
  close: () => Promise<void>;
}

export interface UnifiedPage {
  goto: (url: string, options?: { waitUntil?: string; timeout?: number }) => Promise<void>;
  content: () => Promise<string>;
  waitForSelector: (selector: string, options?: { timeout?: number }) => Promise<void>;
  waitForTimeout: (ms: number) => Promise<void>;
  evaluate: <T>(fn: () => T) => Promise<T>;
  route?: (pattern: string, handler: (route: any) => void) => Promise<void>;
  close: () => Promise<void>;
}

// Singleton browser manager
class BrowserManager {
  private static instance: BrowserManager;
  private browser: UnifiedBrowser | null = null;
  private initPromise: Promise<UnifiedBrowser> | null = null;
  private lastUsed: number = 0;
  private idleTimeout: NodeJS.Timeout | null = null;
  
  private readonly IDLE_TIMEOUT_MS = 5 * 60 * 1000;
  
  private constructor() {}
  
  static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }
  
  async getBrowser(): Promise<UnifiedBrowser> {
    this.lastUsed = Date.now();
    this.resetIdleTimeout();
    
    if (this.initPromise) {
      return this.initPromise;
    }
    
    if (this.browser) {
      return this.browser;
    }
    
    this.initPromise = this.launchBrowser();
    
    try {
      this.browser = await this.initPromise;
      return this.browser;
    } finally {
      this.initPromise = null;
    }
  }
  
  private async launchBrowser(): Promise<UnifiedBrowser> {
    if (isServerless) {
      console.log('[BrowserManager] Launching browser for serverless environment');

      try {
        // Try @sparticuz/chromium first
        return await this.launchWithSparticuzChromium();
      } catch (error) {
        console.warn('[BrowserManager] @sparticuz/chromium failed, trying fallback:', error);

        try {
          // Fallback: Try system chromium
          return await this.launchWithSystemChromium();
        } catch (fallbackError) {
          console.error('[BrowserManager] All chromium launch attempts failed');
          throw new Error(
            'Browser setup failed. This is likely due to missing Chromium binaries in the serverless environment. ' +
            'Please contact support or try again later.'
          );
        }
      }
    } else {
      // Use Playwright for local development
      console.log('[BrowserManager] Launching Playwright for local development');
      const chromium = await getPlaywright();

      const browser = await chromium.launch({
        headless: true,
        args: [
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--disable-setuid-sandbox',
          '--no-sandbox',
        ],
      });

      console.log('[BrowserManager] Playwright browser launched');

      browser.on('disconnected', () => {
        console.log('[BrowserManager] Browser disconnected');
        this.browser = null;
        this.initPromise = null;
      });

      return {
        type: 'playwright',
        browser,
        close: async () => {
          await browser.close();
        },
      };
    }
  }

  private async launchWithSparticuzChromium(): Promise<UnifiedBrowser> {
    console.log('[BrowserManager] Trying @sparticuz/chromium...');
    const puppeteer = await getPuppeteer();

    if (!chromiumModule) {
      chromiumModule = await import('@sparticuz/chromium');
    }

    // Try to get executable path with retries
    let executablePath: string | undefined;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const pathResult = await getChromiumPath();
        if (!pathResult) {
          throw new Error('Chromium executable path is undefined');
        }
        executablePath = pathResult;
        console.log('[BrowserManager] Chromium executable path:', executablePath);

        // Verify the executable exists
        const fs = await import('fs');
        if (!fs.existsSync(executablePath)) {
          throw new Error(`Chromium executable not found at ${executablePath}`);
        }
        break; // Success, exit retry loop
      } catch (error) {
        attempts++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`[BrowserManager] Chromium attempt ${attempts}/${maxAttempts} failed:`, errorMessage);

        if (attempts >= maxAttempts) {
          throw new Error(`Failed to get Chromium executable after ${maxAttempts} attempts: ${errorMessage}`);
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    if (!executablePath) {
      throw new Error('Failed to obtain chromium executable path');
    }

    const browser = await puppeteer.launch({
      args: chromiumModule.default.args,
      defaultViewport: { width: 1920, height: 1080 },
      executablePath,
      headless: true,
    });

    console.log('[BrowserManager] @sparticuz/chromium browser launched successfully');

    return {
      type: 'puppeteer',
      browser,
      close: async () => {
        await browser.close();
      },
    };
  }

  private async launchWithSystemChromium(): Promise<UnifiedBrowser> {
    console.log('[BrowserManager] Trying system chromium as fallback...');
    const puppeteer = await getPuppeteer();

    // Try launching with system chromium (may work on some serverless platforms)
    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ],
      headless: true,
    });

    console.log('[BrowserManager] System chromium browser launched successfully');

    return {
      type: 'puppeteer',
      browser,
      close: async () => {
        await browser.close();
      },
    };
  }
  
  async createContext(): Promise<UnifiedContext> {
    const unifiedBrowser = await this.getBrowser();
    
    if (unifiedBrowser.type === 'puppeteer') {
      const context = await unifiedBrowser.browser.createBrowserContext();
      
      return {
        type: 'puppeteer',
        context,
        newPage: async (): Promise<UnifiedPage> => {
          const page = await context.newPage();
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
          
          return {
            goto: async (url, options) => {
              await page.goto(url, {
                waitUntil: options?.waitUntil === 'networkidle' ? 'networkidle0' : 'domcontentloaded',
                timeout: options?.timeout || 30000,
              });
            },
            content: () => page.content(),
            waitForSelector: async (selector, options) => {
              await page.waitForSelector(selector, { timeout: options?.timeout || 30000 });
            },
            waitForTimeout: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
            evaluate: (fn) => page.evaluate(fn),
            close: () => page.close(),
          };
        },
        close: () => context.close(),
      };
    } else {
      // Playwright
      const context = await unifiedBrowser.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });
      
      return {
        type: 'playwright',
        context,
        newPage: async (): Promise<UnifiedPage> => {
          const page = await context.newPage();
          
          return {
            goto: async (url, options) => {
              await page.goto(url, {
                waitUntil: options?.waitUntil as any || 'domcontentloaded',
                timeout: options?.timeout || 30000,
              });
            },
            content: () => page.content(),
            waitForSelector: async (selector, options) => {
              await page.waitForSelector(selector, { timeout: options?.timeout || 30000 });
            },
            waitForTimeout: (ms) => page.waitForTimeout(ms),
            evaluate: (fn) => page.evaluate(fn),
            route: (pattern, handler) => page.route(pattern, handler),
            close: () => page.close(),
          };
        },
        close: () => context.close(),
      };
    }
  }
  
  private resetIdleTimeout(): void {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
    }
    
    this.idleTimeout = setTimeout(async () => {
      const idleTime = Date.now() - this.lastUsed;
      if (idleTime >= this.IDLE_TIMEOUT_MS && this.browser) {
        console.log('[BrowserManager] Closing idle browser');
        await this.close();
      }
    }, this.IDLE_TIMEOUT_MS);
  }
  
  async close(): Promise<void> {
    if (this.idleTimeout) {
      clearTimeout(this.idleTimeout);
      this.idleTimeout = null;
    }
    
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (e) {
        // Ignore close errors
      }
      this.browser = null;
      this.initPromise = null;
      console.log('[BrowserManager] Browser closed');
    }
  }
}

// Export singleton instance
export const browserManager = BrowserManager.getInstance();

// Helper function to run parsing with managed context
export async function withBrowserContext<T>(
  fn: (context: UnifiedContext) => Promise<T>
): Promise<T> {
  const context = await browserManager.createContext();
  try {
    return await fn(context);
  } finally {
    await context.close();
  }
}
