# Wednesday Mysterie - DP12

Dit is een interactieve Wednesday-themed website voor DP12 Eindoplevering Project Individueel. De site gebruikt gewone HTML, CSS en JavaScript en kan lokaal draaien door `index.html` te openen.

## Openen

1. Zet de afbeeldingen in de map `assets`.
2. Open `index.html` in je browser.

Voor de AR-pagina is een lokale server beter dan direct het bestand openen. De preview-server in deze map start je met:

```bash
node dev-server.cjs
```

Daarna open je `http://127.0.0.1:4178/`.

## Werkende flow

De uitgewerkte route is:

`Main pagina -> Ingang kasteel -> Grote hal -> Kelder zonder licht -> Kelder met licht -> AR boek -> terug naar kelder -> Grote hal -> Keuken -> Oven open / vinger gevonden`

De gebruiker klikt door meerdere schermen, zet het licht aan in de kelder, opent het AR-boek met de camera en vindt daarna een vinger van Thing in de oven.

## Afbeeldingen

Deze bestandsnamen worden gebruikt:

- `assets/main.png`
- `assets/ingang-kasteel.png`
- `assets/grote-hal.png`
- `assets/kelder-donker.png`
- `assets/kelder-licht.png`
- `assets/ar-boek.png`
- `assets/keuken.png`
- `assets/oven-open.png`
- `assets/oven-open-empty.png`
- `assets/ar/book-target.png`
- `assets/ar/book-inside.png`

Als een afbeelding nog ontbreekt, toont de website een donkere placeholder met de naam van het bestand dat nog geplaatst moet worden.

## AR boek

De boek-hotspot in de kelder opent `ar.html`. Die pagina gebruikt MindAR image tracking: de camera zoekt naar `assets/ar/book-target.png` en toont daarna `assets/ar/book-inside.png` als AR-laag.

Op dit moment is de open boekpagina ook de marker, omdat de losse cover-afbeelding nog niet als bestand in de projectmap stond. Vervang later alleen `assets/ar/book-target.png` door de cover als die afbeelding als echte scan-marker gebruikt moet worden.

Camera werkt in browsers alleen betrouwbaar via `localhost` of HTTPS. Voor een telefoon is GitHub Pages dus de beste testplek.

## Aanpassen

De belangrijkste aanpassingen staan in `script.js`:

- `imagePaths`: afbeelding per scherm aanpassen.
- `scenes`: tekstballonnen, hints, routes en hotspots aanpassen.
- `x`, `y`, `w`, `h`: positie en grootte van hotspots aanpassen in procenten.
- `hasSeenAR` en `foundFinger`: simpele state voor de flow.

De visuele stijl staat in `style.css`, inclusief responsiviteit, tekstballonnen, paarse glow, fade transition en AR-overlay.
