# Artcii v2 Professional

Artcii is a real-time ASCII art generator that transforms live webcam input and uploaded images into ASCII art using image processing techniques.

It provides multiple rendering modes including Full Frame, Face Only, Edge, Sketch, and Colored ASCII output.

## Features

* Live webcam ASCII rendering
* Face-only mode
* Edge mode
* Sketch mode
* Colored ASCII rendering
* Image upload and preview conversion
* Save ASCII art as text file
* Export ASCII as PNG
* Fullscreen mode
* Artwork gallery using SQLite
* Responsive dashboard UI
* Real-time FPS tracking
* Keyboard shortcuts

## Technologies Used

### Frontend

* HTML5
* CSS3
* Vanilla JavaScript

### Backend

* Python 3
* Flask
* Flask-SocketIO
* OpenCV
* NumPy
* Eventlet
* Pillow

### Database

* SQLite

## Installation

### 1. Clone repository

```bash
git clone https://github.com/ghost-160/Artcii.git
cd Artcii
```

### 2. Create virtual environment

```bash
python -m venv venv
```

### 3. Activate virtual environment

Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

### 4. Install dependencies

```bash
pip install -r requirements.txt
```

### 5. Run the application

```bash
python app.py
```

### 6. Open in browser

```text
http://127.0.0.1:5000
```

## Project Structure

```text
Artcii/
│── app.py
│── config.py
│── database.py
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

1. Webcam captures live frames.
2. Frames are sent to backend using Socket.IO.
3. Backend processes the image using OpenCV.
4. Brightness values are mapped into ASCII characters.
5. ASCII output is returned to frontend.
6. Browser renders ASCII art in real time.

## Available Modes

### Render Modes

* Full Frame
* Face Only

### Style Modes

* Normal
* Edge
* Sketch

### Color Modes

* Monochrome
* Colored

## Routes

* `GET /` → Main dashboard
* `GET /gallery` → Saved artworks
* `POST /upload-image` → Upload image
* `POST /save-art` → Save artwork
* `POST /delete-art` → Delete artwork

## Keyboard Shortcuts

* `R` → Start
* `X` → Stop
* `S` → Save TXT
* `P` → Export PNG
* `F` → Fullscreen

## Future Improvements

* Video upload support
* ASCII video recording
* More visual themes
* Cloud deployment
* User authentication
* Public API support

## Author

Ghost
