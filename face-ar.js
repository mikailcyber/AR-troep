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
  const centerForehead = p(151);
  const leftTemple = p(127);
  const rightTemple = p(356);
  const leftCheek = p(234);
  const rightCheek = p(454);
  const leftMidCheek = p(132);
  const rightMidCheek = p(361);
  const chin = p(152);
  const lowerLip = p(17);
  const leftBrow = p(70);
  const rightBrow = p(300);
  const leftJaw = p(172);
  const rightJaw = p(397);

  const faceWidth = Math.max(90, distance(leftCheek, rightCheek));
  const angle = Math.atan2(rightCheek.y - leftCheek.y, rightCheek.x - leftCheek.x);

  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  drawSnapchatForeheadSmears(leftBrow, rightBrow, leftTemple, rightTemple, centerForehead, forehead, faceWidth, angle, time);
  drawSnapchatCheekSmears(leftCheek, leftMidCheek, leftJaw, faceWidth, angle - 0.18, -1, time + 170);
  drawSnapchatCheekSmears(rightCheek, rightMidCheek, rightJaw, faceWidth, angle + 0.18, 1, time + 340);
  drawSoftBloodCloud(midpoint(lowerLip, chin), faceWidth * 0.2, faceWidth * 0.09, angle, 0.42, time + 520);
  drawFineFaceScratches(leftCheek, leftJaw, faceWidth, angle - 0.25, time + 690);
  drawFineFaceScratches(rightCheek, rightJaw, faceWidth, angle + 0.25, time + 850);
  drawSubtleEdgeSplatters([leftTemple, rightTemple, leftCheek, rightCheek], faceWidth, time);

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

function drawSnapchatForeheadSmears(leftBrow, rightBrow, leftTemple, rightTemple, centerForehead, forehead, faceWidth, angle, time) {
  const leftForehead = midpoint(leftTemple, leftBrow);
  const rightForehead = midpoint(rightTemple, rightBrow);

  drawSoftBloodCloud(leftForehead, faceWidth * 0.2, faceWidth * 0.085, angle - 0.12, 0.45, time);
  drawSoftBloodCloud(rightForehead, faceWidth * 0.2, faceWidth * 0.085, angle + 0.12, 0.45, time + 120);
  drawSoftBloodCloud(centerForehead, faceWidth * 0.18, faceWidth * 0.065, angle, 0.28, time + 240);

  drawDustyStreak(
    {
      x: leftForehead.x - faceWidth * 0.04,
      y: forehead.y + faceWidth * 0.06
    },
    {
      x: rightForehead.x + faceWidth * 0.04,
      y: forehead.y + faceWidth * 0.08
    },
    faceWidth * 0.026,
    0.32
  );
}

function drawSnapchatCheekSmears(edgeCheek, midCheek, jaw, faceWidth, angle, side, time) {
  const upper = {
    x: edgeCheek.x + side * faceWidth * 0.02,
    y: edgeCheek.y - faceWidth * 0.08
  };
  const middle = midpoint(edgeCheek, midCheek);
  const lower = midpoint(edgeCheek, jaw);

  drawSoftBloodCloud(upper, faceWidth * 0.22, faceWidth * 0.095, angle + side * 0.22, 0.42, time);
  drawSoftBloodCloud(middle, faceWidth * 0.27, faceWidth * 0.105, angle + side * 0.1, 0.5, time + 120);
  drawSoftBloodCloud(lower, faceWidth * 0.2, faceWidth * 0.085, angle - side * 0.08, 0.38, time + 240);

  for (let i = 0; i < 4; i += 1) {
    const yOffset = (i - 1.5) * faceWidth * 0.055;
    drawDustyStreak(
      {
        x: edgeCheek.x - side * faceWidth * 0.03,
        y: edgeCheek.y + yOffset
      },
      {
        x: midCheek.x + side * faceWidth * 0.12,
        y: midCheek.y + yOffset + faceWidth * 0.025
      },
      faceWidth * (0.013 + i * 0.002),
      0.2
    );
  }
}

