const startPanel = document.getElementById("startPanel");
const startButton = document.getElementById("startButton");
const statusText = document.getElementById("statusText");
const scanNote = document.getElementById("scanNote");
const exitButton = document.getElementById("exitButton");
const sceneMount = document.getElementById("sceneMount");
const zoomControls = document.getElementById("zoomControls");
const zoomInButton = document.getElementById("zoomInButton");
const zoomOutButton = document.getElementById("zoomOutButton");
const zoomLabel = document.getElementById("zoomLabel");

const targetImagePath = "assets/ar/book-scan-marker.png";
const overlayImagePath = "assets/ar/book-inside-transparent.png";
const precompiledTargetPath = "assets/ar/book-target.mind";

let objectUrl = null;
let bookPlane = null;
let bookZoom = 1.5;
let pinchStartDistance = null;
let pinchStartZoom = bookZoom;

if (!new URLSearchParams(window.location.search).has("scanner")) {
  window.location.replace("index.html");
}

exitButton.addEventListener("click", () => {
  window.location.href = "index.html?scene=basementLight";
});

startButton.addEventListener("click", async () => {
  startButton.disabled = true;
  statusText.textContent = "Boek wordt voorbereid...";

  try {
    const targetUrl = await getMindTargetUrl();
    statusText.textContent = "Camera wordt geopend...";
    createARScene(targetUrl);
  } catch (error) {
    statusText.textContent = "AR kon niet starten. Open dit via localhost of GitHub Pages en geef camera-toegang.";
    startButton.disabled = false;
    console.error(error);
  }
});

async function getMindTargetUrl() {
  if (await hasPrecompiledTarget()) return precompiledTargetPath;

  const { Compiler } = await import("https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js");
  const targetImage = await loadImage(targetImagePath);
  const compiler = new Compiler();

  await compiler.compileImageTargets([targetImage], (progress) => {
    const percentage = Math.max(1, Math.round(progress));
    statusText.textContent = `Boek wordt voorbereid... ${percentage}%`;
  });

  const exportedTarget = compiler.exportData();
  objectUrl = URL.createObjectURL(new Blob([exportedTarget], { type: "application/octet-stream" }));
  return objectUrl;
}

async function hasPrecompiledTarget() {
  try {
    const response = await fetch(precompiledTargetPath, { method: "HEAD" });
    return response.ok;
  } catch {
    return false;
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function createARScene(targetUrl) {
  sceneMount.innerHTML = `
    <a-scene
      mindar-image="imageTargetSrc: ${targetUrl}; filterMinCF: 0.0001; filterBeta: 0.001; uiScanning: no; uiLoading: no; uiError: no; warmupTolerance: 5; missTolerance: 8;"
      color-space="sRGB"
      renderer="colorManagement: true, physicallyCorrectLights"
      vr-mode-ui="enabled: false"
      device-orientation-permission-ui="enabled: false"
      embedded>
      <a-assets>
        <img id="bookInside" src="${overlayImagePath}" crossorigin="anonymous">
      </a-assets>
      <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
      <a-entity id="bookTarget" mindar-image-target="targetIndex: 0">
        <a-plane
          id="bookPlane"
          src="#bookInside"
          position="0 0 0.02"
          width="1.5"
          height="1.5"
          material="transparent: true; alphaTest: 0.01"
          animation__appear="property: scale; from: 0.82 0.82 0.82; to: 1 1 1; dur: 520; easing: easeOutCubic">
        </a-plane>
      </a-entity>
    </a-scene>
  `;

  const scene = sceneMount.querySelector("a-scene");
  const target = sceneMount.querySelector("#bookTarget");
  bookPlane = sceneMount.querySelector("#bookPlane");
  updateBookZoom();

  scene.addEventListener("arReady", () => {
    startPanel.classList.add("is-hidden");
    scanNote.hidden = false;
  });

  scene.addEventListener("arError", () => {
    startPanel.classList.remove("is-hidden");
    statusText.textContent = "Camera kon niet starten. Gebruik HTTPS, localhost of GitHub Pages.";
    startButton.disabled = false;
  });

  target.addEventListener("targetFound", () => {
    scanNote.hidden = true;
    zoomControls.hidden = false;
  });

  target.addEventListener("targetLost", () => {
    scanNote.hidden = false;
  });
}

zoomInButton.addEventListener("click", () => {
  setBookZoom(bookZoom + 0.15);
});

zoomOutButton.addEventListener("click", () => {
  setBookZoom(bookZoom - 0.15);
});

window.addEventListener("touchstart", (event) => {
  if (event.touches.length !== 2) return;
  pinchStartDistance = getTouchDistance(event.touches);
  pinchStartZoom = bookZoom;
}, { passive: true });

window.addEventListener("touchmove", (event) => {
  if (event.touches.length !== 2 || !pinchStartDistance) return;
  const nextDistance = getTouchDistance(event.touches);
  setBookZoom(pinchStartZoom * (nextDistance / pinchStartDistance));
}, { passive: true });

window.addEventListener("touchend", () => {
  pinchStartDistance = null;
  pinchStartZoom = bookZoom;
}, { passive: true });

function setBookZoom(value) {
  bookZoom = Math.max(1.1, Math.min(3.5, value));
  updateBookZoom();
}

function updateBookZoom() {
  if (!bookPlane) return;
  bookPlane.setAttribute("width", String(bookZoom));
  bookPlane.setAttribute("height", String(bookZoom));
  zoomLabel.textContent = `${Math.round(bookZoom * 100)}%`;
}

function getTouchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

window.addEventListener("pagehide", () => {
  if (objectUrl) URL.revokeObjectURL(objectUrl);
});
