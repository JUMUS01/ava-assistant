let recognizing = false;
let recognition;

// Load Lottie animation for avatar
let avatarAnimation;

window.addEventListener("DOMContentLoaded", () => {
    avatarAnimation = lottie.loadAnimation({
        container: document.getElementById("lottieAvatar"),
        renderer: "svg",
        loop: true,
        autoplay: false,
        path: "https://assets10.lottiefiles.com/packages/lf20_ktwnwv5m.json" // Free avatar
    });
});

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

// ? NEW FUNCTIONS
function startListening() {
    if (!recognizing) {
        recognition.start();
        recognizing = true;
    }
}

function stopListening() {
    if (recognizing) {
        recognition.stop();
        recognizing = false;
    }
}

function speakText(text, callback) {
    const avatar = document.getElementById("assistantAvatar") || document.getElementById("lottieAvatar");
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";

    utterance.onstart = () => {
        if (avatarAnimation) avatarAnimation.play();
        if (avatar) avatar.classList.add("speaking");
    };

    utterance.onend = () => {
        if (avatarAnimation) avatarAnimation.stop();
        if (avatar) avatar.classList.remove("speaking");
        if (callback) callback();
    };

    utterance.onerror = () => {
        if (avatarAnimation) avatarAnimation.stop();
        if (avatar) avatar.classList.remove("speaking");
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
            console.log("?? Assistant reply:", data);

            addMessage("Assistant", data.reply);
            speakText(data.reply, () => {
                // Auto-stop listening after Ava finishes speaking
                stopListening();
            });
        })
        .catch(err => {
            console.error("?? Error in sendToAssistant:", err);
        });
}

function addMessage(sender, text) {
    const chatBox = document.getElementById("chatBox");
    const msg = document.createElement("p");
    msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}
