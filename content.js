// Helper to strip HTML tags and clean text
function stripHtml(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
}

// Process post data to clean HTML content
function processPostData(postData) {
    if (!postData) return null;
    return {
        ...postData,
        content: stripHtml(postData.content),
        rawContent: postData.rawContent
    };
}

// Process and summarize post data
async function processSummaries(data) {
    try {
        // Import summarization functions
        const { summarizePost, summarizeMultiplePosts, generateModResponse } = 
            await import(chrome.runtime.getURL('services/summarize.js'));
        
        // Process the data first
        const processedData = {
            currentPost: processPostData(data.currentPost),
            relatedPosts: Object.entries(data.relatedPosts).reduce((acc, [url, post]) => {
                acc[url] = processPostData(post);
                return acc;
            }, {})
        };

        console.log('🎯 Processed post data:', processedData);
        
        // Generate summaries
        const currentSummary = await summarizePost(processedData.currentPost.content, 'moderator');
        const relatedSummaries = await summarizeMultiplePosts(processedData.relatedPosts);
        
        // Generate moderator response
        const modResponse = await generateModResponse(processedData.currentPost, relatedSummaries);
        
        // Store results
        const results = {
            currentPost: {
                ...processedData.currentPost,
                summary: currentSummary
            },
            relatedPosts: Object.entries(processedData.relatedPosts).reduce((acc, [url, post]) => {
                acc[url] = post ? {
                    ...post,
                    summary: relatedSummaries[url]
                } : null;
                return acc;
            }, {}),
            modResponse
        };
        
        // Store in extension storage
        await chrome.storage.local.set({ 
            currentPostData: results.currentPost,
            relatedPostsData: results.relatedPosts,
            modResponse: results.modResponse
        });
        
        console.log('🎭 Summaries and response generated:', results);
        
        return results;
    } catch (error) {
        console.error('❌🎭 Error processing post data:', error);
        throw error;
    }
}

// Listen for messages from popup and background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
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

        case 'POST_DATA_READY':
            // Process summaries
            processSummaries(message.data)
                .then(results => {
                    console.log('✅ Successfully processed post data');
                })
                .catch(error => {
                    console.error('Failed to process post data:', error);
                });
            break;

        case 'POST_DATA_ERROR':
            console.error('❌ Error fetching post data:', message.error);
            break;
    }
    return true;
});

// Main function to initialize the extension
async function initDiscourseHelper() {
    // Only proceed if this is a Discourse forum
    if (!isDiscourseForum()) return;
    
    // Only proceed if this is a topic page
    if (!isDiscoursePost()) return;
    
    // Add at top of initDiscourseHelper
    if (window.location.href === window.__lastProcessedUrl) return;
    window.__lastProcessedUrl = window.location.href;

    // Extract post information
    const postInfo = {
        currentUrl: window.location.href,
        forumInfo: getForumInfo(),
        relatedTopics: getRelatedTopics(),
        postTitle: document.querySelector('.topic-post:first-child .fancy-title')?.textContent.trim(),
        postContent: document.querySelector('.topic-post:first-child .cooked')?.innerHTML,
        postAuthor: document.querySelector('.topic-post:first-child .username')?.textContent.trim(),
        postDate: document.querySelector('.topic-post:first-child .post-date')?.textContent.trim()
    };

    console.log('🐽 Discourse post detected:', postInfo);

    // Send data to background script
    chrome.runtime.sendMessage({
        type: 'POST_DETECTED',
        data: postInfo
    });
}

// Check if current site is a Discourse forum
function isDiscourseForum() {
    try {
        // Check multiple indicators of a Discourse forum
        const discourseIndicators = [
            // Meta tag check
            () => document.querySelector('meta[name="generator"][content*="Discourse"]') !== null,
            // Common Discourse elements
            () => document.querySelector('#main-outlet') !== null,
            () => document.querySelector('.d-header') !== null,
            // Additional Discourse-specific elements
            () => document.querySelector('.discourse-root') !== null,
            () => document.querySelector('.topic-body') !== null,
            () => document.querySelector('.topic-post') !== null,
            // URL pattern check
            () => /\/t\/([^\/]+)\/(\d+)/.test(window.location.pathname),
            // Common Discourse classes
            () => document.querySelector('.archetype-regular') !== null,
            () => document.querySelector('.crawler-nav') !== null
        ];

        // Check each indicator and log results for debugging
        const results = discourseIndicators.map(check => {
            try {
                return check();
            } catch (e) {
                console.error('Error checking Discourse indicator:', e);
                return false;
            }
        });

        const isDiscourse = results.some(result => result === true);
        console.log('🔍 Discourse detection results:', results);
        console.log('📊 Is Discourse forum:', isDiscourse);
        
        return isDiscourse;
    } catch (error) {
        console.error('❌ Error in isDiscourseForum:', error);
        return false;
    }
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
    document.addEventListener('DOMContentLoaded', () => {
        initDiscourseHelper();
        setupUrlObserver();
    });
} else {
    initDiscourseHelper();
    setupUrlObserver();
}

// Setup URL change observer
function setupUrlObserver() {
    let lastUrl = window.location.href;
    
    // Create observer for URL changes
    const observer = new MutationObserver(() => {
        if (lastUrl !== window.location.href) {
            lastUrl = window.location.href;
            console.log('🔄 URL changed, reinitializing...');
            initDiscourseHelper();
        }
    });

    // Observe changes to the body
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
} 