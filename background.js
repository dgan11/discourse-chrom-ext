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
  // Only clear specific URL cache instead of all cache
  if (tabCache.has(tabId)) {
    const oldUrl = tabCache.get(tabId);
    if (oldUrl !== postInfo.currentUrl) {
      postCache.delete(oldUrl);
    }
  }
  tabCache.set(tabId, postInfo.currentUrl);
  
  // Check if we already have this post cached
  if (postCache.has(postInfo.currentUrl)) {
    const cachedData = postCache.get(postInfo.currentUrl);
    chrome.tabs.sendMessage(tabId, {
      type: 'POST_DATA_READY',
      data: cachedData
    });
    return;
  }
  
  try {
    // Get current post data
    const currentPostData = await fetchPostData(postInfo.currentUrl);
    
    // Get related posts data
    const relatedUrls = postInfo.relatedTopics.map(topic => topic.jsonUrl);
    const relatedPostsData = await fetchMultiplePosts(relatedUrls);
    
    const fullData = {
      currentPost: currentPostData,
      relatedPosts: relatedPostsData
    };
    
    // Cache the full data
    postCache.set(postInfo.currentUrl, fullData);
    
    // Send the processed data back to content script
    chrome.tabs.sendMessage(tabId, {
      type: 'POST_DATA_READY',
      data: fullData
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
  if (tabCache.has(tabId)) {
    postCache.delete(tabCache.get(tabId));
    tabCache.delete(tabId);
  }
});

// Handle URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    if (tabCache.has(tabId)) {
      const oldUrl = tabCache.get(tabId);
      if (oldUrl !== changeInfo.url) {
        postCache.delete(oldUrl);
        tabCache.delete(tabId);
      }
    }
  }
});

// Add new listener
chrome.tabs.onActivated.addListener(({ tabId }) => {
  const cachedUrl = tabCache.get(tabId);
  if (cachedUrl) {
    postCache.delete(cachedUrl);
    tabCache.delete(tabId);
  }
}); 