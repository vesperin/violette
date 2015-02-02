var QA_REGEX = new RegExp("://stackoverflow\\.com/[^/]+/.+");
var lastTabId = 0;
var lastUrl = null;


// Called when the url of a tab changes.
function checkForValidUrl(tabId, changeInfo, tab) {
  // If we are inside of a question
  var url     = tab.url;
  var proceed = !(typeof(url) === 'undefined');

  if (proceed && tab.url.match(QA_REGEX)){
    // ... show the page action.
    lastTabId = tabId;
    lastUrl   = tab.url;
    chrome.pageAction.show(tabId);
  } else {
    lastUrl   = null;
  }
}

chrome.tabs.onUpdated.addListener(checkForValidUrl);
chrome.tabs.onSelectionChanged.addListener(checkForValidUrl);

window.setInterval(function() {

  // Don't do anything if we don't have a tab yet.
  if (lastTabId == 0) return;

  if(lastUrl == null || !lastUrl.match(QA_REGEX)) return;

  chrome.pageAction.show(lastTabId);
}, 50);
