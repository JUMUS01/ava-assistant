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
            // Auto-resume listening after response finishes
            toggleListening();
        });
		playTalkingAvatar(data.reply); // ← Add this line
    });
}

function addMessage(sender, text) {
    const chatBox = document.getElementById("chatBox");
    const msg = document.createElement("p");
    msg.innerHTML = `<strong>${sender}:</strong> ${text}`;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}

const D_ID_API_KEY = "bXVzaWFsX2p1bGllbkB5YWhvby5mcg:tvS2n_7t6fxYbz0zXd4EU"; // paste your actual API key here
const AVATAR_IMAGE_URL = "https://i.ibb.co/yYzvxFK/avatar-base.png"; // or your own hosted image

async function playTalkingAvatar(text) {
  console.log("🧠 Calling playTalkingAvatar with text:", text);

  const response = await fetch("/generate-avatar", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${D_ID_API_KEY}`,
	  "Content-Type": "application/json"
    },
    body: JSON.stringify({ text })
  });

  const data = await response.json();
  console.log("🎥 Backend /generate-avatar response:", data);

  if (data.id) {
    const videoUrl = `https://studio.d-id.com/player/${data.id}`;
    document.getElementById("avatarFrame").src = videoUrl;
  } else {
    console.error("D-ID backend error:", data);
  }
}

