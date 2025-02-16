// Initialize connection state
chrome.storage.local.get(['isConnected'], (result) => {
  if (result.isConnected) {
    initializeDiscourseIntegration();
  }
});

// Listen for connection updates from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'connectionUpdate') {
    if (message.isConnected) {
      initializeDiscourseIntegration();
    } else {
      cleanupDiscourseIntegration();
    }
  }
});

function initializeDiscourseIntegration() {
  // Add your Discourse integration logic here
  console.log('Discourse integration initialized');
}

function cleanupDiscourseIntegration() {
  // Cleanup integration
  console.log('Discourse integration cleaned up');
} 