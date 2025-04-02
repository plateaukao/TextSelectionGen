// Set default options when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['ollamaUrl', 'model', 'targetLanguage'], (result) => {
    if (!result.ollamaUrl) {
      chrome.storage.sync.set({
        ollamaUrl: 'http://localhost:11434',
        model: 'llama3', 
        targetLanguage: 'English'
      });
    }
  });

  // Create context menu
  chrome.contextMenus.create({
    id: "translateSelection",
    title: "Translate Selection with Ollama",
    contexts: ["selection"]
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "translateSelection") {
    chrome.tabs.sendMessage(tab.id, {
      action: "getExpandedSelection"
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "translateText") {
    const fullText = message.text;
    const selectedText = message.selectedText;
    
    chrome.storage.sync.get(['ollamaUrl', 'model', 'targetLanguage'], async (result) => {
      try {
        const response = await fetch(`${result.ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: result.model,
            prompt: `You are a language translator. Please translate ONLY THE TEXT INSIDE <<>> to ${result.targetLanguage}.
Use the rest of the text as context to ensure accurate translation.

Text: "${fullText}"

Translate only what's inside <<>> brackets. Your response should contain ONLY the translation, with no additional explanation or commentary.`,
            stream: false
          })
        });
        
        const data = await response.json();
        
        // Send the translation back to content script
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "showTranslation",
          original: fullText,
          translation: data.response,
          targetLanguage: result.targetLanguage
        });
      } catch (error) {
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "showError",
          error: `Error connecting to Ollama server: ${error.message}`
        });
      }
    });
  }
  
  return true;
});