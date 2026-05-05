import io
import logging
import os
from datetime import datetime

import cv2
import numpy as np
from flask import Flask, jsonify, redirect, render_template, request, url_for
from flask_socketio import SocketIO, emit
from PIL import Image

from config import (
    ALLOWED_UPLOAD_EXTENSIONS,
    ASCII_CHARSETS,
    COLOR_MODES,
    DEFAULT_FRAME_WIDTH,
    RENDER_MODES,
    STYLE_MODES,
    SUPPORTED_DENSITY,
)
from database import delete_artwork, get_artworks, init_db, save_artwork
from utils.ascii_converter import frame_to_ascii, frame_to_colored_ascii
from utils.image_processor import (
    apply_edge_effect,
    apply_sketch_effect,
    convert_to_grayscale,
    decode_base64_image,
    resize_image,
)

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "replace-this-secret")

# Updated for Render deployment (removed async_mode="eventlet")
socketio = SocketIO(app, cors_allowed_origins="*")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)

init_db()


def is_allowed_file(filename: str) -> bool:
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_UPLOAD_EXTENSIONS
    )


def get_charset(data: dict) -> str:
    custom = data.get("customCharset", "")
    if custom and custom.strip():
        return custom.strip()

    density_key = data.get("density", "medium")
    return ASCII_CHARSETS.get(density_key, ASCII_CHARSETS["basic"])


def detect_face(image: np.ndarray):
    if image is None:
        return None

    gray = convert_to_grayscale(image)

    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=6,
        minSize=(80, 80),
    )

    if len(faces) == 0:
        return None

    x, y, w, h = max(faces, key=lambda rect: rect[2] * rect[3])

    pad = int(max(w, h) * 0.2)

    x1 = max(0, x - pad)
    y1 = max(0, y - pad)
    x2 = min(image.shape[1], x + w + pad)
    y2 = min(image.shape[0], y + h + pad)

    return image[y1:y2, x1:x2]


def build_artist_payload(
    image: np.ndarray,
    width: int,
    charset: str,
    style: str,
    color_mode: str,
) -> dict:
    if color_mode not in COLOR_MODES:
        color_mode = "monochrome"

    resized = resize_image(image, width)
    gray_image = convert_to_grayscale(resized)

    if style == "edge":
        gray_image = apply_edge_effect(resized)

    elif style == "sketch":
        gray_image = apply_sketch_effect(resized)

    if color_mode == "colored":
        ascii_text = frame_to_ascii(gray_image, charset)
        colored_html = frame_to_colored_ascii(
            resized,
            gray_image,
            charset,
        )

        return {
            "ascii": colored_html,
            "ascii_text": ascii_text,
            "html": True,
            "char_count": len(ascii_text),
        }

    text_art = frame_to_ascii(gray_image, charset)

    return {
        "ascii": text_art,
        "html": False,
        "char_count": len(text_art),
    }


def load_image_from_file(file_storage) -> np.ndarray:
    image = Image.open(file_storage.stream).convert("RGB")
    return cv2.cvtColor(np.asarray(image), cv2.COLOR_RGB2BGR)


def process_photo_data(image: np.ndarray, data: dict) -> dict:
    render_mode = data.get("renderMode", "full_frame")
    style_mode = data.get("styleMode", "normal")
    color_mode = data.get("colorMode", "monochrome")
    width = int(data.get("width", DEFAULT_FRAME_WIDTH))
    charset = get_charset(data)

    if render_mode == "face_only":
        face_image = detect_face(image)

        if face_image is not None:
            image = face_image

    return build_artist_payload(
        image=image,
        width=width,
        charset=charset,
        style=style_mode,
        color_mode=color_mode,
    )


@app.route("/")
def index():
    return render_template(
        "index.html",
        render_modes=RENDER_MODES,
        style_modes=STYLE_MODES,
        color_modes=COLOR_MODES,
        themes=SUPPORTED_DENSITY,
        densities=SUPPORTED_DENSITY,
    )


@app.route("/gallery")
def gallery():
    artworks = get_artworks()
    return render_template("gallery.html", artworks=artworks)


@app.route("/upload-image", methods=["POST"])
def upload_image():
    file = request.files.get("image")

    if file is None or file.filename == "":
        return jsonify({"error": "No image file provided."}), 400

    if not is_allowed_file(file.filename):
        return jsonify({"error": "Unsupported file type."}), 400

    try:
        image = load_image_from_file(file)
        payload = process_photo_data(image, request.form)

        return jsonify(payload)

    except Exception as exc:
        logger.exception("Upload image processing failed")
        return jsonify({"error": str(exc)}), 500


@app.route("/save-art", methods=["POST"])
def save_art():
    data = request.get_json(silent=True) or {}

    ascii_content = data.get("ascii_content", "")

    if not ascii_content.strip():
        return jsonify({"error": "No ASCII content to save."}), 400

    theme = data.get("theme", "default")
    mode = data.get("mode", "full_frame")
    style = data.get("style", "normal")
    color_mode = data.get("color_mode", "monochrome")
    charset = data.get("charset", "")

    save_artwork(
        ascii_content=ascii_content,
        theme=theme,
        mode=mode,
        style=style,
        color_mode=color_mode,
        charset=charset,
    )

    return jsonify({"success": True})


@app.route("/delete-art", methods=["POST"])
def delete_art():
    art_id = request.form.get("art_id")

    if not art_id:
        payload = request.get_json(silent=True)
        art_id = payload.get("art_id") if payload else None

    if not art_id:
        return redirect(url_for("gallery"))

    delete_artwork(art_id)

    return redirect(url_for("gallery"))


@socketio.on("connect")
def handle_connect():
    logger.info("Client connected")
    emit("status", {"message": "Connected to Artcii backend."})


@socketio.on("disconnect")
def handle_disconnect():
    logger.info("Client disconnected")


@socketio.on("process_frame")
def handle_process_frame(data):
    try:
        image_data = data.get("image")

        if not image_data:
            raise ValueError("Missing image data")

        image = decode_base64_image(image_data)

        payload = process_photo_data(image, data)

        emit("ascii_frame", payload)

    except Exception as exc:
        logger.exception("Error processing frame")
        emit("processing_error", {"error": str(exc)})


if __name__ == "__main__":
    socketio.run(
        app,
        host="127.0.0.1",
        port=5000,
        debug=True,
    )