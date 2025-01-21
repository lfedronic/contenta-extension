let videoName = "";
let videoUrl = "";

chrome.runtime.sendMessage({action: "getVideoInfo"}, (response) => {
    console.log("Data received in popup:", response);
    const showVideo= document.querySelector("#videoName");
    videoName = response.content.name;
    videoUrl = response.content.url;
    showVideo.textContent = videoName;
});

let saveVideoButton = document.querySelector("#saveVideo");

saveVideoButton.addEventListener("click", () => {
    saveVideoButton.textContent = "Saved!";
    saveVideoButton.style.backgroundColor = "green";
    chrome.runtime.sendMessage({ action: "saveVideo", content: {"url" : videoUrl} }, (response) => {
        if (response.status === "duplicate") {
            saveVideoButton.textContent = "Already saved!";
            saveVideoButton.style.backgroundColor = "red";
        }
    });
    
    
});
  
  