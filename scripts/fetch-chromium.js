const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function fetchChromium() {
  console.log('Fetching @sparticuz/chromium binaries...');

  try {
    // Import @sparticuz/chromium to trigger download
    const chromium = require('@sparticuz/chromium');

    // Check if executable path exists (it's a Promise in newer versions)
    const executablePath = await chromium.executablePath();
    console.log('Chromium executable path:', executablePath);

    // Check if the bin directory exists
    const binDir = path.dirname(executablePath);
    if (fs.existsSync(binDir)) {
      console.log('✅ Chromium binaries found at:', binDir);
    } else {
      console.log('❌ Chromium binaries not found, attempting to download...');

      // Force download by calling executablePath again
      const path = await chromium.executablePath();
      console.log('Downloaded to:', path);
    }

    console.log('✅ @sparticuz/chromium setup complete');
  } catch (error) {
    console.error('❌ Failed to fetch chromium binaries:', error.message);

    // Try alternative approach - run npx to download
    try {
      console.log('Trying alternative download method...');
      execSync('npx @sparticuz/chromium --version', { stdio: 'inherit' });
      console.log('✅ Alternative download successful');
    } catch (altError) {
      console.error('❌ Alternative download also failed:', altError.message);
      process.exit(1);
    }
  }
}

fetchChromium();