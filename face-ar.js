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
  const upperForehead = p(151);
  const leftCheek = p(234);
  const rightCheek = p(454);
  const noseBridge = p(168);
  const noseTip = p(1);
  const chin = p(152);
  const leftBrow = p(70);
  const rightBrow = p(300);
  const leftJaw = p(172);
  const rightJaw = p(397);

  const faceWidth = Math.max(90, distance(leftCheek, rightCheek));
  const angle = Math.atan2(rightCheek.y - leftCheek.y, rightCheek.x - leftCheek.x);

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  drawForeheadBlood(leftBrow, rightBrow, forehead, upperForehead, faceWidth, angle, time);
  drawClawMarks(leftCheek, leftJaw, faceWidth * 0.5, angle - 0.8, time + 110);
  drawClawMarks(rightCheek, rightJaw, faceWidth * 0.48, angle + 0.8, time + 250);
  drawWetPatch(leftCheek, faceWidth * 0.22, angle - 0.22, time + 390);
  drawWetPatch(rightCheek, faceWidth * 0.2, angle + 0.18, time + 560);
  drawCenterDrip(noseBridge, noseTip, chin, faceWidth, time + 720);
  drawFaceSplatters(forehead, leftCheek, rightCheek, faceWidth, time);

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

function drawForeheadBlood(left, right, forehead, upperForehead, faceWidth, angle, time) {
  const center = midpoint(left, right);
  const width = distance(left, right) * 1.28;
  const radius = faceWidth * 0.14;

  drawGlossyStroke(
    {
      x: center.x,
      y: center.y - faceWidth * 0.12
    },
    width,
    radius,
    angle,
    time,
    0.92
  );

  drawWetPatch(forehead, faceWidth * 0.18, angle, time + 140);
  drawHangingDrips(
    {
      x: upperForehead.x,
      y: upperForehead.y + faceWidth * 0.08
    },
    faceWidth * 0.13,
    5
  );
}

function drawClawMarks(center, lowerPoint, length, angle, time) {
  const baseAngle = angle + Math.PI * 0.08;
  const spacing = length * 0.18;
  const normal = {
    x: Math.cos(baseAngle + Math.PI / 2),
    y: Math.sin(baseAngle + Math.PI / 2)
  };

  for (let i = 0; i < 3; i += 1) {
    const offset = (i - 1) * spacing;
    const start = {
      x: center.x + normal.x * offset - Math.cos(baseAngle) * length * 0.38,
      y: center.y + normal.y * offset - Math.sin(baseAngle) * length * 0.38
    };
    const end = {
      x: lowerPoint.x + normal.x * offset * 0.35 + Math.cos(baseAngle) * length * 0.2,
      y: lowerPoint.y + normal.y * offset * 0.35 + Math.sin(baseAngle) * length * 0.2
    };

    drawRaisedCut(start, end, length * 0.055, time + i * 160);
  }
}

function drawWetPatch(point, radius, angle, time) {
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

function drawGlossyStroke(center, width, radius, angle, time, alpha) {
  const pulse = 1 + Math.sin(time / 280) * 0.025;

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;

  const body = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
  body.addColorStop(0, "rgba(93, 1, 12, 0)");
  body.addColorStop(0.18, "rgba(127, 5, 17, 0.82)");
  body.addColorStop(0.48, "rgba(62, 0, 8, 0.92)");
  body.addColorStop(0.72, "rgba(149, 14, 23, 0.72)");
  body.addColorStop(1, "rgba(93, 1, 12, 0)");

  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, width * 0.5, radius * pulse, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = alpha * 0.38;
  ctx.strokeStyle = "rgba(255, 218, 203, 0.55)";
  ctx.lineWidth = Math.max(2, radius * 0.12);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-width * 0.18, -radius * 0.34);
  ctx.bezierCurveTo(-width * 0.04, -radius * 0.62, width * 0.2, -radius * 0.5, width * 0.35, -radius * 0.18);
  ctx.stroke();

  ctx.restore();
}

