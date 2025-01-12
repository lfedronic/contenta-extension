console.log("HERE I AM!!!!!!");
chrome.runtime.sendMessage({ action: "getData" }, (response) => {
    console.log("Data received in popup:", response);

    // Display data in the popup
    const displayElement = document.getElementById("displayData");

    displayElement.textContent = response.name;
});
  
  