// CONSTANTS
const LOADTIME = 250; // hard-code load-time, will need to change this to a more dynamic solution
const DURATION_PERCENTAGE = 0.75; // percentage of video watched to trigger popup

// URL FILTERS
watchFilter = { // filter for web page to run content script
    urls: [
      "https://www.youtube.com/api/stats/watchtime*",
    ]
};

// MESSAGE ROUTING
const processMessage = {
    "openVideoSuggestionPopup": handleOpenVideoSuggestionPopup,
    "getVideoInfo": handleGetVideoInfo,
    "saveVideo": handleSaveVideo,
    "getSavedVideos": handleGetSavedVideos,
    "videoDuration": handleVideoDuration,
    "sendingVideoInfo": handleSendingVideoInfo
}

// MESSAGE HANDLERS

function handleOpenVideoSuggestionPopup(message, sender, sendResponse) {
    console.log("OPEN POPUP CALLED!!");
    console.log(message.content);
    const videoInfo = message.content.videoInfo;
    chrome.storage.session.set({"currentVideoName": videoInfo.name});
    chrome.action.setPopup({popup: "addVideoSuggestion.html"});
    chrome.action.openPopup();
    chrome.action.setPopup({popup: "dashboard.html"});
    sendResponse({"status": "received"});
}

function handleGetVideoInfo(message, sender, sendResponse) {
    console.log("GET DATA CALLED!!!");
    chrome.storage.session.get(["currentVideoName"], (result) => {
        console.log("Current video name: ", result.currentVideoName);
        sendResponse({"content": result.currentVideoName});
    });
}

function handleSaveVideo(message, sender, sendResponse) {
    console.log("SAVE VIDEO CALLED!!!");
    const videoName = message.content;

    if (!videoName) {
        console.log("No video name provided");
        sendResponse({"status": "error"});
        return;
    }
    
    chrome.storage.local.get(["savedVideos"], (result) => {
        const savedVideos = result.savedVideos || [];
        savedVideos.push(videoName);
        console.log(savedVideos);
        chrome.storage.local.set({"savedVideos": savedVideos}, () => {
            console.log("Video saved!");
        });
    });
    sendResponse({"status": "received"});
}

function handleGetSavedVideos(message, sender, sendResponse) {
    console.log("GET SAVED VIDEOS");
    chrome.storage.local.get(["savedVideos"], (result) => {
        console.log(result.savedVideos);
        sendResponse(result.savedVideos || []);
    });
}

function handleVideoDuration(message, sender, sendResponse) {
    console.log("GET DURATION CALLED!!!");
    console.log(message.content);
    sendResponse(message.content);
}

function handleSendingVideoInfo(message, sender, sendResponse) {
    console.log(message.content.videoInfo.name);
    chrome.storage.session.set({"currentVideoName": message.content.videoInfo.name});
    chrome.storage.session.set({"currentVideoUrl": message.content.videoInfo.embedUrl});
    const newWatchedTime = message.content.newWatchedTime;
    const url = message.content.videoInfo.embedUrl;
    const durationInSecs = parseInt(message.content.videoInfo.duration.match(/\d+/)[0], 10);

    if (!watchTimes.hasOwnProperty(url)) {
        watchTimes[url] = newWatchedTime;
    }
    else {
        const prevWatchTime = watchTimes[url];
        watchTimes[url] += newWatchedTime;
        if (prevWatchTime + newWatchedTime >= DURATION_PERCENTAGE * durationInSecs) {
            console.log("Video watched for more than 75% of its duration");
            sendResponse({"status": "received", "do": "openSuggestedVideoPopup"});
            return true;
            //chrome.runtime.sendMessage({action: "openVideoSuggestionPopup", content: message.content.videoInfo});
        }
        
    }
    console.log(watchTimes);
    sendResponse({"status": "received", "do": "nothing"});
}

// HELPER FUNCTIONS

function getVideoInfo(newWatchedTime) {
    const alternateVideoInfo = document.querySelector("#movie_player > div.html5-video-container > video"); // doesn't work at the moment
    const videoInfo = JSON.parse(document.querySelector("#microformat > player-microformat-renderer > script").innerHTML); // simple way to get the video info
    if (!videoInfo) {
        return {"status": "error"};
    }
    chrome.runtime.sendMessage({action: "sendingVideoInfo", content: {"videoInfo": videoInfo, "newWatchedTime": newWatchedTime}}, (response) => {
        if (response.do === "openSuggestedVideoPopup") {
            chrome.runtime.sendMessage({action: "openVideoSuggestionPopup", content: {"videoInfo": videoInfo}});
        };
    });
    return {"status": "done", "videoInfo": videoInfo};
}

function extractWatchTime(url, regex){

    const match = url.match(regex);

    if (match) {
        const stValues = match[1].split('%2C'); // Split st values by commas
        const etValues = match[2].split('%2C'); // Split et values by commas

        const startTime = Number(stValues[0]);
        const endTime = Number(etValues[etValues.length - 1]);
        const newWatchedTime = endTime - startTime;

        console.log("st:", stValues);
        console.log("et:", etValues);
        return newWatchedTime;
    } else {
        console.log("No match found");
        return null; // No match foundo
    }

}

let watchTimes = {};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => { 
    processMessage[message.action](message, sender, sendResponse);
    return true;
});


chrome.webRequest.onCompleted.addListener((details) => {
    const regex = /(?:^|&)st=([^&]*)&et=([^&]*)/; // Regular expression to extract st and et values
    console.log("Watchtime Request!!!");
    console.log(details);
    const url = details.url;
    
    if (url.includes("el=adunit")) {
        console.log("Currently playing ad");
        return;
    } else { // Get video info
        const newWatchedTime = extractWatchTime(url, regex);
        chrome.scripting.executeScript({
            target : {tabId : details.tabId},
            func : getVideoInfo,
            args: [newWatchedTime]
        });
    }
}, watchFilter);


chrome.action.onClicked.addListener((tab) => {
    console.log("Action clicked!");
    chrome.scripting.executeScript({
        target : {tabId : tab.id},
        func : getVideoInfo,
        args: [0]
    }, (response) => {
        console.log(response.result);
        chrome.action.setPopup({popup: "dashboard.html"});
        chrome.action.openPopup();
        chrome.action.setPopup({popup: ''});
    });
    
    
});






// OLD CODE

// const filter = { // filter for web page to run content script
//   url: [
//     {
//         urlMatches: "https://www.youtube.com/watch*",
//     }
//   ]
// };


// chrome.webNavigation.onCompleted.addListener(function(details) { // event listener for when the page is loaded
//     setTimeout(() => {
//         console.log("onCompleted");
//     }, LOADTIME); // hard-code load-time, will need to change this to a more dynamic solution
//     chrome.scripting.executeScript({
//         target : {tabId : details.tabId},
//         func : getVideoInfo,
//       })}, filter);
    

// chrome.webNavigation.onHistoryStateUpdated.addListener(function(details) { // event listener for when the page is updated (e.g. clicking on a video)
//     setTimeout(() => {
//         console.log("onHistoryStateUpdated");
//     }, LOADTIME); // hard-code load-time, will need to change this to a more dynamic solution
//     console.log(details);
//     chrome.scripting.executeScript({
//         target : {tabId : details.tabId},
//         func : getVideoInfo,
//         args: [10]
//       });