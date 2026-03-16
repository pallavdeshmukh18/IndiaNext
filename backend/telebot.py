import base64
import os
from pathlib import Path

import requests
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    ApplicationBuilder,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

BASE_DIR = Path(__file__).resolve().parent


def load_local_env():
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


load_local_env()

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEBOT_API_URL = os.getenv("TELEBOT_API_URL", "http://localhost:8001/analyze")

SERVICE_MENU = {
    "1": ("email_phishing", "Email Phishing", "Email Shield"),
    "2": ("url_phishing", "URL Phishing", "URL Scan"),
    "3": ("ai_content", "AI Generated Content", "AI Content"),
    "4": ("anomaly", "Anomaly Detection", "Anomaly Watch"),
    "5": ("deepfake_voice", "Deepfake Voice", "Voice Deepfake"),
    "6": ("deepfake_image", "Deepfake Image", "Image Deepfake"),
    "7": ("prompt_injection", "Prompt Injection", "Prompt Guard"),
}

SERVICE_PROMPTS = {
    "email_phishing": "Paste the email content you want to scan.",
    "url_phishing": "Paste the URL you want to scan.",
    "ai_content": "Paste the content you want checked for AI-generated deception.",
    "anomaly": "Paste logs, suspicious activity text, or login-event details.",
    "deepfake_voice": "Send an audio file or voice note for deepfake analysis.",
    "deepfake_image": "Send an image for deepfake analysis.",
    "prompt_injection": "Paste the suspicious prompt or AI interaction text.",
}

MEDIA_SERVICES = {"deepfake_voice", "deepfake_image"}
SERVICE_BY_KEY = {value[0]: {"label": value[1], "button": value[2]} for value in SERVICE_MENU.values()}


def build_main_menu():
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("Email Shield", callback_data="service:1"),
                InlineKeyboardButton("URL Scan", callback_data="service:2"),
            ],
            [
                InlineKeyboardButton("AI Content", callback_data="service:3"),
                InlineKeyboardButton("Anomaly Watch", callback_data="service:4"),
            ],
            [
                InlineKeyboardButton("Voice Deepfake", callback_data="service:5"),
                InlineKeyboardButton("Image Deepfake", callback_data="service:6"),
            ],
            [InlineKeyboardButton("Prompt Guard", callback_data="service:7")],
        ]
    )


def build_result_actions():
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("Run Another Scan", callback_data="menu"),
                InlineKeyboardButton("Keep Current Mode", callback_data="stay"),
            ]
        ]
    )


def remember_service(context: ContextTypes.DEFAULT_TYPE, service: str):
    context.user_data["service"] = service
    context.user_data["last_service"] = service


def clear_active_service(context: ContextTypes.DEFAULT_TYPE):
    last_service = context.user_data.get("last_service")
    context.user_data.clear()
    if last_service:
        context.user_data["last_service"] = last_service


def menu_text():
    return (
        "Welcome to Krypton Sentinel\n\n"
        "Your AI security assistant for spotting phishing, fake links, prompt attacks, anomalies, and deepfakes in seconds.\n\n"
        "Choose a detection service to begin:"
    )


def format_result(result: dict):
    service_name = result.get("serviceLabel") or SERVICE_BY_KEY.get(
        result.get("service"), {}
    ).get("label", result.get("service", "unknown"))
    recommendation = result.get("recommendation")
    source = result.get("source")
    model = result.get("model")

    lines = [
        f"Scan Type: {service_name}\n"
        f"Threat Type: {result.get('threatType', 'None')}\n"
        f"Risk Score: {result.get('riskScore', 0)}%\n"
        f"Risk Level: {result.get('riskLevel', 'LOW')}\n"
        f"Suspicious: {'Yes' if result.get('isSuspicious') else 'No'}\n"
        f"Confidence: {round(float(result.get('confidence', 0)) * 100, 1)}%\n\n"
        f"Explanation:\n{result.get('explanation', 'No explanation returned.')}"
    ]

    if source:
        lines.append(f"\nSource: {source}")

    if model:
        lines.append(f"Model: {model}")

    if recommendation:
        lines.append(f"\nRecommendation:\n{recommendation}")

    return "\n".join(lines)


async def send_menu_message(target, context: ContextTypes.DEFAULT_TYPE):
    context.user_data.clear()
    await target.reply_text(menu_text(), reply_markup=build_main_menu())


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await send_menu_message(update.message, context)


async def menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message:
        await send_menu_message(update.message, context)
        return

    query = update.callback_query
    if query:
        context.user_data.clear()
        await query.answer()
        await query.message.reply_text(menu_text(), reply_markup=build_main_menu())


async def select_service(update: Update, context: ContextTypes.DEFAULT_TYPE, selection: str):
    service = SERVICE_MENU.get(selection)
    if not service:
        if update.message:
            await update.message.reply_text("Choose a valid option from the menu.", reply_markup=build_main_menu())
        return

    service_key, service_label, _ = service
    remember_service(context, service_key)

    target_message = update.callback_query.message if update.callback_query else update.message
    await target_message.reply_text(
        f"{service_label} selected.\n\n{SERVICE_PROMPTS[service_key]}",
        reply_markup=InlineKeyboardMarkup(
            [[InlineKeyboardButton("Back To Menu", callback_data="menu")]]
        ),
    )


