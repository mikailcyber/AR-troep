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
  kitchen: "assets/keuken.png",
  ovenOpen: "assets/oven-open.png",
  ovenOpenEmpty: "assets/oven-open-empty.png"
};

const gameStateKey = "wednesdayMysterieState";
let currentScene = "main";
let hasSeenAR = false;
let foundFinger = false;

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
        x: 74,
        y: 52,
        w: 14,
        h: 26,
        shape: "arched-door",
        target: "entranceCastle"
      },
      {
        label: "Schuur",
        aria: "Onderzoek de schuur",
        x: 0,
        y: 58,
        w: 19,
        h: 30,
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
        x: 54,
        y: 35,
        w: 16,
        h: 32,
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
        x: 86,
        y: 13,
        w: 13,
        h: 58,
        shape: "door-tall",
        target: "main"
      },
      {
        label: "Kelder",
        aria: "Ga naar de kelder",
        x: 64,
        y: 48,
        w: 20,
        h: 32,
        shape: "stairs-down",
        rotate: -3,
        get target() {
          return hasSeenAR ? "basementLight" : "basementDark";
        }
      },
      {
        label: "Keuken",
        aria: "Ga naar de keuken",
        x: 0,
        y: 22,
        w: 23,
        h: 54,
        shape: "archway",
        target: "kitchen"
      }
    ]
  },
  basementDark: {
    label: "Kelder zonder licht",
    image: imagePaths.basementDark,
    back: "hall",
    hotspots: [
      {
        label: "Trap naar boven",
        aria: "Ga via de trap terug naar de grote hal",
        x: 27,
        y: 15,
        w: 31,
        h: 55,
        shape: "stairs-up",
        rotate: -1,
        target: "hall"
      },
      {
        label: "Lichtknop",
        aria: "Zet het licht aan",
        x: 0,
        y: 39,
        w: 14,
        h: 27,
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
    hotspots: [
      {
        label: "Trap naar boven",
        aria: "Ga via de trap terug naar de grote hal",
        x: 27,
        y: 14,
        w: 32,
        h: 57,
        shape: "stairs-up",
        rotate: -1,
        target: "hall"
      },
      {
        label: "Lichtknop",
        aria: "Zet het licht uit",
        x: 0,
        y: 43,
        w: 10,
        h: 20,
        shape: "switch",
        target: "basementDark"
      },
      {
        label: "AR-boek",
        aria: "Open het boek als AR-aanwijzing",
        x: 88,
        y: 72,
        w: 12,
        h: 22,
        shape: "book",
        rotate: 8,
        pulse: true,
        action() {
          openARBook();
        }
      },
      {
        label: "Bianca",
        aria: "Praat met Bianca Barclay",
        x: 74,
        y: 34,
        w: 21,
        h: 55,
        shape: "person"
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
        x: 0,
        y: 18,
        w: 24,
        h: 68,
        shape: "oven",
        target: "ovenOpen",
        pulse: true
      },
      {
        label: "Terug naar hal",
        aria: "Ga terug naar de grote hal",
        x: 72,
        y: 12,
        w: 27,
        h: 66,
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
        x: 0,
        y: 30,
        w: 13,
        h: 27,
        shape: "arrow-left",
        target: "kitchen"
      },
      {
        label: "Vinger",
        aria: "Pak de vinger van Thing",
        x: 42,
        y: 47,
        w: 22,
        h: 15,
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
    if (hotspotData.hiddenWhenFound && foundFinger) return;

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

function collectFinger() {
  if (foundFinger) {
    showMessage("Deze vinger zit al in je inventory.");
    return;
  }

  foundFinger = true;
  saveGameState();
  screen.classList.add("has-found-finger");
  sceneImage.src = imagePaths.ovenOpenEmpty;
  updateInventory(true);
  playCollectEffect();
  renderHotspots(scenes.ovenOpen);
}

function openARBook() {
  hasSeenAR = true;
  saveGameState();
  showPcARPanel();
}

function showPcARPanel() {
  const arUrl = new URL("ar.html?scanner=1", window.location.href).href;
  pcArLink.href = arUrl;
  pcArQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(arUrl)}`;
  pcArPanel.hidden = false;
  pcArClose.focus();
}

function hidePcARPanel() {
  pcArPanel.hidden = true;
}

function saveGameState() {
  const state = {
    hasSeenAR,
    foundFinger
  };

  localStorage.setItem(gameStateKey, JSON.stringify(state));
}

function loadGameState() {
  try {
    const state = JSON.parse(localStorage.getItem(gameStateKey) || "{}");
    hasSeenAR = Boolean(state.hasSeenAR);
    foundFinger = Boolean(state.foundFinger);
  } catch {
    hasSeenAR = false;
    foundFinger = false;
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
  inventory.textContent = `Vingers gevonden: ${foundFinger ? 1 : 0}/5`;

  if (!withEffect) return;
  inventory.classList.remove("is-updating");
  inventory.offsetHeight;
  inventory.classList.add("is-updating");
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

loadGameState();
showScene(getInitialScene());
