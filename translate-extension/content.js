function insertButton() {
    const actionBar = document.querySelector('#top-level-buttons-computed');

    if (actionBar && !document.getElementById('my-translate-button')) {
        // Create a button
        const button = document.createElement('button');
        button.id = 'my-translate-button';
        button.className = 'yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading';
        button.style.marginLeft = '8px';
        button.style.marginRight = '8px';
        button.style.height = '36px';
        button.style.display = 'flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.style.padding = '0 16px';
        button.style.background = 'rgba(255, 255, 255, 0.1)';
        button.style.border = 'none';
        button.style.borderRadius = '18px';
        button.style.color = 'white';
        button.style.fontSize = '14px';
        button.style.cursor = 'pointer';

        button.innerText = 'Translate';

        // Button action
        button.addEventListener('click', (e) => {
            e.preventDefault();
            showLanguagePopup();
        });

        // Insert into the action bar
        actionBar.appendChild(button);
    }
}

// Function to create and show the language selection popup
function showLanguagePopup() {
    // Remove any existing popup
    const existingPopup = document.getElementById('language-popup');
    if (existingPopup) {
        existingPopup.remove();
    }

    // Create popup container
    const popup = document.createElement('div');
    popup.id = 'language-popup';
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.backgroundColor = '#212121';
    popup.style.padding = '20px';
    popup.style.borderRadius = '8px';
    popup.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    popup.style.zIndex = '9999';
    popup.style.width = '400px';
    popup.style.color = 'white';
    popup.style.fontFamily = 'Roboto, Arial, sans-serif';

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.color = 'white';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => {
        popup.remove();
        overlay.remove();
    };
    popup.appendChild(closeButton);

    // Create heading
    const heading = document.createElement('h2');
    heading.textContent = 'Choose which language you want this video to be translated to:';
    heading.style.fontSize = '16px';
    heading.style.marginBottom = '20px';
    heading.style.fontWeight = 'normal';
    popup.appendChild(heading);

    // Create language options
    const languages = ['Hindi', 'Spanish', 'Japanese', 'German'];
    const optionsContainer = document.createElement('div');
    optionsContainer.style.display = 'flex';
    optionsContainer.style.flexDirection = 'column';
    optionsContainer.style.gap = '12px';
    optionsContainer.style.marginBottom = '20px';

    let selectedLanguage = null;

    languages.forEach(lang => {
        const option = document.createElement('label');
        option.style.display = 'flex';
        option.style.alignItems = 'center';
        option.style.cursor = 'pointer';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'language';
        radio.value = lang;
        radio.style.marginRight = '10px';
        radio.style.cursor = 'pointer';
        radio.onclick = () => { selectedLanguage = lang; };

        const text = document.createTextNode(lang);
        text.parentElement = option;
        option.style.fontSize = '16px';

        option.appendChild(radio);
        option.appendChild(text);
        optionsContainer.appendChild(option);
    });

    popup.appendChild(optionsContainer);

    // Create submit button
    const submitButton = document.createElement('button');
    submitButton.textContent = 'Submit';
    submitButton.style.backgroundColor = '#3ea6ff';
    submitButton.style.color = 'black';
    submitButton.style.border = 'none';
    submitButton.style.borderRadius = '18px';
    submitButton.style.padding = '8px 16px';
    submitButton.style.cursor = 'pointer';
    submitButton.style.float = 'right';
    submitButton.style.fontWeight = 'bold';
    submitButton.onclick = () => {
        if (selectedLanguage) {
            // Get the YouTube video ID from the URL
            const url = window.location.href;
            const videoId = url.includes('youtube.com/watch?v=') ? 
                url.split('v=')[1].split('&')[0] : 
                url.includes('youtu.be/') ? 
                    url.split('youtu.be/')[1].split('?')[0] : '';
            
            if (videoId) {
                // Send request to localhost:5000
                fetch('http://127.0.0.1:5000/translate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        videoId: videoId,
                        language: selectedLanguage
                    })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Success:', data);
                    // You can handle the response here
                    startPolling(videoId, selectedLanguage);
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error sending translation request');
                });
                
                console.log(`Translating video ${videoId} to ${selectedLanguage}`);
            } else {
                console.error('Could not extract video ID');
                alert('Could not identify the video');
            }
            
            popup.remove();
            overlay.remove();
        } else {
            alert('Please select a language');
        }
    };
    popup.appendChild(submitButton);

    // Add overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '9998';
    overlay.onclick = () => {
        overlay.remove();
        popup.remove();
    };

    // Add to document
    document.body.appendChild(overlay);
    document.body.appendChild(popup);
}

function startPolling(videoId, language) {
    const pollInterval = 5000; // 5 seconds
    const maxAttempts = 100;   // Maximum 100 tries (~8 minutes)
    let attempts = 0;

    const poll = setInterval(() => {
        attempts++;

        fetch(`http://127.0.0.1:5000/check_status?video_id=${videoId}&language=${language}`)
            .then(response => response.json())
            .then(data => {
                console.log('Polling status:', data.status);
                if (data.status === 'done') {
                    clearInterval(poll);
                    playTranslatedAudio(videoId, language);
                } else if (data.status === 'error') {
                    clearInterval(poll);
                    alert('Error processing translation.');
                } else if (attempts > maxAttempts) {
                    clearInterval(poll);
                    alert('Translation timed out.');
                }
            })
            .catch(error => {
                console.error('Polling error:', error);
                clearInterval(poll);
                alert('Error while polling translation status.');
            });
    }, pollInterval);
}

function playTranslatedAudio(videoId, language) {
    const audio = new Audio(`http://127.0.0.1:5000/get_audio?video_id=${videoId}&language=${language}`);
    audio.crossOrigin = "anonymous";

    // Mute the YouTube video
    const videoPlayer = document.querySelector('video');
    if (videoPlayer) {
        videoPlayer.muted = true;

        // Sync audio start
        audio.currentTime = videoPlayer.currentTime;
        audio.play();

        // Keep syncing audio every few seconds
        setInterval(() => {
            if (!videoPlayer.paused && !audio.paused) {
                const drift = Math.abs(audio.currentTime - videoPlayer.currentTime);
                if (drift > 0.5) { // if out of sync by more than 0.5 seconds
                    audio.currentTime = videoPlayer.currentTime;
                }
            }
        }, 2000);
    } else {
        alert('Could not find YouTube video player');
    }
}

// SPA behavior
const observer = new MutationObserver(() => {
    insertButton();
});
observer.observe(document.body, { childList: true, subtree: true });

insertButton();