async def call_bot_api(payload: dict):
    response = requests.post(TELEBOT_API_URL, json=payload, timeout=120)
    response.raise_for_status()
    return response.json()


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    if not query:
        return

    await query.answer()
    data = query.data or ""

    try:
        await query.edit_message_reply_markup(reply_markup=None)
    except Exception:
        pass

    if data == "menu":
        await menu(update, context)
        return

    if data == "stay":
        service = context.user_data.get("service") or context.user_data.get("last_service")
        if service:
            remember_service(context, service)
            await query.message.reply_text(
                f"Current mode: {SERVICE_BY_KEY[service]['label']}\n\n{SERVICE_PROMPTS[service]}",
                reply_markup=InlineKeyboardMarkup(
                    [[InlineKeyboardButton("Back To Menu", callback_data="menu")]]
                ),
            )
        else:
            await query.message.reply_text(menu_text(), reply_markup=build_main_menu())
        return

    if data.startswith("service:"):
        await select_service(update, context, data.split(":", 1)[1])


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (update.message.text or "").strip()

    if text.lower() in {"/start", "/menu", "menu", "start", "home", "restart"}:
        await menu(update, context)
        return

    if text in SERVICE_MENU:
        await select_service(update, context, text)
        return

    service = context.user_data.get("service")
    if not service:
        await update.message.reply_text("Choose a scan type first.", reply_markup=build_main_menu())
        return

    if service in MEDIA_SERVICES:
        await update.message.reply_text(
            SERVICE_PROMPTS[service],
            reply_markup=InlineKeyboardMarkup(
                [[InlineKeyboardButton("Back To Menu", callback_data="menu")]]
            ),
        )
        return

    try:
        result = await call_bot_api({"service": service, "text": text})
        await update.message.reply_text(format_result(result), reply_markup=build_result_actions())
        clear_active_service(context)
    except requests.RequestException as exc:
        await update.message.reply_text(
            f"Scan failed: {exc}",
            reply_markup=build_main_menu(),
        )


async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    service = context.user_data.get("service")
    if service != "deepfake_image":
        await update.message.reply_text("Select Deepfake Image first, then send a photo.", reply_markup=build_main_menu())
        return

    photo = update.message.photo[-1]
    file = await photo.get_file()
    data = await file.download_as_bytearray()
    encoded = base64.b64encode(data).decode("utf-8")

    try:
        result = await call_bot_api({"service": service, "image_base64": encoded})
        await update.message.reply_text(format_result(result), reply_markup=build_result_actions())
        clear_active_service(context)
    except requests.RequestException as exc:
        await update.message.reply_text(f"Scan failed: {exc}", reply_markup=build_main_menu())


async def handle_audio(update: Update, context: ContextTypes.DEFAULT_TYPE):
    service = context.user_data.get("service")
    if service != "deepfake_voice":
        await update.message.reply_text("Select Deepfake Voice first, then send an audio file or voice note.", reply_markup=build_main_menu())
        return

    media = update.message.voice or update.message.audio or (update.message.document if update.message.document else None)
    if not media:
        await update.message.reply_text("Please send an audio file or voice note.", reply_markup=build_main_menu())
        return

    file = await media.get_file()
    data = await file.download_as_bytearray()
    encoded = base64.b64encode(data).decode("utf-8")

    try:
        result = await call_bot_api({"service": service, "audio_base64": encoded})
        await update.message.reply_text(format_result(result), reply_markup=build_result_actions())
        clear_active_service(context)
    except requests.RequestException as exc:
        await update.message.reply_text(f"Scan failed: {exc}", reply_markup=build_main_menu())


async def handle_document(update: Update, context: ContextTypes.DEFAULT_TYPE):
    service = context.user_data.get("service")
    document = update.message.document

    if not document or service not in MEDIA_SERVICES:
        await update.message.reply_text("Choose a scan type first from the menu.", reply_markup=build_main_menu())
        return

    mime_type = (document.mime_type or "").lower()

    if service == "deepfake_image" and not mime_type.startswith("image/"):
        await update.message.reply_text("Please upload an image file for Deepfake Image analysis.", reply_markup=build_main_menu())
        return

    if service == "deepfake_voice" and not mime_type.startswith("audio/"):
        await update.message.reply_text("Please upload an audio file for Deepfake Voice analysis.", reply_markup=build_main_menu())
        return

    file = await document.get_file()
    data = await file.download_as_bytearray()
    encoded = base64.b64encode(data).decode("utf-8")

    payload = {"service": service}
    if service == "deepfake_image":
        payload["image_base64"] = encoded
    else:
        payload["audio_base64"] = encoded

    try:
        result = await call_bot_api(payload)
        await update.message.reply_text(format_result(result), reply_markup=build_result_actions())
        clear_active_service(context)
    except requests.RequestException as exc:
        await update.message.reply_text(f"Scan failed: {exc}", reply_markup=build_main_menu())


def main():
    if not BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set.")

    app = ApplicationBuilder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("menu", menu))
    app.add_handler(CallbackQueryHandler(handle_callback))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    app.add_handler(MessageHandler(filters.VOICE | filters.AUDIO, handle_audio))
    app.add_handler(MessageHandler(filters.Document.ALL, handle_document))

    app.run_polling()


if __name__ == "__main__":
    main()
