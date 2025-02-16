// Initialize connection state
let sidebarInitialized = false;

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
        // Check if we've already processed this post
        const cacheKey = `processed_${data.currentPost.topic_id}`;
        const cached = await chrome.storage.local.get([cacheKey]);
        if (cached[cacheKey]) {
            console.log('🎯 Using cached summaries');
            return cached[cacheKey];
        }

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
        
        // Cache the results
        await chrome.storage.local.set({ 
            [cacheKey]: results,
            processedData: results
        });
        
        console.log('🎭 Summaries and response generated:', results);
        
        return results;
    } catch (error) {
        console.error('❌🎭 Error processing post data:', error);
        throw error;
    }
}

chrome.storage.local.get(['isConnected'], (result) => {
    if (result.isConnected) {
        initializeDiscourseIntegration();
    }
});

// Listen for messages from popup and background
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

        case 'POST_DATA_READY':
            // Process summaries
            processSummaries(message.data)
                .then(results => {
                    // This will be used by the UI components
                    chrome.storage.local.set({ 
                        currentPostData: results.currentPost,
                        relatedPostsData: results.relatedPosts,
                        modResponse: results.modResponse
                    });
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

// Initialize the sidebar
async function initializeDiscourseIntegration() {
    if (!sidebarInitialized) {
        try {
            const { injectSidebar } = await import(chrome.runtime.getURL('components/sidebar.js'));
            await injectSidebar();
            sidebarInitialized = true;
            console.log('Discourse integration initialized');
        } catch (error) {
            console.error('Error loading sidebar:', error);
        }
    }
}

// Cleanup the sidebar
async function cleanupDiscourseIntegration() {
    if (sidebarInitialized) {
        try {
            const { removeSidebar } = await import(chrome.runtime.getURL('components/sidebar.js'));
            await removeSidebar();
            sidebarInitialized = false;
            console.log('Discourse integration cleaned up');
        } catch (error) {
            console.error('Error removing sidebar:', error);
        }
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

    console.log('🐽 Discourse post detected:', postInfo);

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