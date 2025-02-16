document.addEventListener('DOMContentLoaded', () => {
  const statusElement = document.getElementById('status');
  const actionButton = document.getElementById('actionButton');

  // Initialize UI state
  chrome.storage.local.get(['isConnected'], (result) => {
    updateUI(result.isConnected);
  });

  actionButton.addEventListener('click', async () => {
    const currentState = await chrome.storage.local.get(['isConnected']);
    const newState = !currentState.isConnected;
    
    await chrome.storage.local.set({ isConnected: newState });
    updateUI(newState);

    // Notify content script of state change
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { type: 'connectionUpdate', isConnected: newState });
  });

  function updateUI(isConnected) {
    actionButton.textContent = isConnected ? 'Disconnect' : 'Connect';
    statusElement.textContent = isConnected ? 'Connected to Discourse' : 'Not connected';
    actionButton.classList.toggle('connected', isConnected);
  }
}); 