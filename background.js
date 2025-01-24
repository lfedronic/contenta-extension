// CONSTANTS
const LOADTIME = 1500; // hard-code load-time, will need to change this to a more dynamic solution
const DURATION_PERCENTAGE = 0.75; // percentage of video watched to trigger popup
const SCROLL_DT = 2000; // time interval for scroll rate tracking
const SCROLL_RATE_THRESHOLD = 0.75; 
const SKIPS_THRESHOLD = 2; 

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
    "saveSessionWatchtimes": handleSaveSessionWatchtimes,
    "openDashboard": handleOpenDashboard,
    "log": (message, sender, sendResponse) => {console.log(`URGENT LOG SENT FROM '${sender}': '${message}'`)},
    "disqualifyArticle": handleDisqualifyArticle,   
}

// MESSAGE HANDLERS

function handleGetVideoInfo(message, sender, sendResponse) {
    //console.log("GET DATA CALLED!!!");
    chrome.storage.session.get(["currentVideoName", "currentVideoUrl"], (result) => {
        //console.log("Current video name: ", result.currentVideoName);
        sendResponse({"content": {"name": result.currentVideoName, "url": result.currentVideoUrl}});
    });
}

function handleSaveVideo(message, sender, sendResponse) {
    //console.log("SAVE VIDEO CALLED!!!");
    //console.log("Requested from: ", sender);

    chrome.storage.local.get(["savedVideos"], (result) => {
        chrome.storage.session.get(["currentVideoUrl", "currentVideoName", "currentThumbnailUrl"], (currentResult) => {
            if (!currentResult.currentVideoName || !currentResult.currentVideoUrl || !currentResult.currentThumbnailUrl) {
                //console.log("No video to save");
                sendResponse({"status": "incomplete"});
                return;
            }
            const savedVideos = result.savedVideos || {};
            if (savedVideos.hasOwnProperty(currentResult.currentVideoUrl)) {
                //console.log("Video already saved");
                sendResponse({"status": "duplicate"});
                return;
            }
            savedVideos[currentResult.currentVideoUrl] = {"name": currentResult.currentVideoName, "timeSaved": new Date().toLocaleString(), "thumbnailUrl": currentResult.currentThumbnailUrl};
            //console.log(savedVideos);
            chrome.storage.local.set({"savedVideos": savedVideos}, () => {
                //console.log("Video saved!");
            });
            sendResponse({"status": "received"});
        });
        
    });
}
    

function handleGetSavedVideos(message, sender, sendResponse) {
    //console.log("GET SAVED VIDEOS");
    chrome.storage.local.get(["savedVideos"], (result) => {
        //console.log(result.savedVideos);
        sendResponse(result.savedVideos || {});
    });
}

function handleGetVideoDuration(message, sender, sendResponse) {
    //console.log("GET DURATION CALLED!!!");
    const videoInfo = JSON.parse(document.querySelector("#microformat > player-microformat-renderer > script").innerHTML); // simple way to get the video info
    const duration = parseInt(videoInfo.duration.match(/\d+/)[0], 10);
    chrome.storage.session.set({"currentVideoDuration": duration});
    if (!duration) {
        //console.log("No duration found");
        sendResponse({"status": "incomplete", "duration": null});
        return;
    }
    sendResponse({"status": "done", "duration": duration});

}

