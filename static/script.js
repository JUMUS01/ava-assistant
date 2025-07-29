let recognizing = false;
let recognition;

function initRecognition() {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.continuous = false;

    recognition.onresult = function (event) {
        const transcript = event.results[0][0].transcript;
        addMessage("You", transcript);
        sendToAssistant(transcript);
    };

    recognition.onend = function () {
        recognizing = false;
    };
}

function toggleListening() {
    if (!recognizing) {
        recognition.start();
        recognizing = true;
    } else {
        recognition.stop();
    }
}

function speakText(text, callback) {
    const avatar = document.getElementById("avatarContainer");
    avatar.classList.add("speaking");

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";

    utterance.onend = () => {
        avatar.classList.remove("speaking");
        if (callback) callback();
    };

    utterance.onerror = () => {
        avatar.classList.remove("speaking");
    };

    window.speechSynthesis.speak(utterance);
}

function sendToAssistant(text) {
    console.log("?? Sending text to backend:", text);

    fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
    })
    .then(res => res.json())
    .then(data => {
        console.log("? Assistant reply:", data);

        addMessage("Assistant", data.reply);
        speakText(data.reply, () => {
            toggleListening(); // Auto-resume listening
        });

        console.log("?? Calling playTalkingAvatar with:", data.reply);
        playTalkingAvatar(data.reply); // Call avatar generation
    })
    .catch(err => {
        console.error("? Error in sendToAssistant:", err);
    });
}


function addMessage(sender, text) {
    const chatBox = document.getElementById("chatBox");
    const msg = document.createElement("p");
    msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function playTalkingAvatar(text) {
    console.log("?? Sending text to backend for avatar:", text);

    try {
        const response = await fetch("/generate-avatar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text })
        });

        const data = await response.json();
        console.log("?? Avatar API Response:", data);

        if (data.id) {
            const videoUrl = `https://studio.d-id.com/player/${data.id}`;
            document.getElementById("avatarFrame").src = videoUrl;
        } else {
            console.error("? Avatar error:", data);

            // Show error on the page
            const chatBox = document.getElementById("chatBox");
            const msg = document.createElement("p");
            msg.innerHTML = `<strong>?? Error:</strong> ${data.error || "Unknown error"}`;
            chatBox.appendChild(msg);
        }
    } catch (err) {
        console.error("? Fetch failed:", err);

        const chatBox = document.getElementById("chatBox");
        const msg = document.createElement("p");
        msg.innerHTML = `<strong>?? Fetch Error:</strong> ${err}`;
        chatBox.appendChild(msg);
    }
}

