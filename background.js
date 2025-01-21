// CONSTANTS
const LOADTIME = 1500; // hard-code load-time, will need to change this to a more dynamic solution
const DURATION_PERCENTAGE = 0.15; // percentage of video watched to trigger popup

// URL FILTERS
watchTimeFilter = { // filter for web page to run content script
    urls: [
      "https://www.youtube.com/api/stats/watchtime*",
    ]
};

videoFilter = {
    url: [
        {urlMatches : "https://www.youtube.com/watch"}
        ]
}

// MESSAGE ROUTING
const processMessage = {
    "getVideoInfo": handleGetVideoInfo,
    "saveVideo": handleSaveVideo,
    "getSavedVideos": handleGetSavedVideos,
    "getVideoDuration": handleGetVideoDuration,
    "sendingVideoInfo": handleSendingVideoInfo,
    "saveSessionWatchtimes": handleSaveSessionWatchtimes
}

// MESSAGE HANDLERS

function handleGetVideoInfo(message, sender, sendResponse) {
    console.log("GET DATA CALLED!!!");
    chrome.storage.session.get(["currentVideoName", "currentVideoUrl"], (result) => {
        console.log("Current video name: ", result.currentVideoName);
        sendResponse({"content": {"name": result.currentVideoName, "url": result.currentVideoUrl}});
    });
}

function handleSaveVideo(message, sender, sendResponse) {
    console.log("SAVE VIDEO CALLED!!!");
    console.log("Requested from: ", sender);

    chrome.storage.local.get(["savedVideos"], (result) => {
        chrome.storage.session.get(["currentVideoUrl", "currentVideoName"], (currentResult) => {
            if (!currentResult.currentVideoName || !currentResult.currentVideoUrl) {
                console.log("No video to save");
                sendResponse({"status": "incomplete"});
                return;
            }
            const savedVideos = result.savedVideos || {};
            if (savedVideos.hasOwnProperty(currentResult.currentVideoUrl)) {
                console.log("Video already saved");
                sendResponse({"status": "duplicate"});
                return;
            }
            savedVideos[currentResult.currentVideoUrl] = currentResult.currentVideoName;
            console.log(savedVideos);
            chrome.storage.local.set({"savedVideos": savedVideos}, () => {
                console.log("Video saved!");
            });
            sendResponse({"status": "received"});
        });
        
    });
}
    

function handleGetSavedVideos(message, sender, sendResponse) {
    console.log("GET SAVED VIDEOS");
    chrome.storage.local.get(["savedVideos"], (result) => {
        console.log(result.savedVideos);
        sendResponse(result.savedVideos || {});
    });
}

function handleGetVideoDuration(message, sender, sendResponse) {
    console.log("GET DURATION CALLED!!!");
    const videoInfo = JSON.parse(document.querySelector("#microformat > player-microformat-renderer > script").innerHTML); // simple way to get the video info
    const duration = parseInt(videoInfo.duration.match(/\d+/)[0], 10);
    chrome.storage.session.set({"currentVideoDuration": duration});
    if (!duration) {
        console.log("No duration found");
        sendResponse({"status": "incomplete", "duration": null});
        return;
    }
    sendResponse({"status": "done", "duration": duration});

}

function handleSendingVideoInfo(message, sender, sendResponse) {
    const newWatchedTime = message.content.newWatchedTime;
    
    const durationInSecs = message.content.videoDuration
    const name = message.content.videoName;
    const url = message.content.videoUrl;
    let sessionWatchtimes = message.content.sessionWatchtimes || {};

    if (!sessionWatchtimes.hasOwnProperty(url)) {
        sessionWatchtimes[url] = newWatchedTime;
        console.log("New session video added")
    }
    
    else {
        console.log("Updating current session video");
        const prevWatchTime = sessionWatchtimes[url];
        sessionWatchtimes[url] += newWatchedTime;
        if (prevWatchTime + newWatchedTime >= DURATION_PERCENTAGE * durationInSecs) {
            console.log(`Video watched for more than ${DURATION_PERCENTAGE * 100}% of its duration`);
            chrome.action.setPopup({popup: "addVideoSuggestion.html"});
            chrome.action.openPopup();
            chrome.action.setPopup({popup: "mediaManager.html"});
            
        }
        const percentWatched = (prevWatchTime + newWatchedTime) / durationInSecs;
        console.log("Percent watched: ", (percentWatched * 100).toFixed(2) );   
    }
    console.log(sessionWatchtimes );
    sendResponse({"sessionWatchtimes": sessionWatchtimes, "do": "nothing"});
}

function handleSaveSessionWatchtimes(message, sender, sendResponse) {
    console.log("Saving session watchtimes");
    chrome.storage.session.set({"sessionWatchtimes": message.content});
    sendResponse({"status": "received"});
}


// HELPER FUNCTIONS

function getUpdatedVideoInfo() { // used when user goes from one youtube video to the next 
    const videoInfo = document.querySelector("head > title").textContent.replace(" - YouTube", "");
    chrome.storage.session.set({"currentVideoName": videoInfo.name, "currentVideoUrl": videoInfo.url});
    return videoInfo;
}