function handleSendingVideoInfo(message, sender, sendResponse) { // passes thru injected script to reach this (don't access storage directly)
    const newWatchedTime = message.content.newWatchedTime;
    
    const durationInSecs = message.content.videoDuration
    const name = message.content.videoName;
    const url = message.content.videoUrl;
    let sessionWatchtimes = message.content.sessionWatchtimes || {};

    if (!sessionWatchtimes.hasOwnProperty(url)) {
        sessionWatchtimes[url] = newWatchedTime;
        ////console.log("New session video added")
    }
    
    else {
       
        const prevWatchTime = sessionWatchtimes[url];
        sessionWatchtimes[url] += newWatchedTime;
        
        const savedVideos = message.content.savedVideos;
        
        chrome.storage.session.get(["suggestedSaves"], (result) => {
        
            const suggestedSaves = new Set(result.suggestedSaves || []);
            if (!suggestedSaves.has(url) && !savedVideos.hasOwnProperty(url) && prevWatchTime + newWatchedTime >= DURATION_PERCENTAGE * durationInSecs) {
                // Add the new URL to the Set
                suggestedSaves.add(url);
    
                // Convert the Set back to an array for storage (chrome.storage only supports serializable data)
                chrome.storage.session.set({ "suggestedSaves": Array.from(suggestedSaves) }, () => {
                    console.log("Suggested save: ", url);
    
                    chrome.storage.session.get("suggestedSaves", (result) => {
                        console.log("Suggested saves: ", result.suggestedSaves);
    
                        // Perform actions after saving
                        chrome.action.setPopup({ popup: "addVideoSuggestion.html" });
                        chrome.action.openPopup();
                        chrome.action.setPopup({ popup: "mediaManager.html" });
                    });
                });
            }
        });
        
        
        const percentWatched = (prevWatchTime + newWatchedTime) / durationInSecs;
        //console.log("Percent watched: ", (percentWatched * 100).toFixed(2) );   
        
                 
    }
    //console.log(sessionWatchtimes );
    sendResponse({"sessionWatchtimes": sessionWatchtimes, "do": "nothing"});
}

function handleSaveSessionWatchtimes(message, sender, sendResponse) {
    ////console.log("Saving session watchtimes");
    chrome.storage.session.set({"sessionWatchtimes": message.content});
    sendResponse({"status": "received"});
}

function handleProcessAlreadyShown(message, sender, sendResponse) {
    if (message.content === "toggleTrue") {
        chrome.storage.session.set({"alreadyShown": true});
    } else if (message.content === "toggleFalse") {
        chrome.storage.session.set({"alreadyShown": false});
    } else {
        chrome.storage.session.get(["alreadyShown"], (result) => {
            //console.log("Already shown: ", result.alreadyShown);
            sendResponse({"content": result.alreadyShown});
            return;
        });
    }
    sendResponse({"content": "null"});
}

function handleOpenDashboard(message, sender, sendResponse) {
    chrome.tabs.create({url: "dashboard.html"});
}

function handleDisqualifyArticle(message, sender, sendResponse) {
    chrome.storage.session.get(["currentArticleURL", "disqualifiedArticles"], (result) => {
        const disqualifiedArticles = new Set(result.disqualifiedArticles || []);
        disqualifiedArticles.add(result.currentArticleURL);
        chrome.storage.session.set({"disqualifiedArticles": Array.from(disqualifiedArticles)});
    });
}

// HELPER FUNCTIONS

function getUpdatedVideoInfo() { // used when user goes from one youtube video to the next 
    const videoInfo = document.querySelector("head > title").textContent.replace(" - YouTube", "");
    //console.log("Video info: ", videoInfo);
    chrome.storage.session.set({"currentVideoName": videoInfo.name, "currentVideoUrl": videoInfo.url, "currentThumbnailUrl": videoInfo.thumbnailUrl});
    return videoInfo;
}


function processWatchTime(newWatchedTime, videoName, videoUrl, videoDuration, sessionWatchtimes, savedVideos, alreadyShown) {
    chrome.runtime.sendMessage({action: "sendingVideoInfo", content: {"newWatchedTime": newWatchedTime, "videoName": videoName, "videoUrl": videoUrl, "videoDuration": videoDuration, "sessionWatchtimes": sessionWatchtimes, "savedVideos": savedVideos, "alreadyShown": alreadyShown}}, (response) => {
        if (response.do === "openSuggestedVideoPopup") {
            //console.log("Opening suggested video popup");
        };
        //console.log("Returning watchtimes: ", response.sessionWatchtimes);
        chrome.runtime.sendMessage({action: "saveSessionWatchtimes", content: response.sessionWatchtimes});
    });
}

