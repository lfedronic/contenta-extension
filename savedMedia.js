chrome.runtime.sendMessage({ action: "getSavedVideos" }, (response) => {

    // if (response !== undefined) {
    //     console.log("Data received in popup:", response);

    //     // Display data in the popup
    //     const video = document.querySelector("#savedMediaContainer");
    //     const p = document.createElement("p");
    //     if (Array.isArray(response)) {
    //         response.forEach((videoData) => {
    //             const li = document.createElement("li");
    //             li.textContent = videoData.name; // Assuming videoData has a title property
    //             p.appendChild(li);
    //         });
    //     } else {
    //         console.error(response);
    //     }
    //     video.appendChild(p);
    // }
    document.querySelector("#savedMediaContainer").textContent = response;
});