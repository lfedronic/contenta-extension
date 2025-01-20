let videoName = "";

chrome.runtime.sendMessage({action: "getVideoInfo"}, (response) => {
    console.log("Data received in popup:", response);
    const showVideo= document.querySelector("#videoName");
    videoName = response.content;
    showVideo.textContent = videoName;
});

let saveVideoButton = document.querySelector("#saveVideo");

saveVideoButton.addEventListener("click", () => {
    saveVideoButton.textContent = "Saved!";
    saveVideoButton.style.backgroundColor = "green";
    chrome.runtime.sendMessage({ action: "saveVideo", content: videoName }, (response) => {
        console.log("Video saved:", response);
        
    });
    
    
});
  
  