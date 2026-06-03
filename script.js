// Hier kun je de afbeelding per scherm aanpassen.
const imagePaths = {
  main: "assets/main.png",
  entranceCastle: "assets/ingang-kasteel.png",
  entranceCastleOpen1: "assets/ingang-kasteel-open-1.png",
  entranceCastleOpen2: "assets/ingang-kasteel-open-2.png",
  entranceCastleOpen3: "assets/ingang-kasteel-open-3.png",
  hall: "assets/grote-hal.png",
  basementDark: "assets/kelder-donker.png",
  basementLight: "assets/kelder-licht.png",
  arBook: "assets/ar-boek.png",
  mirrorRoom: "assets/spiegelkamer.png",
  mirrorPaper: "assets/papier-vinger.png",
  mirrorPaperEmpty: "assets/papier-zonder-vinger.png",
  kitchen: "assets/keuken.png",
  ovenOpen: "assets/oven-open.png",
  ovenOpenEmpty: "assets/oven-open-empty.png"
};

const gameStateKey = "wednesdayMysterieState";
let currentScene = "main";
let hasSeenAR = false;
let foundFinger = false;
let foundPaperFinger = false;
let basementLightOn = false;

const screen = document.getElementById("screen");
const sceneImage = document.getElementById("sceneImage");
const animationImage = document.getElementById("animationImage");
const missingImage = document.getElementById("missingImage");
const missingImageName = document.getElementById("missingImageName");
const inventory = document.getElementById("inventory");
const backButton = document.getElementById("backButton");
const message = document.getElementById("message");
const collectEffect = document.getElementById("collectEffect");
const hotspots = document.getElementById("hotspots");
const actions = document.getElementById("actions");
const arOverlay = document.getElementById("arOverlay");
const pcArPanel = document.getElementById("pcArPanel");
const pcArClose = document.getElementById("pcArClose");
const pcArQr = document.getElementById("pcArQr");
const pcArLink = document.getElementById("pcArLink");

