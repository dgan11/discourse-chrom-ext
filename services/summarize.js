// OpenAI API configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

// Get API key from storage
async function getApiKey() {
    const result = await chrome.storage.local.get(['openaiApiKey']);
    if (!result.openaiApiKey) {
        throw new Error('OpenAI API key not found');
    }
    return result.openaiApiKey;
}

// Helper to create a system message for different summary types
function getSystemPrompt(type = 'default') {
    const prompts = {
        default: "You're a technical assistant summarizing a forum post for moderators. Focus on the key issue, relevant context, and current status. Summarize in 3 concise bullet points without any greetings or pleasantries.",
        moderator: "You're a forum moderator. Keep responses super short (max 2 sentences), direct, and use '@username' format (not their real name). Always include hi@cursor.com for billing/subscription issues. Use '!'.",
        solution: "Focus only on solutions mentioned in the text. List them as actionable bullet points.",
    };
    return prompts[type] || prompts.default;
}

// Main summarization function
export async function summarizePost(content, type = 'default') {
    try {
        const apiKey = await getApiKey();
        const requestBody = {
            model: MODEL,
            messages: [
                { role: 'system', content: getSystemPrompt(type) },
                { role: 'user', content }
            ],
            temperature: 0.2,
            max_tokens: type === 'moderator' ? 100 : 500  // Limit tokens for moderator responses
        };

        console.log('📝 Request body:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        console.log('📡 [SUMMARIZE POST] Response status:', response.status);
        const responseData = await response.json();
        console.log('📦 [SUMMARIZE POST] Response data:', responseData);

        if (!response.ok) {
            throw new Error(responseData.error?.message || `API request failed with status ${response.status}`);
        }

        return responseData.choices[0].message.content;
    } catch (error) {
        console.error('🚨 Summarization error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        throw error;
    }
}

// Batch summarize multiple posts
export async function summarizeMultiplePosts(posts, type = 'default') {
    try {
        const summaries = {};
        for (const [url, post] of Object.entries(posts)) {
            if (post && post.content) {
                try {
                    summaries[url] = await summarizePost(post.content, type);
                } catch (error) {
                    console.error(`Failed to summarize ${url}:`, error);
                    summaries[url] = null;
                }
            } else {
                summaries[url] = null;
            }
        }
        return summaries;
    } catch (error) {
        console.error('Batch summarization error:', error);
        throw error;
    }
}

// Generate moderator response
export async function generateModResponse(currentPost, relatedSummaries) {
    try {
        const apiKey = await getApiKey();
        
        // Create context from related summaries
        const context = Object.entries(relatedSummaries)
            .filter(([_, summary]) => summary)
            .map(([url, summary]) => `Related post: ${url}\n${summary}`)
            .join('\n\n');

        const prompt = `
Current post:
${currentPost.content}

Context from related posts:
${context}

Based on the above, generate an empathetic moderator response that is super succinct that:
first see classify if there is a problem. Be super succinct but warm in a response. Make sure to use "!".
If this is an issue with billing (only if they mention something about being charged or payment) just say that they need to email hi@cursor.com and you will be happy to 
take a look! This should not be mentioned for normal issues though.

Never qualify anything or say things like
"""
- "it sounds like"
- "you're feeling frustrated by ..."
- "that's completely understandable"
- "Thank you for sharing your thoughts"
"""
`;

        console.log('🤖 Generating mod response...');
        console.log('📝 Using prompt:', prompt);

        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { 
                        role: 'system', 
                        content: `
                        You are an empathetic forum moderator that is warm yet succinct. Do not qualify.
                        you get to the point and use atleast one "!". Max reply length should ideally 5-10 words
                        and no more than 20 unless there is a ton of things to address or explain`
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 1000
            })
        });

        console.log('✅📡 Mod response status:', response.status);
        const responseData = await response.json();
        console.log('✅📦 Mod response data:', responseData);

        if (!response.ok) {
            throw new Error(responseData.error?.message || `API request failed with status ${response.status}`);
        }

        return responseData.choices[0].message.content;
    } catch (error) {
        console.error('🚨 Response generation error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        throw error;
    }
} 