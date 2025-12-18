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

    // Check if the executable exists
    if (fs.existsSync(executablePath)) {
      console.log('✅ Chromium executable found at:', executablePath);

      // Also check the bin directory
      const binDir = path.dirname(executablePath);
      console.log('✅ Chromium bin directory:', binDir);
      console.log('✅ @sparticuz/chromium setup complete');
      return;
    }

    console.log('❌ Chromium executable not found, attempting to download...');

    // Force download by calling executablePath again
    const pathAgain = await chromium.executablePath();
    console.log('After retry, path:', pathAgain);

    if (fs.existsSync(pathAgain)) {
      console.log('✅ Chromium downloaded successfully');
      console.log('✅ @sparticuz/chromium setup complete');
      return;
    }

    console.error('❌ Chromium still not found after download attempt');

    // Try alternative approach - run npx to download
    console.log('Trying alternative download method (npx install)...');
    try {
      execSync('npx @sparticuz/chromium install --yes', { stdio: 'inherit' });
    } catch (installErr) {
      console.error('npx install failed:', installErr && installErr.message ? installErr.message : String(installErr));
    }

    // Re-check after npx install
    try {
      const pathAfterNpx = await chromium.executablePath();
      if (fs.existsSync(pathAfterNpx)) {
        console.log('✅ Chromium downloaded successfully via npx');
        return;
      }
    } catch (recheckErr) {
      console.error('Re-check after npx failed:', recheckErr && recheckErr.message ? recheckErr.message : String(recheckErr));
    }

    console.error('❌ Alternative download also failed: chromium binaries not found');
    // Fail the install so deployment stops (safer than continuing without browser)
    console.error('FATAL: chromium binaries are required. Aborting install.');
    process.exit(1);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to fetch chromium binaries:', msg);
    console.error('FATAL: chromium binaries are required. Aborting install.');
    process.exit(1);
  }
}

fetchChromium().catch(error => {
  console.error('Unhandled error in fetchChromium:', error);
  // Don't exit with error to avoid breaking builds
});