function getDuration() {
    const videoInfo = JSON.parse(document.querySelector("#microformat > player-microformat-renderer > script").innerHTML); // simple way to get the video info
    const duration = parseInt(videoInfo.duration.match(/\d+/)[0], 10);
    return duration;
}

function getThumbnailUrl() {
    const videoInfo = JSON.parse(document.querySelector("#microformat > player-microformat-renderer > script").innerHTML); // simple way to get the video info
    return videoInfo.thumbnailUrl[0];
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
        
        //console.log("st:", stValues);
        //console.log("et:", etValues);
        return newWatchedTime;
    } else {
        //console.log("No match found");
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
    //console.log(details);
    const url = details.url;

    chrome.storage.session.get(["currentVideoName", "currentVideoUrl", "currentVideoDuration", "sessionWatchtimes", "alreadyShown"], (result) => {  
        if (url.includes("el=adunit")) {
            //console.log("Currently playing ad");
            return;
        } else { // Get video info  
            chrome.storage.local.get(["savedVideos"], (savedResult) => {
                const newWatchedTime = extractWatchTime(url, regex);
                if (newWatchedTime) {
                    chrome.scripting.executeScript({
                        target: {tabId: details.tabId},
                        func: processWatchTime,
                        args: [newWatchedTime, result.currentVideoName, result.currentVideoUrl, result.currentVideoDuration, result.sessionWatchtimes || {}, savedResult.savedVideos || {}, result.alreadyShown]     
                    });
                }
            });
        }
    });
    
    
}, watchTimeFilter);


// HANDLE EXTENSION OPENING

chrome.action.onClicked.addListener((tab) => {
    //console.log("Action clicked!");
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
        if (tab && tab.url && tab.title && tab.url.startsWith("https://www.youtube.com/watch")) {  

            videoInfo["url"] = tab.url;
            videoInfo["title"] = tab.title;
            
            chrome.scripting.executeScript({
                target: {tabId: tabId},
                func: getDuration
            }, (response) => {
                if (response) {
                    videoInfo["duration"] = response[0].result;

                    chrome.scripting.executeScript({
                        target: {tabId: tabId},
                        func: getThumbnailUrl
                    }, (response) => {
                        if (response) {
                            videoInfo["thumbnailUrl"] = response[0].result;
                            callback(videoInfo);
                            return;
                        }
                        else {
                            callback("no thumbnail found");
                            return;
                        }
                    });
                }
                else {
                    callback("no duration found");
                    return;
                }            
            });
        } else {
            callback("no tab info found");
            return;
        }
    });   
}


chrome.tabs.onActivated.addListener((activeInfo) => {
    
    getActiveTabVideoInfo(activeInfo.tabId, (tabInfo) => {
        if (tabInfo && tabInfo.url) {
            if (tabInfo.url.startsWith("https://www.youtube.com/watch")) {
                chrome.storage.session.set({"currentVideoUrl": tabInfo.url, "currentVideoName": tabInfo.title.replace(" - YouTube", ""), "currentVideoDuration": tabInfo.duration, "currentThumbnailUrl": tabInfo.thumbnailUrl});
            }
        }
        else {
            //console.log("Tab Info is not accessible in onActivated.");
            //console.log(tabInfo);
        }
    });
    chrome.storage.session.set({"alreadyShown": false});
});

chrome.webNavigation.onCompleted.addListener((details) => { // event listener for when the page is loaded
    
    setTimeout(() => {
        getActiveTabVideoInfo(details.tabId, (tabInfo) => {
            //console.log("Tab info from onActivated", tabInfo);
            if (tabInfo) {
                chrome.storage.session.set({"currentVideoUrl": tabInfo.url, "currentVideoName": tabInfo.title.replace(" - YouTube", ""), "currentVideoDuration": tabInfo.duration, "currentThumbnailUrl": tabInfo.thumbnailUrl});
            }
            else {
                //console.log("Tab Info is not accessible in web nav.");
                //console.log(tabInfo);
            }
        });
        chrome.storage.session.set({"alreadyShown": false});
    }, LOADTIME);
   
}, videoFilter);

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => { // event listener for when the page is updated (e.g. clicking on a video)
    
    setTimeout(() => {
        getActiveTabVideoInfo(details.tabId, (tabInfo) => {
            //console.log("Tab info from onActivated", tabInfo);
            if (tabInfo) {
                //console.log("Duration info: ", tabInfo.duration);
                chrome.storage.session.set({"currentVideoUrl": tabInfo.url, "currentVideoName": tabInfo.title.replace(" - YouTube", ""), "currentVideoDuration": tabInfo.duration, "currentThumbnailUrl": tabInfo.thumbnailUrl});
            }
            else {
                //console.log("Tab Info is not accessible in onHistoryUpdated.");
            }
        });
        chrome.storage.session.set({"alreadyShown": false});
    }, LOADTIME);

}, videoFilter);

