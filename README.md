# Artcii v2 Professional

Artcii v2 Professional is a full-stack ASCII art platform for live webcam conversion, subject-only rendering, face-only mode, colorized output, image uploads, and gallery management.

## Features

- Live webcam ASCII rendering
- Subject-only and face-only modes
- MediaPipe segmentation for subject isolation
- Colored ASCII output with RGB span rendering
- Edge detection and sketch style modes
- Image upload and preview conversion
- Save ASCII art to a persistent SQLite gallery
- Export ASCII preview as PNG
- Fullscreen mode and keyboard shortcuts
- Professional dashboard UI with live stats

## Technologies Used

- HTML5, CSS3, Vanilla JavaScript
- Python 3.12
- Flask
- Flask-SocketIO
- OpenCV
- NumPy
- Eventlet
- Pillow
- MediaPipe

## Installation

1. Create a virtual environment:

   ```bash
   python -m venv venv
   ```

2. Activate the virtual environment:

   Windows (PowerShell):
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Run the app:

   ```bash
   python app.py
   ```

5. Open your browser at `http://127.0.0.1:5000`

## Folder Structure

```
Artcii/
│── app.py
│── config.py
│── database.py
│── database.db
│── requirements.txt
│── README.md
│── .gitignore
│── utils/
│   │── __init__.py
│   │── ascii_converter.py
│   │── image_processor.py
│── templates/
│   │── index.html
│   │── gallery.html
│── static/
│   │── css/
│   │   │── style.css
│   │── js/
│   │   │── app.js
```

## How It Works

1. Browser captures webcam frames or uploads an image.
2. Frames are converted into base64 and sent to the Flask backend.
3. Backend applies mode selection, edge/sketch filters, and optional MediaPipe segmentation.
4. ASCII characters are mapped from brightness and color values.
5. The generated ASCII result is streamed back and rendered in the browser.

## Routes

- `GET /` — Main dashboard
- `GET /gallery` — Saved artwork gallery
- `POST /upload-image` — Upload image conversion
- `POST /save-art` — Save current ASCII art to SQLite gallery
- `POST /delete-art` — Remove gallery artwork

## Future Scope

- Add user accounts and multi-user galleries
- Add deployment-ready Docker and cloud configuration
- Add more advanced filters and export formats
- Add optimized batch socket processing and throttling

## Screenshots

- Screenshot 1: Live webcam ASCII dashboard
- Screenshot 2: Subject isolation and color mode
- Screenshot 3: Gallery and export interface
