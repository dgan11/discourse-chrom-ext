// Import the fetch utilities
import { fetchPostData, fetchMultiplePosts } from './utils/fetchPosts.js';

// Cache for post data
const postCache = new Map();
const tabCache = new Map();

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

  if (message.type === 'POST_DETECTED') {
    handlePostDetection(message.data, sender.tab.id);
  }
  return true;
});

// Handle post detection
async function handlePostDetection(postInfo, tabId) {
  // Clear previous cache for this tab
  if (tabCache.has(tabId)) {
    postCache.delete(tabCache.get(tabId));
  }
  tabCache.set(tabId, postInfo.currentUrl);
  
  try {
    // Get current post data
    const currentPostData = await fetchPostData(postInfo.currentUrl);
    
    // Cache the current post data
    postCache.set(postInfo.currentUrl, currentPostData);
    
    // Get related posts data
    const relatedUrls = postInfo.relatedTopics.map(topic => topic.jsonUrl);
    const relatedPostsData = await fetchMultiplePosts(relatedUrls);
    
    // Cache related posts data
    Object.entries(relatedPostsData).forEach(([url, data]) => {
      if (data) postCache.set(url, data);
    });
    
    // Send the processed data back to content script
    chrome.tabs.sendMessage(tabId, {
      type: 'POST_DATA_READY',
      data: {
        currentPost: currentPostData,
        relatedPosts: relatedPostsData
      }
    });
    
  } catch (error) {
    console.error('Error processing post data:', error);
    chrome.tabs.sendMessage(tabId, {
      type: 'POST_DATA_ERROR',
      error: error.message
    });
  }
}

// Helper to get cached post data
function getCachedPost(url) {
  return postCache.get(url) || null;
}

// Clear cache when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  postCache.clear();
});

// Add new listener
chrome.tabs.onActivated.addListener(({ tabId }) => {
  const cachedUrl = tabCache.get(tabId);
  if (cachedUrl) {
    postCache.delete(cachedUrl);
    tabCache.delete(tabId);
  }
}); 