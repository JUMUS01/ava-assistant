from flask import Flask, request, jsonify, session, render_template
from flask_cors import CORS
from openai import OpenAI
import os

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

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
