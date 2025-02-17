document.addEventListener('DOMContentLoaded', async () => {
  const statusElement = document.getElementById('status');
  const statusIndicator = document.getElementById('statusIndicator');
  const actionButton = document.getElementById('actionButton');
  const buttonText = actionButton.querySelector('.button-text');
  const spinner = actionButton.querySelector('.spinner');
  const forumInfo = document.getElementById('forumInfo');
  const currentPostTitle = document.getElementById('currentPostTitle');
  const summaryContainer = document.getElementById('summaryContainer');
  const copyBtn = document.getElementById('copyResponse');
  const refreshButton = document.getElementById('refreshButton');

  let currentTab = null;
  let currentPostData = null;
  let isProcessing = false;
  let currentPostUrl = null;

  function setLoading(isLoading, isRefresh = false) {
    const targetButton = isRefresh ? refreshButton : actionButton;
    const targetSpinner = targetButton.querySelector('.spinner');
    const targetText = targetButton.querySelector(isRefresh ? '.material-icons' : '.button-text');

    targetText.style.display = isLoading ? 'none' : 'block';
    targetSpinner.style.display = isLoading ? 'block' : 'none';
    targetButton.disabled = isLoading;

    if (!isRefresh) {
      buttonText.textContent = isLoading ? 'Summarizing...' : 'Summarize';
    }
  }

  function setContentLoading(isLoading) {
    const sections = ['currentSummary', 'modResponse', 'relatedSummaries'];
    sections.forEach(id => {
      const section = document.getElementById(id);
      const spinner = section.querySelector('.content-spinner');
      const content = section.querySelector('.content-text');
      
      spinner.style.display = isLoading ? 'flex' : 'none';
      content.style.display = isLoading ? 'none' : 'block';
    });
  }

  // Get current tab
  try {
    [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentPostUrl = currentTab.url;
  } catch (error) {
    console.error('Error getting current tab:', error);
    updateUI(false, 'Error: Could not access tab');
    return;
  }

  // Check if we're on a Discourse forum
  try {
    const response = await chrome.tabs.sendMessage(currentTab.id, { type: 'checkDiscourse' });
    
    if (!response) {
      console.error('No response from content script');
      updateUI(false, 'Error: Extension not initialized. Please refresh the page.');
      return;
    }
    
    if (response.isDiscourse) {
      forumInfo.textContent = `Forum: ${response.forumInfo?.name || 'Unknown'}`;
      forumInfo.classList.add('visible');
      
      // Check if we already have summaries for this post
      const data = await chrome.storage.local.get(['currentPostData', 'lastProcessedUrl']);
      if (data.currentPostData && data.lastProcessedUrl === currentPostUrl) {
        currentPostTitle.textContent = data.currentPostData.title || 'Current Post';
        currentPostTitle.classList.add('visible');
        summaryContainer.style.display = 'block';
        actionButton.disabled = true;
        buttonText.textContent = 'Already Summarized';
        refreshButton.classList.add('visible');
        updateSummaries();
      }
    } else {
      updateUI(false, 'Not a Discourse forum. Visit a Discourse forum to use this extension.');
      actionButton.disabled = true;
      return;
    }
  } catch (error) {
    console.error('Error checking Discourse:', error);
    if (error.message.includes('Could not establish connection')) {
      updateUI(false, 'Error: Please refresh the page to initialize the extension.');
    } else {
      updateUI(false, 'Error: Could not detect forum. Please refresh the page.');
    }
    return;
  }

  async function handleSummarization(isRefresh = false) {
    if (isProcessing) return;
    
    try {
      isProcessing = true;
      setLoading(true, isRefresh);
      
      // Show loading spinners if refreshing
      if (isRefresh) {
        setContentLoading(true);
      }

      // Store the URL we're processing
      await chrome.storage.local.set({ 
        isConnected: true,
        lastProcessedUrl: currentPostUrl 
      });
      
      // Notify content script to start processing
      chrome.tabs.sendMessage(currentTab.id, { 
        type: 'connectionUpdate', 
        isConnected: true 
      });

      // Wait for summaries to be generated
      const checkSummaries = async () => {
        const data = await chrome.storage.local.get(['currentPostData', 'modResponse']);
        if (data.currentPostData && data.modResponse) {
          setLoading(false, isRefresh);
          setContentLoading(false);
          summaryContainer.style.display = 'block';
          currentPostTitle.textContent = data.currentPostData.title || 'Current Post';
          currentPostTitle.classList.add('visible');
          
          if (!isRefresh) {
            actionButton.disabled = true;
            buttonText.textContent = 'Already Summarized';
            refreshButton.classList.add('visible');
          }
          
          updateSummaries();
          isProcessing = false;
        } else {
          setTimeout(checkSummaries, 500);
        }
      };

      checkSummaries();
    } catch (error) {
      console.error('Error during summarization:', error);
      setLoading(false, isRefresh);
      setContentLoading(false);
      updateUI(false, 'Error: Could not generate summaries');
      isProcessing = false;
    }
  }

  // Handle summarize action
  actionButton.addEventListener('click', () => handleSummarization(false));

  // Handle refresh action
  refreshButton.addEventListener('click', () => handleSummarization(true));

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
      const hasUpdates = ['currentPostData', 'relatedPostsData', 'modResponse']
        .some(key => key in changes);
      
      if (hasUpdates) {
        requestAnimationFrame(() => updateSummaries());
      }
    }
  });

  function updateUI(isConnected, customStatus) {
    // Update status indicator
    statusIndicator.classList.toggle('connected', isConnected);
    
    // Update status text
    if (customStatus) {
      statusElement.textContent = customStatus;
    } else {
      statusElement.textContent = isConnected ? 'Ready to summarize' : 'Not connected';
    }
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
        document.getElementById('currentSummary').querySelector('.content-text').textContent = data.currentPostData.summary;
      }

      // Update mod response
      if (data.modResponse) {
        document.getElementById('modResponse').querySelector('.content-text').textContent = data.modResponse;
      }

      // Update related summaries
      if (data.relatedPostsData) {
        const relatedHtml = Object.entries(data.relatedPostsData)
          .filter(([_, post]) => post && post.summary)
          .slice(0, 3) // Limit to 3 posts
          .map(([url, post]) => {
            // Split summary into bullet points and filter out empty ones
            const bulletPoints = post.summary
              .split('\n')
              .map(point => point.trim())
              .filter(point => point && point.length > 0)
              .map(point => {
                // Remove leading dash or bullet if present
                point = point.replace(/^[-•]\s*/, '');
                return `<li>${point.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}</li>`;
              })
              .slice(0, 3) // Limit to 3 bullet points
              .join('');

            return `
              <div class="related-post">
                <strong>${post.title || 'Related Post'}</strong>
                <ul>${bulletPoints}</ul>
              </div>
            `;
          }).join('') || 'No related posts found';
        
        document.getElementById('relatedSummaries').querySelector('.content-text').innerHTML = relatedHtml;
      }
    } catch (error) {
      console.error('Error updating summaries:', error);
    }
  }
}); 