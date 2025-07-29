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
    fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
    })
    .then(res => res.json())
    .then(data => {
        addMessage("Assistant", data.reply);
        speakText(data.reply, () => {
            toggleListening(); // Auto-resume listening
        });
        playTalkingAvatar(data.reply); // Call avatar generation
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
    alert("?? playTalkingAvatar called for: " + text); // Temporary popup
	console.log("?? Generating talking avatar for:", text);

    const response = await fetch("/generate-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
    });

    const data = await response.json();
    console.log("Avatar API Response:", data); 

    if (data.id) {
        const videoUrl = `https://studio.d-id.com/player/${data.id}`;
        document.getElementById("avatarFrame").src = videoUrl;
    } else {
        console.error("? D-ID error:", data);
    }
}
