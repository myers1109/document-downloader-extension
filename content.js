// Scribd Downloader Content Script

console.log('Scribd Downloader: Content script loaded');

// Helper for delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Main execution function
async function startDownloadProcess() {
    console.log('Scribd Downloader: Starting process...');

    // Create a status overlay
    const overlay = createStatusOverlay();

    try {
        updateStatus(overlay, 'Waiting for page load...');
        await delay(3000); // Wait longer for initial load (especially for cookies)

        // 1. Accept Cookies (if any) - Try multiple times
        updateStatus(overlay, 'Handling cookies...');
        for (let i = 0; i < 3; i++) {
            if (handleCookies()) {
                await delay(500); // Wait for cookie dialog to close
                break;
            }
            await delay(500);
        }

        // 2. Optimize Scroll and Load
        updateStatus(overlay, 'Loading all pages (this may take a while)...');
        await optimizeScrollAndLoad(overlay);

        // 3. Remove UI Elements
        updateStatus(overlay, 'Cleaning up UI...');
        removeUiElements();

        // 4. Trigger Print
        updateStatus(overlay, 'Ready! Opening Print Dialog...');
        await delay(1000);

        // Remove overlay before printing
        overlay.remove();

        // Add print styles
        addPrintStyles();

        // Trigger print
        window.print();

    } catch (error) {
        console.error('Scribd Downloader Error:', error);
        updateStatus(overlay, `Error: ${error.message}`);
    }
}

function createStatusOverlay() {
    const div = document.createElement('div');
    div.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1a73e8;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 999999;
    font-family: sans-serif;
    font-size: 14px;
    max-width: 300px;
    transition: all 0.3s ease;
  `;
    div.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 5px;">Scribd Downloader</div>
    <div id="sd-status-text">Initializing...</div>
    <div id="sd-progress" style="margin-top: 8px; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; overflow: hidden;">
      <div id="sd-progress-bar" style="width: 0%; height: 100%; background: white; transition: width 0.3s;"></div>
    </div>
  `;
    document.body.appendChild(div);
    return div;
}

function updateStatus(overlay, text, progress = null) {
    const textEl = overlay.querySelector('#sd-status-text');
    const barEl = overlay.querySelector('#sd-progress-bar');
    if (textEl) textEl.textContent = text;
    if (barEl && progress !== null) barEl.style.width = `${progress}%`;
}

function handleCookies() {
    const selectors = [
        '#onetrust-accept-btn-handler',
        'button[id*="accept"]',
        'button[id*="Accept"]',
        '.cookie-accept',
        '[data-testid="cookie-accept"]',
        // French Scribd specific
        'button[class*="accept"]',
        'button[class*="Accept"]',
        'button:has-text("Accepter")',
        'button:has-text("Accept")'
    ];

    for (const selector of selectors) {
        try {
            const btn = document.querySelector(selector);
            if (btn && btn.offsetParent !== null) {
                btn.click();
                console.log('Cookie button clicked:', selector);
                return true;
            }
        } catch (e) {
            // Ignore selector errors
        }
    }

    // Fallback: Find by text content
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
        const text = btn.textContent.toLowerCase();
        if ((text.includes('accept') || text.includes('accepter') || text.includes('agree'))
            && btn.offsetParent !== null) {
            btn.click();
            console.log('Cookie button clicked by text:', btn.textContent);
            return true;
        }
    }

    return false;
}