// ACTIVE TAB MANAGEMENT

// function insertDiv() {
//     const div = document.createElement("div");
//     div.id = "testDiv";
//     const body = document.querySelector("body");
//     //body.style = "background-color: black";
//     body.appendChild(div);
//     //body.style = "background-color: red";
//     addEventListener("scroll", () => {
        
//         // window.scrollY distance from top of page 
//         // const pageHeight = document.documentElement.scrollHeight;
//         // console.log('Page height:', pageHeight);

//         // const scrollTop = window.scrollY;
//         // console.log("Distance from bottom of page:", pageHeight - scrollTop - window.innerHeight);

//         const totalHeight = document.documentElement.scrollHeight - window.innerHeight;

//         const scrollPercentage = (window.scrollY / totalHeight) * 100;
//         //console.log("Num pixels read: ", window.scrollY);
//         console.log("Num lines read:", window.scrollY / 25);
//         console.log('Scroll percentage:', scrollPercentage);
//         console.log("Num minutes spent reading: ", window.scrollY / 25 / 60);

//         // const viewportHeight = window.innerHeight;  // height of visible part of page 
//         // console.log('Viewport height:', viewportHeight);

//     });
// }


function trackScrollRate(SCROLL_DT, SCROLL_RATE_THRESHOLD, SKIPS_THRESHOLD) {
    let scrolledY = 0;
    let likelySkips = 0;
    setTimeout(() => {
        const head = document.head.innerHTML;
        const body = document.body.innerHTML;
        if ((body.includes("author") && body.includes("article")) || ((head.includes("author") && (head.includes("article"))) )) {
            console.log("Article detected");
        }         
    },3000);
    const intervalId = setInterval(() => {
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        const prevScrolledY = scrolledY;
        scrolledY = window.scrollY;
        const rateOfScroll = (scrolledY - prevScrolledY) / SCROLL_DT;
        if (likelySkips > SKIPS_THRESHOLD) {
            console.log("Disinterest detected");
            chrome.runtime.sendMessage({action: "disqualifyArticle"});
            clearInterval(intervalId);
        }
        if (rateOfScroll > SCROLL_RATE_THRESHOLD) {
            console.log("Likely skip detected");
            likelySkips += 1;
        }
        console.log("Rate of scroll:", rateOfScroll);
        // console.log("Scroll percentage:", (window.scrollY / totalHeight) * 100);
        // console.log("Num lines read:", window.scrollY / 25);
        // console.log("Num minutes spent reading:", window.scrollY / 25 / 60);
    }, SCROLL_DT);
    
}




chrome.webNavigation.onCompleted.addListener((details) => { 
    if (!details.frameId == 0) {
        return;
    }
    console.log(details);
    chrome.scripting.executeScript({
        target: {tabId: details.tabId},
        func: trackScrollRate,
        args: [SCROLL_DT, SCROLL_RATE_THRESHOLD, SKIPS_THRESHOLD]
    });
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (!details.frameId == 0) {
        return;
    }
    console.log(details);
    chrome.scripting.executeScript({
        target: {tabId: details.tabId},
        func: trackScrollRate,
        args: [SCROLL_DT, SCROLL_RATE_THRESHOLD, SKIPS_THRESHOLD]
    });
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    console.log(activeInfo);
});

