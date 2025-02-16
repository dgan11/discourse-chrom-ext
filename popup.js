document.addEventListener('DOMContentLoaded', async () => {
  const statusElement = document.getElementById('status');
  const statusIndicator = document.getElementById('statusIndicator');
  const actionButton = document.getElementById('actionButton');
  const forumInfo = document.getElementById('forumInfo');

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
    } catch (error) {
      console.error('Error toggling connection:', error);
      updateUI(false, 'Error: Could not update connection');
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
  }
}); 