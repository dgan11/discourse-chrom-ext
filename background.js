// Initialize extension state when installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    isConnected: false
  });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle background tasks here
  console.log('Background service worker received message:', message);
}); 