// Hier kun je teksten, hotspots en routes per scherm aanpassen.
const scenes = {
  main: {
    label: "Main pagina",
    image: imagePaths.main,
    back: null,
    hotspots: [
      {
        label: "Deuren",
        aria: "Ga door de deuren van het kasteel",
        x: 78,
        y: 59,
        w: 8,
        h: 18,
        shape: "arched-door",
        target: "entranceCastle"
      },
      {
        label: "Schuur",
        aria: "Onderzoek de schuur",
        x: 1,
        y: 61,
        w: 11,
        h: 24,
        shape: "shed",
        message: "De schuur zit op slot. Misschien ligt de sleutel ergens in het kasteel."
      }
    ]
  },
  entranceCastle: {
    label: "Ingang kasteel",
    image: imagePaths.entranceCastle,
    back: "main",
    hotspots: [
      {
        label: "Deur",
        aria: "Open de deur naar de grote hal",
        x: 54.89,
        y: 31.12,
        w: 12.56,
        h: 33.65,
        shape: "arched-door",
        action() {
          return playFrameAnimation(
            [
              imagePaths.entranceCastleOpen1,
              imagePaths.entranceCastleOpen2,
              imagePaths.entranceCastleOpen3
            ],
            "hall"
          );
        }
      }
    ]
  },
  hall: {
    label: "Grote hal",
    image: imagePaths.hall,
    back: "entranceCastle",
    hotspots: [
      {
        label: "Uitgang",
        aria: "Ga via de uitgang terug naar buiten",
        x: 89.59,
        y: 15.74,
        w: 10.25,
        h: 68.15,
        shape: "door-tall",
        target: "main"
      },
      {
        label: "Kelder",
        aria: "Ga naar de kelder",
        x: 67.64,
        y: 57.99,
        w: 11.86,
        h: 20.07,
        shape: "stairs-down",
        rotate: -3,
        get target() {
          return basementLightOn ? "basementLight" : "basementDark";
        }
      },
      {
        label: "Bovenkamer",
        aria: "Ga naar de kamer boven aan de rechtertrap",
        x: 59.6,
        y: 19.2,
        w: 13.2,
        h: 18,
        shape: "stairs-up",
        rotate: 1,
        target: "mirrorRoom"
      },
      {
        label: "Keuken",
        aria: "Ga naar de keuken",
        x: 2.5,
        y: 15.74,
        w: 15.98,
        h: 62.21,
        shape: "archway",
        target: "kitchen"
      }
    ]
  },
  mirrorRoom: {
    label: "Spiegelkamer",
    image: imagePaths.mirrorRoom,
    back: "hall",
    hotspots: [
      {
        label: "Terug",
        aria: "Ga terug naar de grote hal",
        x: 4.5,
        y: 23.5,
        w: 8.5,
        h: 16,
        shape: "arrow-left",
        target: "hall"
      },
      {
        label: "Bloedig papier",
        aria: "Onderzoek het bloedige papier op de grond",
        x: 51,
        y: 74,
        w: 21,
        h: 22,
        shape: "paper",
        rotate: 8,
        target: "mirrorPaper"
      },
      {
        label: "Spiegel",
        aria: "Open de AR-spiegel",
        x: 75.6,
        y: 17.5,
        w: 8.4,
        h: 39.5,
        shape: "mirror",
        action() {
          openFaceAR();
        }
      }
    ]
  },
  mirrorPaper: {
    label: "Bloedig papier",
    get image() {
      return foundPaperFinger ? imagePaths.mirrorPaperEmpty : imagePaths.mirrorPaper;
    },
    back: "mirrorRoom",
    hotspots: [
      {
        label: "Terug",
        aria: "Ga terug naar de spiegelkamer",
        x: 2,
        y: 7,
        w: 10,
        h: 15,
        shape: "arrow-left",
        target: "mirrorRoom"
      },
      {
        label: "Vinger",
        aria: "Pak de vinger tussen het bloedige papier",
        x: 45,
        y: 44,
        w: 17,
        h: 22,
        shape: "finger",
        rotate: 10,
        hiddenWhenFound: "paper",
        action() {
          collectFinger("paper");
        }
      }
    ]
  },
  basementDark: {
    label: "Kelder zonder licht",
    image: imagePaths.basementDark,
    back: "hall",
    onEnter() {
      basementLightOn = false;
    },
    hotspots: [
      {
        label: "Lichtknop",
        aria: "Zet het licht aan",
        x: 0.31,
        y: 45.75,
        w: 3.99,
        h: 12.74,
        shape: "switch",
        target: "basementLight",
        pulse: true
      }
    ]
  },
  basementLight: {
    label: "Kelder met licht",
    image: imagePaths.basementLight,
    back: "hall",
    onEnter() {
      basementLightOn = true;
    },
    hotspots: [
      {
        label: "Trap naar boven",
        aria: "Ga via de trap terug naar de grote hal",
        x: 34.56,
        y: 19.75,
        w: 13.56,
        h: 52.51,
        shape: "stairs-up",
        rotate: -1,
        target: "hall"
      },
      {
        label: "Lichtknop",
        aria: "Zet het licht uit",
        x: 2.04,
        y: 46.71,
        w: 4.18,
        h: 12.54,
        shape: "switch",
        target: "basementDark"
      },
      {
        label: "AR-boek",
        aria: "Open het boek als AR-aanwijzing",
        x: 92.56,
        y: 79.94,
        w: 6.01,
        h: 13.17,
        shape: "book",
        rotate: 8,
        pulse: true,
        action() {
          openARBook();
        }
      }
    ]
  },
  arBook: {
    label: "AR van het boek",
    image: imagePaths.arBook,
    back: "basementLight",
    ar: true,
    hotspots: [
      {
        label: "Verlaat AR",
        aria: "Verlaat de AR-modus",
        x: 18,
        y: 76,
        w: 64,
        h: 14,
        shape: "button",
        action() {
          hasSeenAR = true;
          showScene("basementLight");
        }
      }
    ]
  },
  kitchen: {
    label: "Keuken",
    image: imagePaths.kitchen,
    back: "hall",
    hotspots: [
      {
        label: "Oven",
        aria: "Open de oven",
        x: 6.69,
        y: 54.75,
        w: 9.81,
        h: 18.71,
        shape: "oven",
        target: "ovenOpen",
        pulse: true
      },
      {
        label: "Terug naar hal",
        aria: "Ga terug naar de grote hal",
        x: 72.93,
        y: 11.26,
        w: 6.75,
        h: 60.24,
        shape: "archway",
        target: "hall"
      }
    ]
  },
  ovenOpen: {
    label: "Oven open",
    get image() {
      return foundFinger ? imagePaths.ovenOpenEmpty : imagePaths.ovenOpen;
    },
    back: "kitchen",
    hotspots: [
      {
        label: "Terug",
        aria: "Ga terug naar de keuken",
        x: 7.64,
        y: 43.92,
        w: 7.48,
        h: 11.41,
        shape: "arrow-left",
        target: "kitchen"
      },
      {
        label: "Vinger",
        aria: "Pak de vinger van Thing",
        x: 45.58,
        y: 55.33,
        w: 12.38,
        h: 6.7,
        shape: "finger",
        rotate: 4,
        hiddenWhenFound: true,
        action() {
          collectFinger();
        }
      }
    ]
  }
};

