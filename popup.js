document.addEventListener('DOMContentLoaded', () => {
  // Show current settings
  chrome.storage.sync.get(['ollamaUrl', 'model', 'targetLanguage'], (result) => {
    document.getElementById('currentSettings').innerHTML = `
      <div>Server: ${result.ollamaUrl || 'http://localhost:11434'}</div>
      <div>Model: ${result.model || 'qwen2.5:latest'}</div>
      <div>Target Language: ${result.targetLanguage || 'Traditional Chinese'}</div>
    `;
  });
  
  // Open options page
  document.getElementById('options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Open help
  document.getElementById('help').addEventListener('click', () => {
    window.open('https://github.com/ollama/ollama/blob/main/README.md', '_blank');
  });
});