async function optimizeScrollAndLoad(overlay) {
    // Helper to check page status (Ported from Python script)
    const checkPagesLoaded = () => {
        const pages = document.querySelectorAll("[class*='page']");
        const loadedIndices = [];
        const unloadedIndices = [];

        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            const hasContent = page.offsetHeight > 100 &&
                (page.querySelector('img') ||
                    page.querySelector('canvas') ||
                    page.textContent.trim().length > 50 ||
                    page.querySelector('svg'));

            if (hasContent) {
                loadedIndices.push(i);
            } else {
                unloadedIndices.push(i);
            }
        }
        return {
            total: pages.length,
            loaded: loadedIndices.length,
            unloaded: unloadedIndices
        };
    };

    // 1. Initial Page Count
    let pages = document.querySelectorAll("[class*='page']");
    let totalPages = pages.length;
    console.log(`Found ${totalPages} pages initially`);

    if (totalPages === 0) {
        updateStatus(overlay, 'No pages found, trying fallback scroll...');
        // Fallback: Scroll by height if no pages found
        let lastHeight = document.body.scrollHeight;
        let stableCount = 0;
        for (let i = 0; i < 200; i++) {
            window.scrollTo(0, document.body.scrollHeight);
            await delay(200);
            let newHeight = document.body.scrollHeight;
            if (newHeight === lastHeight) {
                stableCount++;
                if (stableCount >= 3) break;
            } else {
                stableCount = 0;
            }
            lastHeight = newHeight;
        }
        // Re-query pages
        pages = document.querySelectorAll("[class*='page']");
        totalPages = pages.length;
    }

    // 2. PHASE 1: Fast Batch Scroll (Ported from Python)
    // Scroll in batches to trigger lazy loading efficiently
    const batchSize = Math.max(20, Math.floor(totalPages / 5));

    for (let batchStart = 0; batchStart < totalPages; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, totalPages);
        updateStatus(overlay, `Fast Scroll: Pages ${batchStart + 1}-${batchEnd} of ${totalPages}...`, (batchStart / totalPages) * 50);

        // Scroll batch
        for (let i = batchStart; i < batchEnd; i++) {
            if (pages[i]) {
                pages[i].scrollIntoView({ behavior: 'auto', block: 'center' });
            }
        }
        await delay(50); // Minimal wait between batches
    }

    await delay(500); // Wait for lazy loading

    // Check for new pages
    let newPageCount = document.querySelectorAll("[class*='page']").length;
    if (newPageCount > totalPages) {
        console.log(`Found ${newPageCount - totalPages} new pages after fast scroll`);
        totalPages = newPageCount;
        pages = document.querySelectorAll("[class*='page']");
    }

    // 3. PHASE 2: Verification & Retry (Ported from Python)
    const maxVerificationRounds = 3;
    for (let round = 0; round < maxVerificationRounds; round++) {
        const status = checkPagesLoaded();

        if (status.unloaded.length === 0) {
            updateStatus(overlay, `All ${status.total} pages loaded!`);
            break;
        }

        updateStatus(overlay, `Round ${round + 1}: Reloading ${status.unloaded.length} missing pages...`, 50 + (round * 15));

        // Reload only unloaded pages
        for (const idx of status.unloaded) {
            if (pages[idx]) {
                pages[idx].scrollIntoView({ behavior: 'auto', block: 'center' });
                await delay(300); // Wait for content
            }
        }

        // Refresh page list
        await delay(300);
        pages = document.querySelectorAll("[class*='page']");
    }

    // 4. PHASE 3: Final Verification Scroll (Ported from Python)
    updateStatus(overlay, 'Final verification...');
    window.scrollTo(0, document.body.scrollHeight);
    await delay(300);
    window.scrollTo(0, 0);
    await delay(200);
    window.scrollTo(0, document.body.scrollHeight);
    await delay(300);

    const finalStatus = checkPagesLoaded();
    updateStatus(overlay, `Ready! Loaded ${finalStatus.loaded}/${finalStatus.total} pages.`);
}

function removeUiElements() {
    // Aggressive UI removal (Ported from Python)
    const selectorsToRemove = [
        '.toolbar_top',
        '.toolbar_bottom',
        '.promo_banner',
        '.auto_hide_toolbar',
        '#global_header',
        '.scribd_header',
        '.inter_page_ad',
        '.between_page_ads'
    ];

    selectorsToRemove.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) el.remove();
    });

    // Aggressively reset document_scroller (Fixes blank first page)
    const scrollers = Array.from(document.getElementsByClassName('document_scroller'));
    for (let i = 0; i < scrollers.length; i++) {
        scrollers[i].setAttribute('class', ''); // Nuke all classes
        scrollers[i].style.cssText = ''; // Nuke all inline styles
    }

    // Reset body/html
    document.body.style.overflow = 'visible';
    document.body.style.height = 'auto';
    document.documentElement.style.overflow = 'visible';
    document.documentElement.style.height = 'auto';
}

function addPrintStyles() {
    const style = document.createElement('style');
    style.textContent = `
    @media print {
      @page {
        margin: 0;
        size: auto;
      }
      
      /* Hide specific UI elements */
      .toolbar_top, .toolbar_bottom, .promo_banner, 
      .auto_hide_toolbar, #global_header, .scribd_header,
      button, .k_ui_btn, .wrapper__gradient,
      .inter_page_ad, .google_ads, .between_page_ads {
        display: none !important;
      }
      
      /* Hide the status overlay */
      div[style*="z-index: 999999"] {
        display: none !important;
      }
    }
  `;
    document.head.appendChild(style);
}

// Auto-start if we are on the embed page
if (window.location.href.includes('/embeds/') && window.location.href.includes('/content')) {
    // Small delay to ensure DOM is ready
    setTimeout(startDownloadProcess, 1000);
}
