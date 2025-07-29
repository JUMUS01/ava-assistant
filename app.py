from flask import Flask, request, jsonify, session, render_template
from flask_cors import CORS
from openai import OpenAI
import os
import requests

app = Flask(__name__)
CORS(app)
app.secret_key = os.getenv("FLASK_SECRET_KEY")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    user_input = request.json["text"]

    if "conversation" not in session:
        session["conversation"] = [
            {"role": "system", "content": "You are a helpful travel assistant. Help the user book flights and answer travel questions."}
        ]

    session["conversation"].append({"role": "user", "content": user_input})

    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=session["conversation"],
        temperature=0.7
    )

    assistant_reply = response.choices[0].message.content
    session["conversation"].append({"role": "assistant", "content": assistant_reply})

    return jsonify({"reply": assistant_reply})

D_ID_API_KEY = os.getenv("D_ID_API_KEY")

@app.route("/generate-avatar", methods=["POST"])
def generate_avatar():
    try:
        data = request.json
        reply_text = data.get("text")

        payload = {
            "script": {
                "type": "text",
                "input": reply_text,
                "provider": {
                    "type": "google",
                    "voice_id": "en-US-Wavenet-F"
                }
            },
            "source_url": "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.jpeg"
        }

        headers = {
            "Authorization": f"Bearer {D_ID_API_KEY}",
            "Content-Type": "application/json"
        }
		        print("DEBUG D_ID_API_KEY:", D_ID_API_KEY)  # ? Check if key is loaded

        res = requests.post("https://api.d-id.com/talks", json=payload, headers=headers)

        print("DEBUG D-ID Full Response:", res.text)  # ? Correct indentation (4 spaces)

        return jsonify(res.json())


    except Exception as e:
        print("❌ Flask error:", e)  # ✅ Print the Python error
        return jsonify({"error": str(e)}), 500
	
	

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)


