import {
  FaceLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs";

const startPanel = document.getElementById("startPanel");
const startButton = document.getElementById("startButton");
const statusText = document.getElementById("statusText");
const mirrorStage = document.getElementById("mirrorStage");
const video = document.getElementById("cameraVideo");
const canvas = document.getElementById("filterCanvas");
const ctx = canvas.getContext("2d");
const exitButton = document.getElementById("exitButton");

const wasmPath = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm";
const modelPath = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let faceLandmarker = null;
let stream = null;
let lastVideoTime = -1;
let lastLandmarks = null;

startButton.addEventListener("click", startFaceAR);
exitButton.addEventListener("click", () => {
  stopCamera();
  window.location.href = "index.html?scene=mirrorRoom";
});

async function startFaceAR() {
  startButton.disabled = true;
  statusText.textContent = "Gezichtsherkenning wordt geladen...";

  try {
    await setupFaceLandmarker();
    statusText.textContent = "Camera wordt gestart...";

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

    startPanel.classList.add("is-hidden");
    mirrorStage.hidden = false;
    resizeCanvas();
    requestAnimationFrame(drawFilter);
  } catch {
    statusText.textContent = "AR kon niet starten. Open via GitHub Pages/HTTPS en geef camera-toegang.";
    startButton.disabled = false;
    stopCamera();
  }
}

async function setupFaceLandmarker() {
  if (faceLandmarker) return;

  const vision = await FilesetResolver.forVisionTasks(wasmPath);
  faceLandmarker = await createLandmarker(vision, "GPU").catch(() => createLandmarker(vision, "CPU"));
}

function createLandmarker(vision, delegate) {
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: modelPath,
      delegate
    },
    runningMode: "VIDEO",
    numFaces: 1
  });
}

function drawFilter(time) {
  if (mirrorStage.hidden) return;

  resizeCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMirrorVignette();

  const landmarks = getCurrentLandmarks();
  if (landmarks) drawFaceBlood(landmarks, time);

  requestAnimationFrame(drawFilter);
}

function getCurrentLandmarks() {
  if (!faceLandmarker || video.readyState < 2 || !video.videoWidth) return null;

  if (video.currentTime !== lastVideoTime) {
    const result = faceLandmarker.detectForVideo(video, performance.now());
    lastVideoTime = video.currentTime;
    lastLandmarks = result.faceLandmarks && result.faceLandmarks.length ? result.faceLandmarks[0] : null;
  }

  return lastLandmarks;
}

function drawFaceBlood(landmarks, time) {
  const p = (index) => projectLandmark(landmarks[index]);
  const forehead = p(10);
  const leftCheek = p(234);
  const rightCheek = p(454);
  const noseBridge = p(168);
  const noseTip = p(1);
  const chin = p(152);
  const leftBrow = p(105);
  const rightBrow = p(334);

  const faceWidth = Math.max(90, distance(leftCheek, rightCheek));
  const angle = Math.atan2(rightCheek.y - leftCheek.y, rightCheek.x - leftCheek.x);

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  drawSmear(leftCheek, faceWidth * 0.21, angle - 0.2, time);
  drawSmear(rightCheek, faceWidth * 0.2, angle + 0.2, time + 190);
  drawSmear(forehead, faceWidth * 0.18, angle, time + 360);
  drawSmear(chin, faceWidth * 0.12, angle, time + 520);

  drawScratch(leftBrow, rightBrow, faceWidth);
  drawNoseTrail(noseBridge, noseTip, faceWidth);
  drawDrips(leftCheek, faceWidth * 0.15, 4);
  drawDrips(rightCheek, faceWidth * 0.13, 3);
  drawDrips(forehead, faceWidth * 0.1, 3);

  ctx.restore();
}

function projectLandmark(point) {
  const fit = getVideoCoverFit();
  const rawX = fit.x + point.x * fit.width;
  const rawY = fit.y + point.y * fit.height;

  return {
    x: canvas.width - rawX,
    y: rawY
  };
}

function getVideoCoverFit() {
  const videoWidth = video.videoWidth || canvas.width;
  const videoHeight = video.videoHeight || canvas.height;
  const scale = Math.max(canvas.width / videoWidth, canvas.height / videoHeight);
  const width = videoWidth * scale;
  const height = videoHeight * scale;

  return {
    x: (canvas.width - width) / 2,
    y: (canvas.height - height) / 2,
    width,
    height
  };
}

function drawSmear(point, radius, angle, time) {
  const pulse = 1 + Math.sin(time / 240) * 0.025;

  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.rotate(angle);

  const gradient = ctx.createRadialGradient(0, 0, radius * 0.08, 0, 0, radius * pulse);
  gradient.addColorStop(0, "rgba(124, 3, 18, 0.9)");
  gradient.addColorStop(0.5, "rgba(86, 1, 11, 0.62)");
  gradient.addColorStop(1, "rgba(42, 0, 6, 0)");

  ctx.fillStyle = gradient;
  ctx.globalAlpha = 0.94;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.35, radius * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.58;
  ctx.fillStyle = "rgba(34, 0, 5, 0.6)";
  ctx.beginPath();
  ctx.ellipse(radius * 0.18, -radius * 0.05, radius * 0.42, radius * 0.18, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawScratch(from, to, faceWidth) {
  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(119, 3, 15, 0.82)";
  ctx.lineWidth = Math.max(3, faceWidth * 0.018);

  for (let i = 0; i < 3; i += 1) {
    const offset = (i - 1) * faceWidth * 0.045;
    ctx.beginPath();
    ctx.moveTo(from.x - faceWidth * 0.03, from.y + offset);
    ctx.bezierCurveTo(
      from.x + faceWidth * 0.18,
      from.y - faceWidth * 0.05 + offset,
      to.x - faceWidth * 0.18,
      to.y + faceWidth * 0.06 + offset,
      to.x + faceWidth * 0.03,
      to.y + offset
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawNoseTrail(from, to, faceWidth) {
  ctx.save();
  ctx.globalAlpha = 0.68;
  ctx.strokeStyle = "rgba(80, 1, 10, 0.72)";
  ctx.lineWidth = Math.max(3, faceWidth * 0.015);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x - faceWidth * 0.015, to.y + faceWidth * 0.18);
  ctx.stroke();
  ctx.restore();
}

function drawDrips(point, size, amount) {
  ctx.save();
  ctx.fillStyle = "rgba(97, 2, 13, 0.82)";
  ctx.strokeStyle = "rgba(49, 0, 7, 0.58)";
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.lineCap = "round";

  for (let i = 0; i < amount; i += 1) {
    const dx = point.x + (i - (amount - 1) / 2) * size * 0.46;
    const dy = point.y + size * 0.12;
    const length = size * (0.55 + i * 0.18);

    ctx.beginPath();
    ctx.moveTo(dx, dy);
    ctx.lineTo(dx + size * 0.05, dy + length);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(dx + size * 0.05, dy + length, size * 0.12, size * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
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

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
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