function drawRaisedCut(start, end, thickness, time) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const length = distance(start, end);
  const mid = midpoint(start, end);

  ctx.save();
  ctx.translate(mid.x, mid.y);
  ctx.rotate(angle);
  ctx.lineCap = "round";

  ctx.globalAlpha = 0.48;
  ctx.strokeStyle = "rgba(18, 0, 3, 0.62)";
  ctx.lineWidth = thickness * 2.7;
  ctx.beginPath();
  ctx.moveTo(-length * 0.5, thickness * 0.42);
  ctx.lineTo(length * 0.5, thickness * 0.42);
  ctx.stroke();

  const gradient = ctx.createLinearGradient(0, -thickness * 1.2, 0, thickness * 1.2);
  gradient.addColorStop(0, "rgba(202, 45, 39, 0.45)");
  gradient.addColorStop(0.42, "rgba(138, 6, 18, 0.96)");
  gradient.addColorStop(0.8, "rgba(53, 0, 8, 0.96)");
  gradient.addColorStop(1, "rgba(28, 0, 5, 0.4)");

  ctx.globalAlpha = 0.96;
  ctx.strokeStyle = gradient;
  ctx.lineWidth = thickness * (2.1 + Math.sin(time / 240) * 0.04);
  ctx.beginPath();
  ctx.moveTo(-length * 0.5, 0);
  ctx.bezierCurveTo(-length * 0.18, -thickness * 0.7, length * 0.18, thickness * 0.7, length * 0.5, 0);
  ctx.stroke();

  ctx.globalAlpha = 0.64;
  ctx.strokeStyle = "rgba(255, 205, 190, 0.62)";
  ctx.lineWidth = Math.max(1.5, thickness * 0.38);
  ctx.beginPath();
  ctx.moveTo(-length * 0.36, -thickness * 0.58);
  ctx.lineTo(length * 0.28, -thickness * 0.4);
  ctx.stroke();

  ctx.restore();
}

function drawCenterDrip(bridge, nose, chin, faceWidth, time) {
  const start = {
    x: bridge.x,
    y: bridge.y + faceWidth * 0.05
  };
  const end = {
    x: midpoint(nose, chin).x,
    y: midpoint(nose, chin).y + faceWidth * 0.16
  };
  const length = distance(start, end);

  ctx.save();
  ctx.globalAlpha = 0.88;
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(56, 0, 8, 0.72)";
  ctx.lineWidth = Math.max(5, faceWidth * 0.045);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.bezierCurveTo(start.x + faceWidth * 0.05, start.y + length * 0.25, end.x - faceWidth * 0.03, end.y - length * 0.28, end.x, end.y);
  ctx.stroke();

  ctx.strokeStyle = "rgba(143, 8, 20, 0.88)";
  ctx.lineWidth = Math.max(3, faceWidth * 0.028);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.bezierCurveTo(start.x + faceWidth * 0.035, start.y + length * 0.25, end.x - faceWidth * 0.02, end.y - length * 0.28, end.x, end.y);
  ctx.stroke();

  drawDroplet(end, faceWidth * 0.06, time);
  ctx.restore();
}

function drawHangingDrips(point, size, amount) {
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

function drawDroplet(point, radius, time) {
  const gradient = ctx.createRadialGradient(
    point.x - radius * 0.3,
    point.y - radius * 0.35,
    radius * 0.1,
    point.x,
    point.y,
    radius * 1.2
  );
  gradient.addColorStop(0, "rgba(255, 165, 140, 0.62)");
  gradient.addColorStop(0.22, "rgba(154, 12, 22, 0.98)");
  gradient.addColorStop(1, "rgba(42, 0, 6, 0.94)");

  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(point.x, point.y + Math.sin(time / 260) * 1.4, radius * 0.78, radius * 1.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFaceSplatters(forehead, leftCheek, rightCheek, faceWidth, time) {
  const anchors = [forehead, leftCheek, rightCheek];
  ctx.save();
  ctx.globalAlpha = 0.78;

  anchors.forEach((anchor, anchorIndex) => {
    for (let i = 0; i < 10; i += 1) {
      const seed = anchorIndex * 97 + i * 31;
      const orbit = seed + time * 0.00002;
      const radius = faceWidth * (0.008 + ((seed % 7) / 7) * 0.026);
      const x = anchor.x + Math.cos(orbit) * faceWidth * (0.13 + (seed % 5) * 0.025);
      const y = anchor.y + Math.sin(seed * 0.7) * faceWidth * 0.15;

      drawDroplet({ x, y }, radius, time + seed);
    }
  });

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

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  };
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
