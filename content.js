// Create and inject dialog elements
let dialogContainer = null;
let selectionButton = null;

// Create selection button
function createSelectionButton() {
  if (!selectionButton) {
    selectionButton = document.createElement('div');
    selectionButton.id = 'ollama-translator-button';
    selectionButton.style.cssText = `
      position: absolute;
      width: 28px;
      height: 28px;
      background: #4285f4;
      border-radius: 50%;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10000;
      transition: transform 0.2s;
      display: none;
    `;
    selectionButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 8l6 6 6-6"/>
        <path d="M5 16l6 6 6-6"/>
      </svg>
    `;
    
    selectionButton.addEventListener('mouseover', () => {
      selectionButton.style.transform = 'scale(1.1)';
    });
    selectionButton.addEventListener('mouseout', () => {
      selectionButton.style.transform = 'scale(1)';
    });
    
    document.body.appendChild(selectionButton);
  }
}

function createDialog() {
  if (dialogContainer) return;
  
  dialogContainer = document.createElement('div');
  dialogContainer.id = 'ollama-translator-dialog';
  dialogContainer.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 23px 0 rgba(0, 0, 0, 0.2);
    padding: 16px;
    max-width: 500px;
    width: 80%;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    display: none;
  `;
  
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    border-bottom: 1px solid #eee;
    padding-bottom: 8px;
  `;
  
  const title = document.createElement('h3');
  title.textContent = 'Ollama Translation';
  title.style.margin = '0';
  
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    margin: 0;
  `;
  closeButton.addEventListener('click', () => {
    dialogContainer.style.display = 'none';
  });
  
  header.appendChild(title);
  header.appendChild(closeButton);
  
  const content = document.createElement('div');
  content.id = 'ollama-translator-content';
  
  dialogContainer.appendChild(header);
  dialogContainer.appendChild(content);
  document.body.appendChild(dialogContainer);
}

// Get the expanded selection (full sentence with original selection marked)
function getExpandedSelection() {
  console.log("getExpandedSelection");
  const selection = window.getSelection();
  if (!selection.toString().trim()) return { fullText: "", selectedText: "" };
  
  console.log("Selection found:", selection.toString());
  const selectedText = selection.toString().trim();
  const range = selection.getRangeAt(0);
  const startNode = range.startContainer;
  
  // If selection is already in a text node, get the full text
  if (startNode.nodeType === Node.TEXT_NODE) {
    let fullText = startNode.textContent;
    let startSentence = 0;
    let endSentence = fullText.length;
    
    // Find beginning of sentence (after previous period + space)
    for (let i = range.startOffset; i > 0; i--) {
      if ((fullText[i-1] === '.' || fullText[i-1] === '!' || fullText[i-1] === '?') && 
          (fullText[i] === ' ' || fullText[i] === '\n')) {
        startSentence = i + 1;
        break;
      }
    }
    
    // Find end of sentence (next period + space)
    for (let i = range.endOffset; i < fullText.length; i++) {
      if ((fullText[i] === '.' || fullText[i] === '!' || fullText[i] === '?') && 
          (i+1 === fullText.length || fullText[i+1] === ' ' || fullText[i+1] === '\n')) {
        endSentence = i + 1;
        break;
      }
    }
    
    // Extract the full sentence
    const sentenceText = fullText.substring(startSentence, endSentence);
    
    // Calculate where the selection is within the sentence
    const selectionStartInSentence = Math.max(0, range.startOffset - startSentence);
    const selectionEndInSentence = Math.min(sentenceText.length, range.endOffset - startSentence);
    
    // Create a version of the sentence with the selection wrapped in <<>>
    const beforeSelection = sentenceText.substring(0, selectionStartInSentence);
    const selectedPortion = sentenceText.substring(selectionStartInSentence, selectionEndInSentence);
    const afterSelection = sentenceText.substring(selectionEndInSentence);
    
    const markedSentence = beforeSelection + "<<" + selectedPortion + ">>" + afterSelection;
    
    return { 
      fullText: markedSentence, 
      selectedText: selectedPortion
    };
  }
  
  // Fallback to just the selection if we can't expand it
  return { 
    fullText: "<<" + selectedText + ">>", 
    selectedText: selectedText 
  };
}

let eventListener = null;
// Handle selection changes
function handleSelection() {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (selectedText) {
    // Calculate the position for the button
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const { fullText, selectedText } = getExpandedSelection();
    
    // Position the button near the end of selection
    createSelectionButton();
    // remove all click event listener
    selectionButton.removeEventListener('click', eventListener);
    eventListener = () => {
      handleTranslationRequest(fullText, selectedText);
    };
    selectionButton.addEventListener('click', eventListener);

    selectionButton.style.left = `${window.scrollX + rect.right + 5}px`;
    selectionButton.style.top = `${window.scrollY + rect.top - 5}px`;
    selectionButton.style.display = 'flex';
  } else {
    if (selectionButton) {
      selectionButton.style.display = 'none';
    }
  }
}

// Handle click on the translation button
function handleTranslationRequest(fullText, selectedText) {
  if (fullText && selectedText) {
    chrome.runtime.sendMessage({
      action: "translateText",
      text: fullText.length < selectedText.length ? selectedText : fullText,
      selectedText: selectedText
    });
  }
}

// Show translation dialog
function showTranslation(original, translation, targetLanguage) {
  createDialog();
  
  const content = document.getElementById('ollama-translator-content');
  
  // Highlight the text between << and >> in the original text
  const highlightedOriginal = original.replace(/<<(.*?)>>/g, '<span style="background-color: #ffeb3b; font-weight: bold;">$1</span>');
  
  content.innerHTML = `
    <div style="margin-bottom: 12px;">
      <h4 style="margin: 0 0 8px 0;">原文</h4>
      <p style="margin: 0; padding: 8px; background: #f5f5f5; border-radius: 4px;">${highlightedOriginal}</p>
    </div>
    <div>
      <h4 style="margin: 0 0 8px 0;">翻譯 (${targetLanguage}):</h4>
      <p style="margin: 0; padding: 8px; background: #f0f7ff; border-radius: 4px;">${translation}</p>
    </div>
  `;
  
  dialogContainer.style.display = 'block';
  // Add event listener to hide dialog when clicking outside
  function handleOutsideClick(event) {
    if (!dialogContainer.contains(event.target)) {
      dialogContainer.style.display = 'none';
      document.removeEventListener('click', handleOutsideClick);
    }
  }

  document.addEventListener('click', handleOutsideClick);
}

// Show error dialog
function showError(errorMessage) {
  createDialog();
  
  const content = document.getElementById('ollama-translator-content');
  content.innerHTML = `
    <div style="color: #d32f2f; text-align: center;">
      <p>${errorMessage}</p>
      <p>Please check your Ollama server settings.</p>
    </div>
  `;
  
  dialogContainer.style.display = 'block';
}

// Listen for mouse up events to detect text selection
document.addEventListener('mouseup', handleSelection);

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "showTranslation") {
    showTranslation(message.original, message.translation, message.targetLanguage);
  } else if (message.action === "showError") {
    showError(message.error);
  }
  
  return true;
});

// Clean up when navigating away or refreshing
window.addEventListener('beforeunload', () => {
  if (selectionButton && selectionButton.parentNode) {
    selectionButton.parentNode.removeChild(selectionButton);
  }
  if (dialogContainer && dialogContainer.parentNode) {
    dialogContainer.parentNode.removeChild(dialogContainer);
  }
});
