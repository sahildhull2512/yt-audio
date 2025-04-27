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
            alert('Translate button clicked!');
        });

        // Insert into the action bar
        actionBar.appendChild(button);
    }
}

// SPA behavior
const observer = new MutationObserver(() => {
    insertButton();
});
observer.observe(document.body, { childList: true, subtree: true });

insertButton();