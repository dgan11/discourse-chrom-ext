class DiscourseSidebar extends HTMLElement {
    constructor() {
        super();
        console.log('🎨 Creating sidebar component...');
        
        // Create a shadow root to isolate our styles
        const shadow = this.attachShadow({ mode: 'closed' });
        
        // Add styles that will be isolated from the main page
        const style = document.createElement('style');
        style.textContent = `
            :host {
                position: fixed;
                right: 0;
                top: 0;
                width: 300px;
                height: 100vh;
                background: white;
                box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
                z-index: 999999;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                flex-direction: column;
                border-left: 1px solid #e5e7eb;
            }
            
            .sidebar-content {
                padding: 16px;
                overflow-y: auto;
                flex-grow: 1;
                background: white;
            }

            .section {
                margin-bottom: 20px;
                background: white;
            }

            h2 {
                font-size: 16px;
                margin: 0 0 12px 0;
                color: #333;
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: white;
            }

            .summary {
                font-size: 14px;
                line-height: 1.5;
                color: #444;
                background: #f5f5f5;
                padding: 12px;
                border-radius: 6px;
                margin-bottom: 12px;
                word-wrap: break-word;
            }

            .mod-response {
                background: #e8f4ff;
            }

            .copy-btn {
                background: #3b82f6;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: background 0.2s;
            }

            .copy-btn:hover {
                background: #2563eb;
            }

            .copy-btn.copied {
                background: #34d399;
            }

            .related-post {
                margin-bottom: 16px;
            }

            .related-post-title {
                font-size: 13px;
                font-weight: 500;
                margin-bottom: 4px;
                color: #666;
            }

            a {
                color: #3b82f6;
                text-decoration: none;
            }

            a:hover {
                text-decoration: underline;
            }
        `;
        
        // Create the sidebar content
        const container = document.createElement('div');
        container.className = 'sidebar-content';
        container.innerHTML = `
            <div class="section">
                <h2>Current Post Summary</h2>
                <div id="currentSummary" class="summary">Loading...</div>
            </div>

            <div class="section">
                <h2>
                    Moderator Response
                    <button id="copyResponse" class="copy-btn">Copy</button>
                </h2>
                <div id="modResponse" class="summary mod-response">Loading...</div>
            </div>

            <div class="section">
                <h2>Related Posts</h2>
                <div id="relatedSummaries">Loading...</div>
            </div>
        `;
        
        // Add everything to the shadow root
        shadow.appendChild(style);
        shadow.appendChild(container);
        console.log('🎨 Sidebar component created');

        // Initialize state
        this.updateContent();

        // Add event listeners
        const copyBtn = shadow.getElementById('copyResponse');
        copyBtn.addEventListener('click', () => this.copyModResponse());

        // Listen for storage changes
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local') {
                const relevantKeys = ['currentPostData', 'relatedPostsData', 'modResponse'];
                if (relevantKeys.some(key => key in changes)) {
                    console.log('🔄 Storage changed, updating sidebar');
                    this.updateContent();
                }
            }
        });
    }

    connectedCallback() {
        console.log('🔌 Sidebar connected to DOM');
    }

    disconnectedCallback() {
        console.log('🔌 Sidebar disconnected from DOM');
    }

    async updateContent() {
        try {
            console.log('🔄 Updating sidebar content');
            // Get the stored data
            const data = await chrome.storage.local.get([
                'currentPostData',
                'relatedPostsData',
                'modResponse'
            ]);

            console.log('📦 Got data for sidebar:', data);
            const shadow = this.shadowRoot;

            // Update current post summary
            if (data.currentPostData?.summary) {
                shadow.getElementById('currentSummary').textContent = data.currentPostData.summary;
            }

            // Update mod response
            if (data.modResponse) {
                shadow.getElementById('modResponse').textContent = data.modResponse;
            }

            // Update related summaries
            if (data.relatedPostsData) {
                const relatedContainer = shadow.getElementById('relatedSummaries');
                relatedContainer.innerHTML = Object.entries(data.relatedPostsData)
                    .filter(([_, post]) => post && post.summary)
                    .map(([url, post]) => `
                        <div class="related-post">
                            <div class="related-post-title">
                                <a href="${url}" target="_blank">${post.title || 'Related Post'}</a>
                            </div>
                            <div class="summary">${post.summary}</div>
                        </div>
                    `).join('') || 'No related posts found';
            }
        } catch (error) {
            console.error('❌ Error updating sidebar content:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
        }
    }

    async copyModResponse() {
        const shadow = this.shadowRoot;
        const responseText = shadow.getElementById('modResponse').textContent;
        const copyBtn = shadow.getElementById('copyResponse');

        try {
            await navigator.clipboard.writeText(responseText);
            copyBtn.textContent = 'Copied!';
            copyBtn.classList.add('copied');
            setTimeout(() => {
                copyBtn.textContent = 'Copy';
                copyBtn.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
            copyBtn.textContent = 'Failed';
            setTimeout(() => {
                copyBtn.textContent = 'Copy';
            }, 2000);
        }
    }
}

// Register the custom element
customElements.define('discourse-sidebar', DiscourseSidebar);

// Export a function to inject the sidebar
export function injectSidebar() {
    console.log('🎯 Injecting sidebar into page...');
    const sidebar = document.createElement('discourse-sidebar');
    document.body.appendChild(sidebar);
    console.log('✅ Sidebar injected');
}

// Export a function to remove the sidebar
export function removeSidebar() {
    console.log('🗑️ Removing sidebar...');
    const sidebar = document.querySelector('discourse-sidebar');
    if (sidebar) {
        sidebar.remove();
        console.log('✅ Sidebar removed');
    } else {
        console.log('⚠️ No sidebar found to remove');
    }
} 