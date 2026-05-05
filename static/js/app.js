const socket = io();

const video = document.getElementById("videoElement");
const canvas = document.getElementById("captureCanvas");
const asciiOutput = document.getElementById("asciiOutput");

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const uploadInput = document.getElementById("imageUpload");
const uploadBtn = document.getElementById("uploadBtn");
const saveTxtBtn = document.getElementById("saveTxtBtn");
const saveGalleryBtn = document.getElementById("saveGalleryBtn");
const exportPngBtn = document.getElementById("exportPngBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");

const resolutionRange = document.getElementById("resolutionRange");
const resolutionValue = document.getElementById("resolutionValue");

const renderMode = document.getElementById("renderMode");
const styleMode = document.getElementById("styleMode");
const colorMode = document.getElementById("colorMode");
const customCharset = document.getElementById("customCharset");

const statusIndicator = document.getElementById("statusIndicator");
const fpsDisplay = document.getElementById("fpsDisplay");
const resolutionDisplay = document.getElementById("resolutionDisplay");
const processTimeDisplay = document.getElementById("processTimeDisplay");
const charCountDisplay = document.getElementById("charCountDisplay");
const modeDisplay = document.getElementById("modeDisplay");

const uploadPreviewCard = document.getElementById("uploadPreviewCard");
const uploadPreview = document.getElementById("uploadPreview");

let captureInterval = null;
let stream = null;
let awaitingResponse = false;
let lastFrameTime = performance.now();
let frameCount = 0;
let currentAsciiText = "";
let currentProcessingStart = null;


function setStatus(message, isError = false) {
    statusIndicator.textContent = message;
    statusIndicator.style.color = isError ? "#ff6b6b" : "var(--text-color)";
}

function updateModeDisplay() {
    modeDisplay.textContent =
        `${renderMode.options[renderMode.selectedIndex].text} / ` +
        `${styleMode.options[styleMode.selectedIndex].text} / ` +
        `${colorMode.options[colorMode.selectedIndex].text}`;
}

function updateResolutionLabel(value) {
    resolutionValue.textContent = value;
    resolutionDisplay.textContent = value;
}

function toggleStreamingButtons(isStreaming) {
    startBtn.disabled = isStreaming;
    stopBtn.disabled = !isStreaming;
}

function stopStreaming() {
    if (captureInterval) {
        clearInterval(captureInterval);
        captureInterval = null;
    }

    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }

    video.srcObject = null;

    toggleStreamingButtons(false);

    setStatus("Stopped");
}

function downloadAsciiText() {
    if (!currentAsciiText.trim()) {
        setStatus("No ASCII content available.", true);
        return;
    }

    const blob = new Blob([currentAsciiText], {
        type: "text/plain;charset=utf-8"
    });

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = "ascii_art.txt";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function renderAscii(payload) {
    if (!payload) return;

    if (payload.html) {
        asciiOutput.innerHTML = payload.ascii;
        currentAsciiText = payload.ascii_text || asciiOutput.textContent;
    } else {
        asciiOutput.textContent = payload.ascii;
        currentAsciiText = payload.ascii;
    }

    charCountDisplay.textContent = currentAsciiText.length;

    const elapsed = currentProcessingStart
        ? Math.max(0, performance.now() - currentProcessingStart)
        : 0;

    processTimeDisplay.textContent = Math.round(elapsed);

    calculateFPS();
}

function buildFramePayload(imageData) {
    return {
        image: imageData,
        renderMode: renderMode.value,
        styleMode: styleMode.value,
        colorMode: colorMode.value,
        width: parseInt(resolutionRange.value),
        customCharset: customCharset.value.trim(),
        density: customCharset.value.trim() ? "custom" : "basic"
    };
}

function sendFrame() {
    if (!video.videoWidth || !video.videoHeight || awaitingResponse) return;

    canvas.width = parseInt(resolutionRange.value);
    canvas.height = Math.floor(
        (video.videoHeight / video.videoWidth) * canvas.width
    );

    const ctx = canvas.getContext("2d");

    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    const imageData = canvas.toDataURL("image/jpeg", 0.75);

    awaitingResponse = true;
    currentProcessingStart = performance.now();

    socket.emit("process_frame", buildFramePayload(imageData));
}

function startStreaming() {
    navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
    })
    .then(mediaStream => {
        stream = mediaStream;
        video.srcObject = stream;
        video.play();

        toggleStreamingButtons(true);

        setStatus("Streaming live webcam.");

        captureInterval = setInterval(sendFrame, 180);
    })
    .catch(error => {
        setStatus("Webcam unavailable.", true);
        console.error(error);
    });
}

function calculateFPS() {
    const now = performance.now();

    frameCount++;

    const elapsed = now - lastFrameTime;

    if (elapsed >= 1000) {
        fpsDisplay.textContent = Math.round(
            (frameCount * 1000) / elapsed
        );

        frameCount = 0;
        lastFrameTime = now;
    }
}

function handleUpload() {
    const file = uploadInput.files[0];

    if (!file) {
        setStatus("Select image first.", true);
        return;
    }

    const formData = new FormData();

    formData.append("image", file);
    formData.append("renderMode", renderMode.value);
    formData.append("styleMode", styleMode.value);
    formData.append("colorMode", colorMode.value);
    formData.append("width", resolutionRange.value);
    formData.append("customCharset", customCharset.value.trim());

    fetch("/upload-image", {
        method: "POST",
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            setStatus(data.error, true);
            return;
        }

        renderAscii(data);

        uploadPreview.src = URL.createObjectURL(file);
        uploadPreviewCard.classList.remove("hidden");

        setStatus("Upload converted.");
    });
}

function saveToGallery() {
    if (!currentAsciiText.trim()) {
        setStatus("Nothing to save.", true);
        return;
    }

    fetch("/save-art", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            ascii_content: currentAsciiText,
            theme: "matrix",
            mode: renderMode.value,
            style: styleMode.value,
            color_mode: colorMode.value,
            charset: customCharset.value.trim()
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            setStatus(data.error, true);
            return;
        }

        setStatus("Saved to gallery.");
    });
}

socket.on("connect", () => {
    setStatus("Connected.");
});

socket.on("ascii_frame", payload => {
    renderAscii(payload);
    awaitingResponse = false;
});

socket.on("processing_error", payload => {
    setStatus(payload.error, true);
    awaitingResponse = false;
});

startBtn.addEventListener("click", startStreaming);
stopBtn.addEventListener("click", stopStreaming);

uploadBtn.addEventListener("click", e => {
    e.preventDefault();
    handleUpload();
});

saveTxtBtn.addEventListener("click", downloadAsciiText);
saveGalleryBtn.addEventListener("click", saveToGallery);

resolutionRange.addEventListener("input", e => {
    updateResolutionLabel(e.target.value);
});

updateResolutionLabel(resolutionRange.value);
updateModeDisplay();