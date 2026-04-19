# CLAUDE.md

Notities voor Claude bij het werken aan deze repo.

## Workflow

- Werk op een feature branch (niet direct op `main`).
- Maak kleine, gefocuste PR's — één wijziging per PR.
- Merge de PR zelf zodra alles klopt, in plaats van aan de gebruiker te vragen
  om te mergen. De gebruiker hoeft alleen te bevestigen dát de wijziging mag,
  niet het mergen zelf uit te voeren.
- Alleen vooraf overleggen bij grote of risicovolle wijzigingen (architectuur,
  verwijderen van bestaande apps, iets dat de UI van bestaande apps verandert).

## Taal

- Praat Nederlands met de gebruiker in chat en commits/PR-beschrijvingen.
- Code-commentaar en variabelen in het Engels.

## Deploy

- Deze repo wordt geserveerd via GitHub Pages vanaf `main`.
- Root URL: https://markvanameijde-nl.github.io/citax/
- Alles wat in `main` staat is meteen live na merge.

## Apps in deze repo

- `index.html` — Boodschappenlijst (PWA, dark theme, drag & drop, localStorage).
- `rekenen.html` + `rekenen.webmanifest` — Nederlandstalige rekenoefen-app
  (+, −, ×, ÷) met numpad-invoer en gesproken som (SpeechSynthesis, nl-NL).
  Géén spraakherkenning voor antwoorden.

## Stack-conventies

- Vanilla HTML/CSS/JS, geen build-stap, geen frameworks.
- Inline CSS en JS in één HTML-bestand per app.
- Mobile-first, PWA-vriendelijk (safe-area insets, `apple-mobile-web-app-*`
  meta tags, `theme-color` = `#1a1a2e`).
