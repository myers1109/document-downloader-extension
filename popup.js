document.addEventListener('DOMContentLoaded', async () => {
    const urlInput = document.getElementById('urlInput');
    const downloadBtn = document.getElementById('downloadBtn');
    const statusDiv = document.getElementById('status');

    // Get current tab URL
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.includes('scribd.com/document')) {
        urlInput.value = tab.url;
    }

    downloadBtn.addEventListener('click', () => {
        const url = urlInput.value.trim();
        if (!url) {
            showStatus('Please enter a URL', 'error');
            return;
        }

        try {
            const embedUrl = convertToEmbedUrl(url);
            showStatus('Opening document...', 'success');

            // Open new tab with embed URL
            chrome.tabs.create({ url: embedUrl }, (newTab) => {
                // The content script will automatically run on the new page
                // because of the matches rule in manifest.json
            });

        } catch (e) {
            showStatus(e.message, 'error');
        }
    });

    function convertToEmbedUrl(url) {
        const match = url.match(/scribd\.com\/document\/(\d+)/);
        if (match && match[1]) {
            return `https://www.scribd.com/embeds/${match[1]}/content`;
        }
        throw new Error('Invalid Scribd URL. Must contain /document/ID');
    }

    function showStatus(msg, type) {
        statusDiv.textContent = msg;
        statusDiv.style.color = type === 'error' ? '#d93025' : '#188038';
    }
});
