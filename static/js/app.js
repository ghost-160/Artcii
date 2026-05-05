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

const ASCII_CHARSETS = {
    basic: "@%#*+=-:. ",
    detailed: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
    block: "█▓▒░ ",
    keyboard: "asdfghjklqwertyuiopzxcvbnm1234567890",
};

let captureInterval = null;
let stream = null;
let awaitingResponse = false;
let lastFrameTime = null;
let frameCount = 0;
let currentAsciiText = "";
let currentAsciiHtml = "";
let currentProcessingStart = null;

function setStatus(message, isError = false) {
    statusIndicator.textContent = message;
    statusIndicator.style.color = isError ? "#ff6b6b" : "var(--text-color)";
}

function updateModeDisplay() {
    modeDisplay.textContent = `${renderMode.options[renderMode.selectedIndex].text} / ${styleMode.options[styleMode.selectedIndex].text} / ${colorMode.options[colorMode.selectedIndex].text}`;
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
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
    }

    video.srcObject = null;
    toggleStreamingButtons(false);
    setStatus("Stopped");
}

function downloadAsciiText() {
    if (!currentAsciiText.trim()) {
        setStatus("No ASCII content available to save.", true);
        return;
    }

    const blob = new Blob([currentAsciiText], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "ascii_art.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportAsPng() {
    const outputArea = document.querySelector(".ascii-output-area");
    if (!outputArea) {
        setStatus("Output panel not found.", true);
        return;
    }

    html2canvas(outputArea, { backgroundColor: "#000000" }).then((canvasExport) => {
        const link = document.createElement("a");
        link.download = "artcii_output.png";
        link.href = canvasExport.toDataURL("image/png");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

function renderAscii(payload) {
    if (!payload) {
        return;
    }

    if (payload.html) {
        asciiOutput.innerHTML = payload.ascii;
        currentAsciiText = payload.ascii_text || asciiOutput.textContent;
        currentAsciiHtml = payload.ascii;
    } else {
        asciiOutput.textContent = payload.ascii;
        currentAsciiText = payload.ascii;
        currentAsciiHtml = "";
    }

    charCountDisplay.textContent = currentAsciiText.length;
    const elapsed = currentProcessingStart ? Math.max(0, performance.now() - currentProcessingStart) : 0;
    processTimeDisplay.textContent = Math.round(elapsed);
    calculateFPS();
}

function buildFramePayload(imageData) {
    return {
        image: imageData,
        renderMode: renderMode.value,
        styleMode: styleMode.value,
        colorMode: colorMode.value,
        width: parseInt(resolutionRange.value, 10),
        customCharset: customCharset.value.trim(),
        density: customCharset.value.trim() ? "custom" : "detailed",
    };
}

function sendFrame() {
    if (!video.videoWidth || !video.videoHeight || awaitingResponse) {
        return;
    }

    canvas.width = parseInt(resolutionRange.value, 10);
    canvas.height = Math.max(1, Math.floor((video.videoHeight / video.videoWidth) * canvas.width));
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL("image/png");
    awaitingResponse = true;
    currentProcessingStart = performance.now();
    socket.emit("process_frame", buildFramePayload(imageData));
}

function startStreaming() {
    navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "environment" }, audio: false })
        .then((mediaStream) => {
            stream = mediaStream;
            video.srcObject = stream;
            video.play();
            toggleStreamingButtons(true);
            setStatus("Streaming live webcam.");
            currentProcessingStart = performance.now();
            captureInterval = setInterval(sendFrame, 120);
        })
        .catch((error) => {
            setStatus("Webcam access denied or unavailable.", true);
            console.error("Webcam error", error);
        });
}

function calculateFPS() {
    const now = performance.now();
    frameCount += 1;
    const elapsed = now - lastFrameTime;
    if (elapsed >= 1000) {
        const fps = Math.round((frameCount * 1000) / elapsed);
        fpsDisplay.textContent = fps;
        frameCount = 0;
        lastFrameTime = now;
    }
}

function handleUpload() {
    const file = uploadInput.files[0];
    if (!file) {
        setStatus("Select an image file first.", true);
        return;
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("renderMode", renderMode.value);
    formData.append("styleMode", styleMode.value);
    formData.append("colorMode", colorMode.value);
    formData.append("width", resolutionRange.value);
    formData.append("customCharset", customCharset.value.trim());

    setStatus("Uploading image and converting to ASCII...");
    fetch("/upload-image", {
        method: "POST",
        body: formData,
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.error) {
                setStatus(data.error, true);
                return;
            }
            renderAscii(data);
            if (file) {
                uploadPreview.src = URL.createObjectURL(file);
                uploadPreviewCard.classList.remove("hidden");
            }
            setStatus("Upload converted successfully.");
        })
        .catch((error) => {
            setStatus("Image upload failed.", true);
            console.error(error);
        });
}

function saveToGallery() {
    if (!currentAsciiText.trim()) {
        setStatus("Nothing to save to gallery.", true);
        return;
    }

    const payload = {
        ascii_content: currentAsciiText,
        theme: colorMode.value,
        mode: renderMode.value,
        style: styleMode.value,
        color_mode: colorMode.value,
        charset: customCharset.value.trim() || resolutionRange.value,
    };

    fetch("/save-art", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    })
        .then((res) => res.json())
        .then((data) => {
            if (data.error) {
                setStatus(data.error, true);
                return;
            }
            setStatus("Saved artwork to gallery.");
        })
        .catch((error) => {
            setStatus("Save to gallery failed.", true);
            console.error(error);
        });
}

function toggleFullscreen() {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
        elem.requestFullscreen?.();
    } else {
        document.exitFullscreen?.();
    }
}

socket.on("connect", () => {
    setStatus("Connected to server.");
});

socket.on("disconnect", () => {
    setStatus("Socket disconnected.", true);
});

socket.on("ascii_frame", (payload) => {
    renderAscii(payload);
    awaitingResponse = false;
});

socket.on("processing_error", (payload) => {
    setStatus(payload?.error || "Backend processing error.", true);
    awaitingResponse = false;
});

startBtn.addEventListener("click", () => {
    setStatus("Requesting webcam access...");
    startStreaming();
});

stopBtn.addEventListener("click", () => {
    stopStreaming();
});

uploadBtn.addEventListener("click", (event) => {
    event.preventDefault();
    handleUpload();
});

saveTxtBtn.addEventListener("click", () => {
    downloadAsciiText();
});

saveGalleryBtn.addEventListener("click", () => {
    saveToGallery();
});

exportPngBtn.addEventListener("click", () => {
    exportAsPng();
});

fullscreenBtn.addEventListener("click", () => {
    toggleFullscreen();
});

resolutionRange.addEventListener("input", (event) => {
    updateResolutionLabel(event.target.value);
});

renderMode.addEventListener("change", updateModeDisplay);
styleMode.addEventListener("change", updateModeDisplay);
colorMode.addEventListener("change", updateModeDisplay);
customCharset.addEventListener("input", updateModeDisplay);

window.addEventListener("keydown", (event) => {
    if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
        return;
    }

    if (event.key.toLowerCase() === "r") {
        startStreaming();
    }
    if (event.key.toLowerCase() === "x") {
        stopStreaming();
    }
    if (event.key.toLowerCase() === "s") {
        downloadAsciiText();
    }
    if (event.key.toLowerCase() === "p") {
        exportAsPng();
    }
    if (event.key.toLowerCase() === "f") {
        toggleFullscreen();
    }
});

window.addEventListener("beforeunload", () => {
    stopStreaming();
});

lastFrameTime = performance.now();
updateResolutionLabel(resolutionRange.value);
updateModeDisplay();
