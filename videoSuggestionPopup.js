console.log("HERE I AM!!!!!!");
chrome.runtime.sendMessage({ action: "getVideoInfo" }, (response) => {
    console.log("Data received in popup:", response);

    // Display data in the popup
    const displayElement = document.getElementById("displayData");

    displayElement.textContent = response.name;
});

let saveVideoButton = document.querySelector("#saveVideo");

saveVideoButton.addEventListener("click", () => {
    saveVideoButton.textContent = "Saved!";
    saveVideoButton.style.backgroundColor = "green";
    chrome.runtime.sendMessage({ action: "saveVideo", content: saveVideoButton }, (response) => {
        console.log("Video saved:", response);
        
    });
    
    
});
  
  