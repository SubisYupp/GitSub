import { chromium, Browser, BrowserContext } from 'playwright';

// Singleton browser manager to reuse browser instances
class BrowserManager {
  private static instance: BrowserManager;
  private browser: Browser | null = null;
  private initPromise: Promise<Browser> | null = null;
  private lastUsed: number = 0;
  private idleTimeout: NodeJS.Timeout | null = null;
  
  // Close browser after 5 minutes of inactivity
  private readonly IDLE_TIMEOUT_MS = 5 * 60 * 1000;
  
  private constructor() {}
  
  static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }
  
  async getBrowser(): Promise<Browser> {
    this.lastUsed = Date.now();
    this.resetIdleTimeout();
    
    // If already initializing, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }
    
    // If browser exists and is connected, return it
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }
    
    // Launch new browser
    this.initPromise = chromium.launch({
      headless: true,
      args: [
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--no-sandbox',
      ],
    });
    
    try {
      this.browser = await this.initPromise;
      console.log('[BrowserManager] New browser instance launched');
      
      // Handle browser disconnect
      this.browser.on('disconnected', () => {
        console.log('[BrowserManager] Browser disconnected');
        this.browser = null;
        this.initPromise = null;
      });
      
      return this.browser;
    } finally {
      this.initPromise = null;
    }
  }
  
  async createContext(): Promise<BrowserContext> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    return context;
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
  fn: (context: BrowserContext) => Promise<T>
): Promise<T> {
  const context = await browserManager.createContext();
  try {
    return await fn(context);
  } finally {
    await context.close();
  }
}
