let recognizing = false;
let recognition;
let avatarAnimation;

/** --- Setup avatar animation if you keep Lottie block in HTML (optional) --- **/
window.addEventListener("DOMContentLoaded", () => {
  if (window.lottie && document.getElementById("lottieAvatar")) {
    avatarAnimation = lottie.loadAnimation({
      container: document.getElementById("lottieAvatar"),
      renderer: "svg",
      loop: true,
      autoplay: false,
      path: "https://assets10.lottiefiles.com/packages/lf20_ktwnwv5m.json"
    });
  }
});

function initRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    console.warn("Web Speech API not supported in this browser.");
    return;
  }

  recognition = new SR();
  recognition.lang = "en-US";
  recognition.continuous = false;      // one utterance at a time (more reliable)
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    addMessage("You", transcript);
    sendToAssistant(transcript);
  };

  recognition.onend = () => {
    recognizing = false;
    // If auto-listen is enabled and we didn't explicitly press Stop,
    // we will restart *after* Ava finishes speaking (handled in speakText).
    // So do nothing here.
  };

  recognition.onerror = (e) => {
    console.error("SpeechRecognition error:", e.error);
    recognizing = false;
    // If mic got blocked or network error, don’t loop.
  };
}

/** Controls **/
function startListening() {
  // Barge-in: if Ava is speaking, stop TTS first
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }
  if (recognition && !recognizing) {
    try {
      recognition.start();
      recognizing = true;
    } catch (e) {
      // Some browsers throw if start() is called too quickly
      console.warn("recognition.start() failed:", e);
    }
  }
}

function stopListening() {
  // Fully stop: no listening and cancel any speaking
  if (recognition && recognizing) {
    recognition.stop();
    recognizing = false;
  }
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }
}

function speakText(text, afterSpeak) {
  const imgAvatar = document.getElementById("assistantAvatar");
  // Cancel any ongoing speech so we don't overlap
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";

  utterance.onstart = () => {
    if (avatarAnimation) avatarAnimation.play();
    if (imgAvatar) imgAvatar.classList.add("speaking");
  };

  const cleanup = () => {
    if (avatarAnimation) avatarAnimation.stop();
    if (imgAvatar) imgAvatar.classList.remove("speaking");
  };

  utterance.onend = () => {
    cleanup();
    if (typeof afterSpeak === "function") afterSpeak();
  };

  utterance.onerror = () => {
    cleanup();
    if (typeof afterSpeak === "function") afterSpeak();
  };

  window.speechSynthesis.speak(utterance);
}

function sendToAssistant(text) {
  fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })
    .then((res) => res.json())
    .then((data) => {
      const reply = data.reply || "";
      addMessage("Assistant", reply);

      // After Ava speaks, auto-restart listening if toggle is ON
      speakText(reply, () => {
        const auto = document.getElementById("autoListenToggle");
        if (auto && auto.checked) {
          // small delay so TTS fully releases audio focus on some browsers
          setTimeout(() => startListening(), 200);
        }
      });
    })
    .catch((err) => {
      console.error("Error in sendToAssistant:", err);
    });
}

function addMessage(sender, text) {
  const chatBox = document.getElementById("chatBox");
  const msg = document.createElement("p");
  msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
}
