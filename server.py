import os
import uuid
import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify
import requests

BOT_TOKEN = "8643172698:AAFlLKjA-uRrS2iawjWifCGz5H_JYlS-mcM"
CHAT_ID = "966735372"

DB_PATH = "orders.db"
RECEIPTS_DIR = "receipts"
TELEGRAM_API = f"https://api.telegram.org/bot{BOT_TOKEN}"

app = Flask(__name__)

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = db()
    cur = conn.cursor()
    cur.execute("""
      CREATE TABLE IF NOT EXISTS orders(
        id TEXT PRIMARY KEY,
        created_at TEXT,
        ticket TEXT,
        price INTEGER,
        name TEXT,
        phone TEXT,
        status TEXT,
        tg_chat_id TEXT,
        tg_message_id INTEGER
      )
    """)
    conn.commit()
    conn.close()

def get_order(order_id):
    conn = db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM orders WHERE id=?", (order_id,))
    row = cur.fetchone()
    conn.close()
    return row

def set_status(order_id, status):
    conn = db()
    cur = conn.cursor()
    cur.execute("UPDATE orders SET status=? WHERE id=?", (status, order_id))
    conn.commit()
    conn.close()

@app.get("/")
def home():
    return "OK"

@app.post("/api/receipt")
def api_receipt():
    ticket = request.form.get("ticket", "—")
    price = int(request.form.get("price", "0") or 0)
    name = request.form.get("name", "—").strip()
    phone = request.form.get("phone", "—").strip()
    file = request.files.get("receipt")

    if not file:
        return jsonify({"ok": False, "error": "no receipt"}), 400

    os.makedirs(RECEIPTS_DIR, exist_ok=True)

    order_id = uuid.uuid4().hex[:10]
    ext = os.path.splitext(file.filename or "")[1].lower() or ".jpg"
    filepath = os.path.join(RECEIPTS_DIR, f"{order_id}{ext}")
    file.save(filepath)

    created_at = datetime.utcnow().isoformat()

    conn = db()
    cur = conn.cursor()
    cur.execute("""
      INSERT INTO orders(id, created_at, ticket, price, name, phone, status, tg_chat_id, tg_message_id)
      VALUES(?,?,?,?,?,?,?,?,?)
    """, (order_id, created_at, ticket, price, name, phone, "pending", None, None))
    conn.commit()
    conn.close()

    caption = (
        "🧾 НОВА ОПЛАТА\n\n"
        f"🎟 Квиток: {ticket}\n"
        f"💰 Сума: {price} грн\n"
        f"👤 Ім'я: {name}\n"
        f"📱 Телефон: +380 {phone}\n\n"
        f"ID: {order_id}"
    )

    keyboard = {
        "inline_keyboard": [[
            {"text": "✅ Прийняти", "callback_data": f"ok:{order_id}"},
            {"text": "❌ Відхилити", "callback_data": f"no:{order_id}"}
        ]]
    }

    with open(filepath, "rb") as f:
        files = {"photo": f}
        data = {
            "chat_id": CHAT_ID,
            "caption": caption,
            "reply_markup": str(keyboard).replace("'", '"')
        }
        r = requests.post(f"{TELEGRAM_API}/sendPhoto", data=data, files=files)

    tg = r.json()
    if not tg.get("ok"):
        return jsonify({"ok": False, "error": tg}), 500

    msg = tg["result"]
    tg_chat_id = str(msg["chat"]["id"])
    tg_message_id = msg["message_id"]

    conn = db()
    cur = conn.cursor()
    cur.execute("UPDATE orders SET tg_chat_id=?, tg_message_id=? WHERE id=?",
                (tg_chat_id, tg_message_id, order_id))
    conn.commit()
    conn.close()

    return jsonify({"ok": True, "order_id": order_id})

@app.get("/api/status/<order_id>")
def api_status(order_id):
    row = get_order(order_id)
    if not row:
        return jsonify({"ok": False, "error": "not_found"}), 404
    return jsonify({"ok": True, "status": row["status"]})

@app.post("/telegram/webhook")
def telegram_webhook():
    update = request.get_json(silent=True) or {}

    if "callback_query" in update:
        cq = update["callback_query"]
        data = cq.get("data", "")
        callback_id = cq.get("id")
        message = cq.get("message", {})
        chat_id = message.get("chat", {}).get("id")
        message_id = message.get("message_id")

        if ":" in data:
            action, order_id = data.split(":", 1)
            row = get_order(order_id)

            if row:
                if action == "ok":
                    set_status(order_id, "accepted")
                    new_caption = (
                        "✅ ОПЛАТУ ПРИЙНЯТО\n\n"
                        f"🎟 Квиток: {row['ticket']}\n"
                        f"💰 Сума: {row['price']} грн\n"
                        f"👤 Ім'я: {row['name']}\n"
                        f"📱 Телефон: +380 {row['phone']}\n\n"
                        f"ID: {order_id}"
                    )
                    answer_text = "Оплату прийнято"
                else:
                    set_status(order_id, "rejected")
                    new_caption = (
                        "❌ ОПЛАТУ ВІДХИЛЕНО\n\n"
                        f"🎟 Квиток: {row['ticket']}\n"
                        f"💰 Сума: {row['price']} грн\n"
                        f"👤 Ім'я: {row['name']}\n"
                        f"📱 Телефон: +380 {row['phone']}\n\n"
                        f"ID: {order_id}"
                    )
                    answer_text = "Оплату відхилено"

                requests.post(f"{TELEGRAM_API}/answerCallbackQuery", json={
                    "callback_query_id": callback_id,
                    "text": answer_text
                })

                requests.post(f"{TELEGRAM_API}/editMessageCaption", json={
                    "chat_id": chat_id,
                    "message_id": message_id,
                    "caption": new_caption
                })

    return jsonify({"ok": True})

if __name__ == "__main__":
    init_db()
    os.makedirs(RECEIPTS_DIR, exist_ok=True)
    app.run(host="0.0.0.0", port=5050, debug=True)