function drawSoftBloodCloud(center, width, height, angle, alpha, time) {
  const pulse = 1 + Math.sin(time / 360) * 0.018;

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;

  const haze = ctx.createRadialGradient(0, 0, height * 0.1, 0, 0, width * 0.65 * pulse);
  haze.addColorStop(0, "rgba(118, 9, 15, 0.68)");
  haze.addColorStop(0.46, "rgba(128, 26, 22, 0.32)");
  haze.addColorStop(1, "rgba(85, 0, 9, 0)");

  ctx.fillStyle = haze;
  ctx.beginPath();
  ctx.ellipse(0, 0, width, height, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = alpha * 0.55;
  ctx.fillStyle = "rgba(58, 0, 8, 0.5)";
  ctx.beginPath();
  ctx.ellipse(width * 0.05, -height * 0.08, width * 0.34, height * 0.28, -0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = alpha * 0.18;
  ctx.strokeStyle = "rgba(245, 167, 150, 0.75)";
  ctx.lineWidth = Math.max(1.4, height * 0.06);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-width * 0.28, -height * 0.2);
  ctx.bezierCurveTo(-width * 0.04, -height * 0.42, width * 0.18, -height * 0.22, width * 0.35, -height * 0.08);
  ctx.stroke();

  ctx.restore();
}

function drawDustyStreak(from, to, thickness, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(91, 2, 11, 0.76)";
  ctx.lineWidth = Math.max(2, thickness);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.bezierCurveTo(
    from.x + (to.x - from.x) * 0.25,
    from.y - thickness * 2.2,
    from.x + (to.x - from.x) * 0.68,
    to.y + thickness * 1.6,
    to.x,
    to.y
  );
  ctx.stroke();

  ctx.globalAlpha = alpha * 0.34;
  ctx.strokeStyle = "rgba(180, 54, 45, 0.55)";
  ctx.lineWidth = Math.max(1.2, thickness * 0.42);
  ctx.beginPath();
  ctx.moveTo(from.x + thickness * 1.4, from.y - thickness * 0.8);
  ctx.lineTo(to.x - thickness * 1.8, to.y - thickness * 0.2);
  ctx.stroke();
  ctx.restore();
}

function drawFineFaceScratches(cheek, jaw, faceWidth, angle, time) {
  const length = faceWidth * 0.32;
  const normal = {
    x: Math.cos(angle + Math.PI / 2),
    y: Math.sin(angle + Math.PI / 2)
  };
  const center = midpoint(cheek, jaw);

  for (let i = 0; i < 5; i += 1) {
    const offset = (i - 2) * faceWidth * 0.032;
    const start = {
      x: center.x + normal.x * offset - Math.cos(angle) * length * 0.42,
      y: center.y + normal.y * offset - Math.sin(angle) * length * 0.42
    };
    const end = {
      x: center.x + normal.x * offset + Math.cos(angle) * length * 0.42,
      y: center.y + normal.y * offset + Math.sin(angle) * length * 0.42
    };

    drawDustyStreak(start, end, faceWidth * (0.008 + (i % 2) * 0.003), 0.22 + Math.sin(time / 500 + i) * 0.03);
  }
}

function drawSubtleEdgeSplatters(points, faceWidth, time) {
  ctx.save();
  ctx.globalAlpha = 0.4;

  points.forEach((point, pointIndex) => {
    for (let i = 0; i < 7; i += 1) {
      const seed = pointIndex * 61 + i * 19;
      const x = point.x + Math.cos(seed) * faceWidth * (0.09 + (seed % 4) * 0.018);
      const y = point.y + Math.sin(seed * 0.7) * faceWidth * 0.13;
      const radius = faceWidth * (0.005 + (seed % 5) * 0.002);

      drawFlatSpeck({ x, y }, radius, time + seed);
    }
  });

  ctx.restore();
}

function drawFlatSpeck(point, radius, time) {
  ctx.save();
  ctx.globalAlpha = 0.45 + Math.sin(time / 700) * 0.04;
  ctx.fillStyle = "rgba(92, 2, 10, 0.72)";
  ctx.beginPath();
  ctx.ellipse(point.x, point.y, radius * 1.45, radius, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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
