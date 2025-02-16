// Helper to strip HTML tags and clean text
function stripHtml(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
}

// Helper to extract post data from Discourse JSON response
function extractPostData(json) {
    if (!json || !json.post_stream || !json.post_stream.posts || !json.post_stream.posts[0]) {
        throw new Error('Invalid post data structure');
    }

    const firstPost = json.post_stream.posts[0];
    return {
        title: json.title || '',
        content: firstPost.cooked || '', // Return raw HTML content
        rawContent: firstPost.raw || '', // Also return raw markdown content
        author: firstPost.username || '',
        created_at: firstPost.created_at || '',
        topic_id: json.id || '',
        post_id: firstPost.id || '',
        post_number: firstPost.post_number || 1,
        reply_count: json.posts_count ? json.posts_count - 1 : 0,
        category: json.category_id || null,
        tags: json.tags || []
    };
}

// Main function to fetch post data
export async function fetchPostData(url) {
    try {
        // Convert URL to JSON endpoint if needed
        const jsonUrl = url.endsWith('.json') ? url : `${url}.json`;
        
        // Fetch the post data
        const response = await fetch(jsonUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const json = await response.json();
        return extractPostData(json);
    } catch (error) {
        console.error('Error fetching post data:', error);
        throw error;
    }
}

// Batch fetch multiple posts
export async function fetchMultiplePosts(urls) {
    try {
        const fetchPromises = urls.map(url => fetchPostData(url));
        const results = await Promise.allSettled(fetchPromises);
        
        // Process results, keeping successful fetches
        return results.reduce((acc, result, index) => {
            if (result.status === 'fulfilled') {
                acc[urls[index]] = result.value;
            } else {
                console.error(`Failed to fetch ${urls[index]}:`, result.reason);
                acc[urls[index]] = null;
            }
            return acc;
        }, {});
    } catch (error) {
        console.error('Error in batch fetch:', error);
        throw error;
    }
} 