// Load saved options
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['ollamaUrl', 'model', 'targetLanguage'], (result) => {
    document.getElementById('ollamaUrl').value = result.ollamaUrl || 'http://localhost:11434';
    document.getElementById('model').value = result.model || 'llama3';
    
    const targetLanguageSelect = document.getElementById('targetLanguage');
    if (result.targetLanguage) {
      for (let i = 0; i < targetLanguageSelect.options.length; i++) {
        if (targetLanguageSelect.options[i].value === result.targetLanguage) {
          targetLanguageSelect.selectedIndex = i;
          break;
        }
      }
    }
  });
});

// Save options
document.getElementById('save').addEventListener('click', () => {
  const ollamaUrl = document.getElementById('ollamaUrl').value.trim();
  const model = document.getElementById('model').value.trim();
  const targetLanguage = document.getElementById('targetLanguage').value;
  
  chrome.storage.sync.set({
    ollamaUrl: ollamaUrl,
    model: model,
    targetLanguage: targetLanguage
  }, () => {
    const status = document.getElementById('status');
    status.textContent = 'Settings saved!';
    status.className = 'status success';
    status.style.display = 'block';
    
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  });
});

// Test connection
document.getElementById('test').addEventListener('click', async () => {
  const ollamaUrl = document.getElementById('ollamaUrl').value.trim();
  const model = document.getElementById('model').value.trim();
  const testResult = document.getElementById('testResult');
  
  testResult.textContent = 'Testing connection...';
  testResult.className = 'status';
  testResult.style.display = 'block';
  
  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        prompt: 'Say "Connection successful!" in one short sentence.',
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    
    testResult.textContent = `Connection successful! Model ${model} is working.`;
    testResult.className = 'status success';
  } catch (error) {
    testResult.textContent = `Connection failed: ${error.message}. Make sure Ollama is running and the model is downloaded.`;
    testResult.className = 'status error';
  }
});