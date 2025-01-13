const filter = { // filter for web page to run content script
  url: [
    {
        urlMatches: "https://www.youtube.com/watch*",
    }
  ]
};

const LOADTIME = 250; // hard-code load-time, will need to change this to a more dynamic solution

function getVideoInfo() {
    const content = document.querySelector("#microformat > player-microformat-renderer > script"); // simple way to get the video info
    console.log("Here's your content: ")
    console.log(JSON.parse(content.innerHTML));
    chrome.runtime.sendMessage({action: "openVideoSuggestionPopup", content: JSON.parse(content.innerHTML)}); // send message to background.js
}

let videoInfo = {};

chrome.storage.local.set({"savedVideos": []}, () => {
    console.log("Saved videos initialized!");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => { // message handler for background.js
    if (message.action === "openVideoSuggestionPopup") {
        console.log("OPEN POPUP CALLED!!");
        console.log(message.content);
        videoInfo = message.content;
        chrome.action.setPopup({popup: "addVideoSuggestion.html"});
        chrome.action.openPopup();
        chrome.action.setPopup({popup: "savedMedia.html"});
    }
    else if (message.action === "getVideoInfo") {
        console.log("GET DATA CALLED!!!");
        console.log(videoInfo);
        sendResponse(videoInfo);
    }
    else if (message.action === "saveVideo") {
        console.log("SAVE VIDEO CALLED!!!");
        chrome.storage.local.get(["savedVideos"], (result) => {
            const savedVideos = result.savedVideos || [];
            savedVideos.push(videoInfo.name);
            console.log(savedVideos);
            chrome.storage.local.set({"savedVideos": savedVideos}, () => {
                console.log("Video saved!");
            });
        });
        sendResponse(videoInfo);
    }
    else if (message.action === "getSavedVideos") {
        console.log("GET SAVED VIDEOS");
        chrome.storage.local.get(["savedVideos"], (result) => {
            console.log(result.savedVideos);
            sendResponse(result.savedVideos || []);
        });
        return true; 
    }
    return true; 
});



chrome.webNavigation.onCompleted.addListener(function(details) { // event listener for when the page is loaded
    setTimeout(() => {
        console.log("onCompleted");
    }, LOADTIME); // hard-code load-time, will need to change this to a more dynamic solution
    chrome.scripting.executeScript({
        target : {tabId : details.tabId},
        func : getVideoInfo,
      })}, filter);

chrome.webNavigation.onHistoryStateUpdated.addListener(function(details) { // event listener for when the page is updated (e.g. clicking on a video)
    setTimeout(() => {
        console.log("onHistoryStateUpdated");
    }, LOADTIME); // hard-code load-time, will need to change this to a more dynamic solution
    chrome.scripting.executeScript({
        target : {tabId : details.tabId},
        func : getVideoInfo,
      })}, filter);
    