// This forces the Side Panel to slide open when you click the extension icon
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));