function processWatchTime(newWatchedTime, videoName, videoUrl, videoDuration, sessionWatchtimes) {
    chrome.runtime.sendMessage({action: "sendingVideoInfo", content: {"newWatchedTime": newWatchedTime, "videoName": videoName, "videoUrl": videoUrl, "videoDuration": videoDuration, "sessionWatchtimes": sessionWatchtimes}}, (response) => {
        if (response.do === "openSuggestedVideoPopup") {
            console.log("Opening suggested video popup");
        };
        console.log("Returning watchtimes: ", response.sessionWatchtimes);
        chrome.runtime.sendMessage({action: "saveSessionWatchtimes", content: response.sessionWatchtimes});
    });
}

function getDuration() {
    const videoInfo = JSON.parse(document.querySelector("#microformat > player-microformat-renderer > script").innerHTML); // simple way to get the video info
    const duration = parseInt(videoInfo.duration.match(/\d+/)[0], 10);
    return duration;
}

function extractWatchTime(url, regex){

    const match = url.match(regex);

    if (match) {
        const stValues = match[1].split('%2C'); // Split st values by commas
        const etValues = match[2].split('%2C'); // Split et values by commas
        let newWatchedTime = 0;

        for (let i = 0; i < stValues.length; i++) {
            stValues[i] = parseInt(stValues[i], 10);
            etValues[i] = parseInt(etValues[i], 10);
            newWatchedTime += etValues[i] - stValues[i];
        }
        
        console.log("st:", stValues);
        console.log("et:", etValues);
        return newWatchedTime;
    } else {
        console.log("No match found");
        return null; // No match foundo
    }

}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => { 
    processMessage[message.action](message, sender, sendResponse);
    return true;
});


// PROCESS WATCHTIME REQUESTS

chrome.webRequest.onCompleted.addListener((details) => {
    const regex = /(?:^|&)st=([^&]*)&et=([^&]*)/; // Regular expression to extract st and et values
    console.log(details);
    const url = details.url;

    chrome.storage.session.get(["currentVideoName", "currentVideoUrl", "currentVideoDuration", "sessionWatchtimes"], (result) => {
        
        if (url.includes("el=adunit")) {
            console.log("Currently playing ad");
            return;
        } else { // Get video info  
            const newWatchedTime = extractWatchTime(url, regex);
            chrome.scripting.executeScript({
                target : {tabId : details.tabId},
                func : processWatchTime,
                args: [newWatchedTime, result.currentVideoName, result.currentVideoUrl, result.currentVideoDuration, result.sessionWatchtimes || {}]     
            });
        }
    });
    
    
}, watchTimeFilter);


// HANDLE EXTENSION OPENING

chrome.action.onClicked.addListener((tab) => {
    console.log("Action clicked!");
    chrome.storage.session.get(["currentVideoName", "currentVideoUrl"], (result) => {
        chrome.action.setPopup({popup: "mediaManager.html"});
        chrome.action.openPopup();
        chrome.action.setPopup({popup: ''});  
    });
    
});




// HANDLE ACTIVE VIDEO TRACKING


function getActiveTabVideoInfo(tabId, callback) {
   
    let videoInfo = {};

    chrome.tabs.get(tabId, (tab) => {
        if (tab.url && tab.title) {   
            videoInfo["url"] = tab.url;
            videoInfo["title"] = tab.title;
            console.log("Tab info from getActiveTab", tab);
        } else {
            callback(null);
        }
    });

    chrome.scripting.executeScript({
        target: {tabId: tabId},
        func: getDuration
    }, (response) => {
        if (response) {
            videoInfo["duration"] = response[0].result;
            callback(videoInfo);
        }
        else {
            callback(null);
        }
        
    });
}


chrome.tabs.onActivated.addListener((activeInfo) => {
    getActiveTabVideoInfo(activeInfo.tabId, (tabInfo) => {
        if (tabInfo) {
            if (tabInfo.url.startsWith("https://www.youtube.com/watch")) {
                chrome.storage.session.set({"currentVideoUrl": tabInfo.url, "currentVideoName": tabInfo.title.replace(" - YouTube", ""), "currentVideoDuration": tabInfo.duration});
            }
        }
        else {
            console.log("Tab Info is not accessible in onActivated.");
            console.log(tabInfo);
        }
    });
});

chrome.webNavigation.onCompleted.addListener((details) => { // event listener for when the page is loaded
    setTimeout(() => {
        getActiveTabVideoInfo(details.tabId, (tabInfo) => {
            if (tabInfo) {
                chrome.storage.session.set({"currentVideoUrl": tabInfo.url, "currentVideoName": tabInfo.title.replace(" - YouTube", ""), "currentVideoDuration": tabInfo.duration});
            }
            else {
                console.log("Tab Info is not accessible in web nav.");
                console.log(tabInfo);
            }
        });
    }, LOADTIME);
   
}, videoFilter);

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => { // event listener for when the page is updated (e.g. clicking on a video)
    setTimeout(() => {
        getActiveTabVideoInfo(details.tabId, (tabInfo) => {
            if (tabInfo) {
                console.log("Duration info: ", tabInfo.duration);
                chrome.storage.session.set({"currentVideoUrl": tabInfo.url, "currentVideoName": tabInfo.title.replace(" - YouTube", ""), "currentVideoDuration": tabInfo.duration});
            }
            else {
                console.log("Tab Info is not accessible in onHistoryUpdated.");
            }
        });
    }, LOADTIME);

}, videoFilter);




// OLD CODE

// const alternateVideoInfo = document.querySelector("#movie_player > div.html5-video-container > video"); // doesn't work at the moment

    

