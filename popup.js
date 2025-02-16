document.addEventListener('DOMContentLoaded', async () => {
  const statusElement = document.getElementById('status');
  const statusIndicator = document.getElementById('statusIndicator');
  const actionButton = document.getElementById('actionButton');
  const forumInfo = document.getElementById('forumInfo');
  const summaryContainer = document.getElementById('summaryContainer');
  const copyBtn = document.getElementById('copyResponse');

  let currentTab = null;

  // Get current tab
  try {
    [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch (error) {
    console.error('Error getting current tab:', error);
    updateUI(false, 'Error: Could not access tab');
    return;
  }

  // Check if we're on a Discourse forum
  try {
    const response = await chrome.tabs.sendMessage(currentTab.id, { type: 'checkDiscourse' });
    if (response && response.isDiscourse) {
      forumInfo.textContent = `Forum: ${response.forumInfo.name}`;
      forumInfo.classList.add('visible');
      
      // Initialize UI state
      chrome.storage.local.get(['isConnected'], (result) => {
        updateUI(result.isConnected);
      });

      // Get and display summaries if connected
      updateSummaries();
    } else {
      updateUI(false, 'Not a Discourse forum');
      actionButton.disabled = true;
      return;
    }
  } catch (error) {
    console.error('Error checking Discourse:', error);
    updateUI(false, 'Error: Could not detect forum');
    return;
  }

  // Handle connect/disconnect
  actionButton.addEventListener('click', async () => {
    try {
      const currentState = await chrome.storage.local.get(['isConnected']);
      const newState = !currentState.isConnected;
      
      await chrome.storage.local.set({ isConnected: newState });
      updateUI(newState);

      // Notify content script of state change
      chrome.tabs.sendMessage(currentTab.id, { 
        type: 'connectionUpdate', 
        isConnected: newState 
      });

      // Update summaries when connecting
      if (newState) {
        updateSummaries();
      }
    } catch (error) {
      console.error('Error toggling connection:', error);
      updateUI(false, 'Error: Could not update connection');
    }
  });

  // Handle copy button
  copyBtn.addEventListener('click', async () => {
    const responseText = document.getElementById('modResponse').textContent;
    try {
      await navigator.clipboard.writeText(responseText);
      copyBtn.textContent = 'Copied!';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = 'Copy Response';
        copyBtn.classList.remove('copied');
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      copyBtn.textContent = 'Failed';
      setTimeout(() => {
        copyBtn.textContent = 'Copy Response';
      }, 2000);
    }
  });

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      const relevantKeys = ['currentPostData', 'relatedPostsData', 'modResponse'];
      if (relevantKeys.some(key => key in changes)) {
        updateSummaries();
      }
    }
  });

  function updateUI(isConnected, customStatus) {
    // Update button
    actionButton.textContent = isConnected ? 'Disconnect' : 'Connect';
    actionButton.classList.toggle('connected', isConnected);
    
    // Update status indicator
    statusIndicator.classList.toggle('connected', isConnected);
    
    // Update status text
    if (customStatus) {
      statusElement.textContent = customStatus;
    } else {
      statusElement.textContent = isConnected ? 'Connected to Discourse' : 'Not connected';
    }

    // Show/hide summaries
    summaryContainer.style.display = isConnected ? 'block' : 'none';
  }

  async function updateSummaries() {
    try {
      const data = await chrome.storage.local.get([
        'currentPostData',
        'relatedPostsData',
        'modResponse'
      ]);

      // Update current post summary
      if (data.currentPostData?.summary) {
        document.getElementById('currentSummary').textContent = data.currentPostData.summary;
      }

      // Update mod response
      if (data.modResponse) {
        document.getElementById('modResponse').textContent = data.modResponse;
      }

      // Update related summaries
      if (data.relatedPostsData) {
        const relatedHtml = Object.entries(data.relatedPostsData)
          .filter(([_, post]) => post && post.summary)
          .map(([url, post]) => `
            <div class="related-post">
              <strong>${post.title || 'Related Post'}</strong>
              <p>${post.summary}</p>
            </div>
          `).join('') || 'No related posts found';
        
        document.getElementById('relatedSummaries').innerHTML = relatedHtml;
      }
    } catch (error) {
      console.error('Error updating summaries:', error);
    }
  }
}); 