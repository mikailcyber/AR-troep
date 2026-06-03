const startPanel = document.getElementById("startPanel");
const startButton = document.getElementById("startButton");
const statusText = document.getElementById("statusText");
const mirrorStage = document.getElementById("mirrorStage");
const video = document.getElementById("cameraVideo");
const canvas = document.getElementById("filterCanvas");
const ctx = canvas.getContext("2d");
const exitButton = document.getElementById("exitButton");

let detector = null;
let stream = null;
let fallbackTime = 0;

startButton.addEventListener("click", startFaceAR);
exitButton.addEventListener("click", () => {
  stopCamera();
  window.location.href = "index.html?scene=mirrorRoom";
});

async function startFaceAR() {
  startButton.disabled = true;
  statusText.textContent = "Camera wordt gestart...";

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    video.srcObject = stream;
    await video.play();
    await setupFaceDetector();

    startPanel.classList.add("is-hidden");
    mirrorStage.hidden = false;
    resizeCanvas();
    requestAnimationFrame(drawFilter);
  } catch {
    statusText.textContent = "Camera kon niet starten. Gebruik HTTPS, localhost of GitHub Pages en geef camera-toegang.";
    startButton.disabled = false;
  }
}

async function setupFaceDetector() {
  if (!("FaceDetector" in window)) return;

  try {
    detector = new FaceDetector({
      fastMode: true,
      maxDetectedFaces: 1
    });
  } catch {
    detector = null;
  }
}

async function drawFilter(time) {
  if (mirrorStage.hidden) return;

  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMirrorVignette();

  const face = await getFaceBox();
  drawBloodFilter(face, time);

  requestAnimationFrame(drawFilter);
}

async function getFaceBox() {
  if (detector) {
    try {
      const faces = await detector.detect(video);
      if (faces.length) return mirrorFaceBox(faces[0].boundingBox);
    } catch {
      detector = null;
    }
  }

  return getFallbackFaceBox();
}

function mirrorFaceBox(box) {
  const scaleX = canvas.width / video.videoWidth;
  const scaleY = canvas.height / video.videoHeight;
  const width = box.width * scaleX;
  const height = box.height * scaleY;

  return {
    x: canvas.width - (box.x * scaleX) - width,
    y: box.y * scaleY,
    width,
    height
  };
}

function getFallbackFaceBox() {
  const size = Math.min(canvas.width, canvas.height) * 0.42;
  fallbackTime += 0.018;

  return {
    x: canvas.width / 2 - size / 2,
    y: canvas.height * 0.28 + Math.sin(fallbackTime) * 4,
    width: size,
    height: size * 1.18
  };
}

function drawBloodFilter(face, time) {
  const cx = face.x + face.width / 2;
  const cy = face.y + face.height / 2;
  const s = face.width;

  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 0.9;

  drawSmear(cx - s * 0.2, cy - s * 0.12, s * 0.34, time);
  drawSmear(cx + s * 0.16, cy + s * 0.08, s * 0.3, time + 320);
  drawDrips(cx - s * 0.28, cy - s * 0.02, s * 0.18);
  drawDrips(cx + s * 0.22, cy + s * 0.13, s * 0.14);

  ctx.globalAlpha = 0.7;
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(112, 3, 14, 0.82)";
  ctx.lineWidth = Math.max(3, s * 0.025);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.36, cy - s * 0.28);
  ctx.bezierCurveTo(cx - s * 0.14, cy - s * 0.18, cx + s * 0.08, cy - s * 0.26, cx + s * 0.34, cy - s * 0.12);
  ctx.stroke();

  ctx.restore();
}

function drawSmear(x, y, radius, time) {
  const pulse = 1 + Math.sin(time / 260) * 0.03;
  const gradient = ctx.createRadialGradient(x, y, radius * 0.08, x, y, radius * pulse);
  gradient.addColorStop(0, "rgba(117, 3, 16, 0.86)");
  gradient.addColorStop(0.55, "rgba(83, 1, 10, 0.58)");
  gradient.addColorStop(1, "rgba(61, 0, 8, 0)");

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(x, y, radius * 1.15, radius * 0.58, -0.32, 0, Math.PI * 2);
  ctx.fill();
}

function drawDrips(x, y, size) {
  ctx.fillStyle = "rgba(95, 2, 13, 0.8)";
  ctx.strokeStyle = "rgba(55, 0, 7, 0.5)";
  ctx.lineWidth = Math.max(2, size * 0.08);

  for (let i = 0; i < 4; i += 1) {
    const dx = x + (i - 1.5) * size * 0.45;
    const length = size * (0.55 + i * 0.2);
    ctx.beginPath();
    ctx.moveTo(dx, y);
    ctx.lineTo(dx + size * 0.04, y + length);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(dx + size * 0.04, y + length, size * 0.12, size * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMirrorVignette() {
  const gradient = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    Math.min(canvas.width, canvas.height) * 0.24,
    canvas.width / 2,
    canvas.height / 2,
    Math.max(canvas.width, canvas.height) * 0.72
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, "rgba(11, 11, 16, 0.46)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function resizeCanvas() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (canvas.width === width && canvas.height === height) return;

  canvas.width = width;
  canvas.height = height;
}

function stopCamera() {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
  stream = null;
}

window.addEventListener("resize", resizeCanvas);
