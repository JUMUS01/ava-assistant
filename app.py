from flask import Flask, request, jsonify, session, render_template
from flask_cors import CORS
from flask_session import Session   # ⬅️ add this
from openai import OpenAI
import os, requests                  # ⬅️ make sure requests is imported
from datetime import timedelta       # ⬅️ for session lifetime


app = Flask(__name__)
CORS(app)

# 🔐 Sessions stored server-side (filesystem)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret")
app.config["SESSION_TYPE"] = "filesystem"
app.config["SESSION_PERMANENT"] = False
app.permanent_session_lifetime = timedelta(hours=6)
Session(app)  # ⬅️ initialize Flask-Session

# OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


from datetime import timedelta

# (Put these near your app config)
app.config["SESSION_TYPE"] = "filesystem"   # server-side sessions
app.config["SESSION_PERMANENT"] = False
app.permanent_session_lifetime = timedelta(hours=6)

SYSTEM_PROMPT = (
    "You are Ava, a helpful, efficient personal + travel assistant. "
    "Keep answers concise, remember user details within the session (names, dates, preferences). "
    "If something is ambiguous, ask a short clarifying question. "
    "When provided with 'web context', use it but do not hallucinate."
)

def ensure_conversation():
    """Create conversation array with a system prompt if missing."""
    if "conversation" not in session:
        session["conversation"] = [{"role": "system", "content": SYSTEM_PROMPT}]

def trim_conversation(max_messages=14):
    """Keep the system prompt + last N messages to stay within token limits."""
    convo = session["conversation"]
    head = convo[:1]             # keep first (system) message
    tail = convo[1:][-max_messages:]
    session["conversation"] = head + tail

def looks_like_research(text: str) -> bool:
    t = text.lower()
    triggers = ["search", "look up", "find info", "latest", "news", "price of", "what is", "who is", "check online"]
    return any(k in t for k in triggers)

def web_snippet(query: str) -> str:
    """Best-effort tiny web context using DuckDuckGo Instant Answer."""
    try:
        r = requests.get(
            "https://api.duckduckgo.com/",
            params={"q": query, "format": "json", "no_html": 1, "skip_disambig": 1},
            timeout=8
        )
        j = r.json()
        bits = []
        if j.get("AbstractText"):
            bits.append(j["AbstractText"])
        for rt in j.get("RelatedTopics", [])[:2]:
            if isinstance(rt, dict) and rt.get("Text"):
                bits.append(rt["Text"])
        return " ".join(bits)[:800]
    except Exception:
        return ""


@app.route("/health")
def health():
    # Bump this version string whenever you deploy to confirm the right code is live
    return {"status": "ok", "version": "ava-ctx-v3"}

@app.route("/debug-session")
def debug_session():
    convo = session.get("conversation", [])
    return {
        "messages_in_session": len(convo),
        "has_system_prompt": bool(convo and convo[0].get("role") == "system"),
        "preview_last_3": [m.get("role","?")+": "+m.get("content","")[:80] for m in convo[-3:]]
    }



@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    user_input = request.json.get("text", "").strip()
    ensure_conversation()

    # Add user message
    session["conversation"].append({"role": "user", "content": user_input})

    # Lightweight research if the user asks to “search / latest / news …”
    if looks_like_research(user_input):
        snippet = web_snippet(user_input)
        if snippet:
            session["conversation"].append({
                "role": "system",
                "content": f"Web context:\n{snippet}"
            })

    # Keep the context bounded
    trim_conversation()

    # Model call (low temp for consistency)
    resp = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=session["conversation"],
        temperature=0.3
    )
    reply = resp.choices[0].message.content
    session["conversation"].append({"role": "assistant", "content": reply})

    return jsonify({"reply": reply})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