function showScene(sceneName) {
  const scene = scenes[sceneName];
  if (!scene) return;

  screen.classList.add("is-changing");

  window.setTimeout(() => {
    currentScene = sceneName;
    if (scene.onEnter) scene.onEnter();

    screen.dataset.scene = sceneName;
    screen.classList.toggle("has-found-finger", foundFinger);
    updateInventory(false);
    saveGameState();

    renderImage(scene);
    renderBackButton(scene);
    renderHotspots(scene);
    renderActions(scene);

    arOverlay.hidden = !scene.ar;
    arOverlay.setAttribute("aria-hidden", String(!scene.ar));
    hideMessage();
    screen.classList.remove("is-changing");
  }, 180);
}

function renderImage(scene) {
  missingImage.hidden = true;
  missingImageName.textContent = "";
  animationImage.classList.remove("is-visible");
  animationImage.src = "";
  collectEffect.classList.remove("is-flying");

  sceneImage.onerror = () => {
    missingImageName.textContent = `Plaats afbeelding: ${scene.image}`;
    missingImage.hidden = false;
  };

  sceneImage.src = scene.image;
  sceneImage.alt = `Achtergrond: ${scene.label}`;
}

function renderBackButton(scene) {
  backButton.classList.remove("is-visible");
  backButton.onclick = scene.back ? () => showScene(scene.back) : null;
}

function renderHotspots(scene) {
  hotspots.innerHTML = "";

  (scene.hotspots || []).forEach((hotspotData) => {
    if (hotspotData.hiddenWhenFound && isFingerFound(hotspotData.hiddenWhenFound)) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "hotspot";
    if (hotspotData.pulse) button.classList.add("is-pulsing");
    if (hotspotData.shape) button.classList.add(`hotspot--${hotspotData.shape}`);
    button.style.left = `${hotspotData.x}%`;
    button.style.top = `${hotspotData.y}%`;
    button.style.width = `${hotspotData.w}%`;
    button.style.height = `${hotspotData.h}%`;
    if (hotspotData.rotate) button.style.setProperty("--hotspot-rotate", `${hotspotData.rotate}deg`);
    button.dataset.label = hotspotData.label;
    button.setAttribute("aria-label", hotspotData.aria);

    button.addEventListener("click", async () => {
      if (hotspotData.guard && !hotspotData.guard()) return;
      if (hotspotData.message) showMessage(hotspotData.message);
      if (hotspotData.action) await hotspotData.action();
      if (hotspotData.target) showScene(resolveValue(hotspotData.target));
    });

    hotspots.appendChild(button);
  });
}

function renderActions(scene) {
  actions.innerHTML = "";

  (scene.actions || []).forEach((actionData) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "primary-button";
    button.textContent = actionData.text;
    button.addEventListener("click", actionData.action);
    actions.appendChild(button);
  });
}

function resolveValue(value) {
  return typeof value === "function" ? value() : value;
}

function collectFinger(source = "oven") {
  if (isFingerFound(source)) {
    showMessage("Deze vinger zit al in je inventory.");
    return;
  }

  if (source === "paper") {
    foundPaperFinger = true;
  } else {
    foundFinger = true;
  }

  saveGameState();
  screen.classList.add("has-found-finger");
  if (source === "oven") sceneImage.src = imagePaths.ovenOpenEmpty;
  if (source === "paper") sceneImage.src = imagePaths.mirrorPaperEmpty;
  updateInventory(true);
  playCollectEffect();
  renderHotspots(scenes[currentScene]);
}

function openARBook() {
  hasSeenAR = true;
  saveGameState();
  showPcARPanel();
}

