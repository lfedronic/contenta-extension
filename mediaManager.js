const savedMedia = document.querySelector("#savedVideos");

chrome.runtime.sendMessage({ action: "getVideoInfo" }, (response) => {
    console.log("Data received in popup:", response);
    const videoName = response.content.name;
    if (!videoName) {
        console.log("No video name provided");
        return;
    }
    let addThisVideoButton = document.querySelector("#addThisVideo");
    addThisVideoButton.innerHTML = `Add: <b>${videoName}</b>`;
});


chrome.runtime.sendMessage({action: "getSavedVideos"}, (response) => {
    console.log("Data received in popup:", response);
    
    if (!response) {
        return;
    }
    savedMedia.innerHTML = "";
    
    const sortedEntries = Object.entries(response).sort((a, b) => {
        return new Date(b[1].timeSaved) - new Date(a[1].timeSaved);
    });

    const topEntries = sortedEntries.slice(0, 3);

    for (const [url, info] of topEntries) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.textContent = info.name;
        a.href = url;
        a.target = "_blank";
        li.appendChild(a);
        savedMedia.appendChild(li);
    }
    });

let addThisVideoButton = document.querySelector("#addThisVideo");

addThisVideoButton.addEventListener("click", () => {
    let videoName = "";
    chrome.runtime.sendMessage({ action: "getVideoInfo" }, (response) => {
        console.log("Data received in popup:", response);
        videoName = response.content;
        if (!videoName) {
            addThisVideoButton.insertAdjacentHTML("afterend", "<p>You're not watching one!</p>");
            return;
        }
        console.log(videoName);
        chrome.runtime.sendMessage({ action: "saveVideo", content: videoName }, (response) => {
            if (response.status === "duplicate") {
                addThisVideoButton.textContent = "Already saved!";
                addThisVideoButton.style.backgroundColor = "red";
                return;
            }    
            console.log("Video saved:", response);
            chrome.runtime.sendMessage({action: "getSavedVideos"}, (response) => {
                console.log("Data received in popup:", response);
                
                
                if (!response) {
                    return;
                }
                savedMedia.innerHTML = "";
                const sortedEntries = Object.entries(response).sort((a, b) => {
                    return new Date(b[1].timeSaved) - new Date(a[1].timeSaved);
                });
            
                const topEntries = sortedEntries.slice(0, 3);
            
                for (const [url, info] of topEntries) {
                    const li = document.createElement("li");
                    const a = document.createElement("a");
                    a.textContent = info.name;
                    a.href = url;
                    a.target = "_blank";
                    li.appendChild(a);
                    savedMedia.appendChild(li);
                }
                });
                addThisVideoButton.textContent = "Added!";
                addThisVideoButton.style.backgroundColor = "green";
            });
        });
        
        
    });

let openDashboardButton = document.querySelector("#openDashboard");

openDashboardButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "openDashboard" });
});




// let submitManualVideoButton = document.querySelector("#submitManualVideoButton");


// submitManualVideoButton.addEventListener("click", () => {
//     let manualVideoName = document.querySelector("#videoNameForm").value;
//     if (!manualVideoName) {
//         console.log("No video name provided");
//         return;
//     }
//     console.log(manualVideoName);
//     chrome.runtime.sendMessage({ action: "saveVideo", content: manualVideoName }, (response) => {
//         console.log("Video saved:", response);
//     });
//     const li = document.createElement("li");
//     li.textContent = manualVideoName;
//     savedMedia.appendChild(li);
//     submitManualVideoButton.textContent = "Added!";
//     submitManualVideoButton.style.backgroundColor = "green";
// });