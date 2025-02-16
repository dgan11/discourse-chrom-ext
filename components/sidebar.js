class DiscourseSidebar extends HTMLElement {
    constructor() {
        super();
        
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
                z-index: 1000;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            
            .sidebar-content {
                padding: 16px;
            }
            
            /* Add more styles here for the sidebar content */
        `;
        
        // Create the sidebar content
        const container = document.createElement('div');
        container.className = 'sidebar-content';
        container.innerHTML = `
            <h2>Discourse Helper</h2>
            <!-- Add more sidebar content here -->
        `;
        
        // Add everything to the shadow root
        shadow.appendChild(style);
        shadow.appendChild(container);
    }
}

// Register the custom element
customElements.define('discourse-sidebar', DiscourseSidebar);

// Export a function to inject the sidebar
export function injectSidebar() {
    const sidebar = document.createElement('discourse-sidebar');
    document.body.appendChild(sidebar);
}

// Export a function to remove the sidebar
export function removeSidebar() {
    const sidebar = document.querySelector('discourse-sidebar');
    if (sidebar) {
        sidebar.remove();
    }
} 