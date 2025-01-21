document.addEventListener("DOMContentLoaded", () => {
    // Send a message to get saved videos
    chrome.runtime.sendMessage({ action: "getSavedVideos" }, (response) => {
        if (response) {
            const videoGallery = document.getElementById("videoGallery");
            const videos = response

            // Populate the gallery
            Object.keys(videos).forEach((url) => {
                const { name, timeSaved, thumbnailUrl } = videos[url];

                // Create a video card
                const card = document.createElement("div");
                card.className = "video-card";

                // Add the thumbnail
                const thumbnail = document.createElement("img");
                thumbnail.src = thumbnailUrl;
                thumbnail.alt = name;
                thumbnail.className = "video-thumbnail";
                thumbnail.addEventListener("click", () => {
                    window.open(url, "_blank"); // Open video URL in a new tab
                });

                // Add the video name
                const title = document.createElement("h3");
                title.textContent = name;

                // Add the time saved
                const time = document.createElement("p");
                time.textContent = `Saved on: ${new Date(timeSaved).toLocaleString()}`;

                // Append everything to the card
                card.appendChild(thumbnail);
                card.appendChild(title);
                card.appendChild(time);

                // Append the card to the gallery
                videoGallery.appendChild(card);
            });
        } else {
            console.error("No videos received or an error occurred.");
        }
    });
});
