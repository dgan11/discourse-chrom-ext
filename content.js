// Initialize connection state
let sidebarInitialized = false;

chrome.storage.local.get(['isConnected'], (result) => {
  if (result.isConnected) {
    initializeDiscourseIntegration();
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'connectionUpdate':
      if (message.isConnected) {
        initializeDiscourseIntegration();
      } else {
        cleanupDiscourseIntegration();
      }
      break;
    
    case 'checkDiscourse':
      const isDiscourse = isDiscourseForum();
      if (isDiscourse) {
        sendResponse({ 
          isDiscourse: true,
          forumInfo: getForumInfo()
        });
      } else {
        sendResponse({ isDiscourse: false });
      }
      break;
  }
  return true; // Keep message channel open for async response
});

function initializeDiscourseIntegration() {
  if (!sidebarInitialized) {
    // Load and initialize the sidebar
    import(chrome.runtime.getURL('components/sidebar.js'))
      .then(module => {
        module.injectSidebar();
        sidebarInitialized = true;
        console.log('Discourse integration initialized');
      })
      .catch(error => {
        console.error('Error loading sidebar:', error);
      });
  }
}

function cleanupDiscourseIntegration() {
  if (sidebarInitialized) {
    // Remove the sidebar
    import(chrome.runtime.getURL('components/sidebar.js'))
      .then(module => {
        module.removeSidebar();
        sidebarInitialized = false;
        console.log('Discourse integration cleaned up');
      })
      .catch(error => {
        console.error('Error removing sidebar:', error);
      });
  }
}

// Main function to initialize the extension
async function initDiscourseHelper() {
    // Only proceed if this is a Discourse forum
    if (!isDiscourseForum()) return;
    
    // Only proceed if this is a topic page
    if (!isDiscoursePost()) return;
    
    // Extract post information
    const postInfo = {
        currentUrl: window.location.href,
        forumInfo: getForumInfo(),
        relatedTopics: getRelatedTopics(),
        postTitle: document.querySelector('.fancy-title')?.textContent.trim(),
        postContent: document.querySelector('.topic-post .cooked')?.innerHTML,
        postAuthor: document.querySelector('.topic-post .username')?.textContent.trim(),
        postDate: document.querySelector('.topic-post .post-date')?.textContent.trim()
    };

    console.log('Discourse post detected:', postInfo);

    // Send data to background script
    chrome.runtime.sendMessage({
        type: 'POST_DETECTED',
        data: postInfo
    });

    // TODO: Inject UI components (will be implemented in Stage 4)
}

// Check if current site is a Discourse forum
function isDiscourseForum() {
    // Check for common Discourse elements and meta tags
    return (
        document.querySelector('meta[name="generator"][content*="Discourse"]') !== null ||
        document.querySelector('#main-outlet') !== null ||
        document.querySelector('.d-header') !== null
    );
}

// Check if current page is a Discourse post
function isDiscoursePost() {
    // Check URL pattern (most Discourse forums use /t/{slug}/{id} pattern)
    const isTopicUrl = /\/t\/([^\/]+)\/(\d+)/.test(window.location.pathname);
    return isTopicUrl && document.querySelector('.topic-post') !== null;
}

// Get forum information
function getForumInfo() {
    return {
        name: document.querySelector('meta[property="og:site_name"]')?.content || document.title,
        baseUrl: window.location.origin,
        category: document.querySelector('.category-name')?.textContent.trim()
    };
}

// Extract related topics
function getRelatedTopics() {
    // Try different possible selectors for related topics
    const selectors = [
        '#related-topics',
        '.suggested-topics',
        '.related-topics',
        '.topic-links'
    ];

    let relatedTopicsDiv = null;
    for (const selector of selectors) {
        relatedTopicsDiv = document.querySelector(selector);
        if (relatedTopicsDiv) break;
    }

    if (!relatedTopicsDiv) return [];

    // Try different link selectors used by various Discourse themes
    const linkSelectors = [
        'a.title.raw-topic-link',
        'a.raw-topic-link',
        'a.topic-title',
        '.topic-link'
    ];

    let links = [];
    for (const selector of linkSelectors) {
        links = relatedTopicsDiv.querySelectorAll(selector);
        if (links.length > 0) break;
    }

    return Array.from(links).map(link => ({
        title: link.textContent.trim(),
        url: link.href,
        // Convert to JSON URL for API access
        jsonUrl: link.href.replace(/\/t\/([^\/]+)\/(\d+)/, '/t/$2.json')
    }));
}

// Initialize when DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDiscourseHelper);
} else {
    initDiscourseHelper();
} 