function openFaceAR() {
  window.location.href = "face-ar.html";
}

function showPcARPanel() {
  const arUrl = getPhoneARUrl();
  pcArLink.href = arUrl;
  pcArQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(arUrl)}`;
  pcArPanel.hidden = false;
  pcArClose.focus();
}

function getPhoneARUrl() {
  const publicUrl = "https://mikailcyber.github.io/AR-troep/ar.html?scanner=1";
  const isLocal =
    window.location.protocol === "file:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  if (isLocal) return publicUrl;
  return new URL("ar.html?scanner=1", window.location.href).href;
}

function hidePcARPanel() {
  pcArPanel.hidden = true;
}

function saveGameState() {
  const state = {
    hasSeenAR,
    foundFinger,
    foundPaperFinger
  };

  localStorage.setItem(gameStateKey, JSON.stringify(state));
}

function loadGameState() {
  try {
    const state = JSON.parse(localStorage.getItem(gameStateKey) || "{}");
    hasSeenAR = Boolean(state.hasSeenAR);
    foundFinger = Boolean(state.foundFinger);
    foundPaperFinger = Boolean(state.foundPaperFinger);
  } catch {
    hasSeenAR = false;
    foundFinger = false;
    foundPaperFinger = false;
  }
}

function getInitialScene() {
  const params = new URLSearchParams(window.location.search);
  const requestedScene = params.get("scene") || window.location.hash.replace("#", "");

  if (requestedScene && scenes[requestedScene]) {
    window.history.replaceState(null, "", window.location.pathname);
    return requestedScene;
  }

  return "main";
}

function updateInventory(withEffect) {
  inventory.textContent = `Vingers gevonden: ${getFoundFingerCount()}/5`;

  if (!withEffect) return;
  inventory.classList.remove("is-updating");
  inventory.offsetHeight;
  inventory.classList.add("is-updating");
}

function isFingerFound(source) {
  if (source === "paper") return foundPaperFinger;
  return foundFinger;
}

function getFoundFingerCount() {
  return Number(foundFinger) + Number(foundPaperFinger);
}

function resetGameProgress() {
  hasSeenAR = false;
  foundFinger = false;
  foundPaperFinger = false;
  basementLightOn = false;
  localStorage.removeItem(gameStateKey);
}

function playCollectEffect() {
  collectEffect.classList.remove("is-flying");
  collectEffect.offsetHeight;
  collectEffect.classList.add("is-flying");

  window.setTimeout(() => {
    collectEffect.classList.remove("is-flying");
  }, 900);
}

async function playFrameAnimation(frames, targetScene) {
  hotspots.innerHTML = "";
  actions.innerHTML = "";
  backButton.classList.remove("is-visible");
  screen.classList.add("is-animating");

  frames.forEach((frame) => {
    const preload = new Image();
    preload.src = frame;
  });

  for (const frame of frames) {
    await fadeToFrame(frame, 360);
    await wait(90);
  }

  screen.classList.remove("is-animating");
  showScene(targetScene);
}

function fadeToFrame(frame, duration) {
  return new Promise((resolve) => {
    animationImage.src = frame;
    animationImage.classList.remove("is-visible");
    animationImage.offsetHeight;
    animationImage.classList.add("is-visible");

    window.setTimeout(() => {
      sceneImage.src = frame;
      animationImage.classList.remove("is-visible");
      window.setTimeout(resolve, 80);
    }, duration);
  });
}

function wait(duration) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

function showMessage(text) {
  message.textContent = text;
  message.hidden = false;

  window.clearTimeout(showMessage.timeoutId);
  showMessage.timeoutId = window.setTimeout(hideMessage, 3200);
}

function hideMessage() {
  message.hidden = true;
  message.textContent = "";
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !pcArPanel.hidden) {
    hidePcARPanel();
    return;
  }

  if (event.key === "Escape") {
    const scene = scenes[currentScene];
    if (scene && scene.back) showScene(scene.back);
  }
});

pcArClose.addEventListener("click", hidePcARPanel);
pcArPanel.addEventListener("click", (event) => {
  if (event.target === pcArPanel) hidePcARPanel();
});

const initialScene = getInitialScene();
if (initialScene === "main") {
  resetGameProgress();
} else {
  loadGameState();
}
showScene(initialScene);
