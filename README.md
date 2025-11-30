# Scribd Downloader Pro Extension

This Chrome Extension allows you to download Scribd documents as PDF.

## Installation

1.  Download or clone this repository.
2.  Open Chrome and go to `chrome://extensions/`.
3.  Enable **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the `document-downloader-extension` folder.

## Usage

1.  Navigate to a Scribd document page (e.g., `https://www.scribd.com/document/123456/Example`).
2.  Click the extension icon in the toolbar.
3.  Click **"Start Download"**.
4.  The extension will:
    - Open the document in a clean "Embed" view.
    - Automatically scroll to load all pages (this may take a moment).
    - Remove unnecessary UI elements.
    - Open the Print Dialog.
5.  In the Print Dialog, select **"Save as PDF"** as the destination and click **Save**.

## Notes

-   The extension automates the scrolling and cleanup process.
-   You must manually click "Save" in the print dialog due to browser security restrictions.
