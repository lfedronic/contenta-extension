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

function getDurationInfo() {
    const content = document.querySelector("#movie_player > div.html5-video-container > video");
    console.log("Here's your content: ");
    console.log(content);
    console.log(content.currentTime);
    chrome.runtime.sendMessage({action: "videoDuration", content: content.duration}); // send message to background.js
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
    else if (message.action === "videoDuration") {
        console.log("GET DURATION CALLED!!!");
        console.log(message.content);
        sendResponse(message.content);
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
      });
}, filter);

watchFilter = { // filter for web page to run content script
    urls: [
      "https://www.youtube.com/api/stats/watchtime*",
    ]
};

// Regular expression to extract st and et values
const regex = /(?:^|&)st=([^&]*)&et=([^&]*)/;


chrome.webRequest.onBeforeRequest.addListener((details) => {
    console.log("Web Request!!!");
    console.log(details);
    const url = details.url;
    

    // Match the st and et values
    const match = url.match(regex);

    if (match) {
        const stValues = match[1].split('%2C'); // Split st values by commas
        const etValues = match[2].split('%2C'); // Split et values by commas

        console.log("st:", stValues);
        console.log("et:", etValues);
    } else {
        console.log("No match found");
    }
    // "https://www.youtube.com/api/stats/watchtime?ns=yt&el=detailpage&cpn=RXFklrJz2QeRyx9K&ver=2&cmt=3.353&fmt=399&fs=0&rt=10.007&euri&lact=2219&cl=713293821&state=playing&volume=90&cbrand=apple&cbr=Chrome&cbrver=131.0.0.0&c=WEB&cver=2.20250108.06.00&cplayer=UNIPLAYER&cos=Macintosh&cosver=10_15_7&cplatform=DESKTOP&hl=en_US&cr=US&uga=m19&len=735.821&rtn=20&feature=g-high-rec&afmt=251&idpj=-7&ldpj=-6&rti=10&st=0&et=3.353&muted=0&vis=10&docid=AFBlq3Bb2pY&ei=_xuGZ-3GLKe8sfIP9JOhuAg&plid=AAYrphi7hf1DlA9Z&referrer=https%3A%2F%2Fwww.youtube.com%2F&sdetail=p%3A%2F&sourceid=y&of=6BTfLVgHhIdHWlqVSrnPnA&vm=CAEQARgEOjJBSHFpSlRLUXNZMS1ldE8wak9zOHRFWXFzNWVUajc3aXh4MmhDSklWbzZMNHo0OGVfQWJbQUZVQTZSUVFOVGpMNDBCTWFJdGxkQy1ldnpZVWZQRnBnRzFZUGRneElnWFdkNjZCQmMtQi10QzVUZVpkaTlYcE43eTIyTW9MdDVhSUxhZkNBaV9ZREhTT2RkNA"


}, watchFilter);

// Need to do:
// - whenever new video starts playing -> get duration of video, start tracking watchtime
// - show pop-up once they're half-way thru video (no skips)