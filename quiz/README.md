# Quiz

Nederlandstalige quiz-PWA met gesproken vragen en meerkeuze-antwoorden.
Onderdeel van [citax](https://markvanameijde-nl.github.io/citax/).

Live: https://markvanameijde-nl.github.io/citax/quiz/

## Features

- Willekeurige vragen uit zes categorieën: geschiedenis, wetenschap, film,
  sport, geografie, muziek (54 vragen in `questions.json`).
- Vier meerkeuze-opties (A/B/C/D), één correct.
- Web Speech API leest vraag én antwoordopties voor met een enthousiaste
  Nederlandse stem. Spreeksnelheid instelbaar via een slider (0,7×–1,4×),
  persistent in `localStorage`.
- Groene flash + "Helemaal goed!" bij correct, rode flash + juiste antwoord
  gesproken bij fout.
- Scorebord (goed / fout / totaal) persistent in `localStorage`.
- Knoppen "Volgende vraag" en "Reset score".
- Installeerbaar als PWA (standalone, eigen icon, offline via service worker).

## Lokaal draaien

Omdat de app `questions.json` via `fetch` laadt en een service worker
registreert, moet hij via HTTP geserveerd worden (niet rechtstreeks vanaf
`file://`). Open een terminal in deze map en kies een van de volgende:

```bash
# Python 3
python3 -m http.server 8000

# of Node (npx)
npx serve .
```

Open daarna http://localhost:8000/ in de browser.

## Toevoegen aan beginscherm

### iOS (Safari)

1. Open de live-URL in Safari.
2. Tik op het deelicoon (vierkantje met pijl).
3. Kies **"Zet op beginscherm"**.
4. Open de app vanaf het beginscherm — hij start full-screen zonder
   adresbalk.

### Android (Chrome)

1. Open de live-URL in Chrome.
2. Tik op het menu (drie puntjes).
3. Kies **"App installeren"** of **"Toevoegen aan startscherm"**.
4. Start de app vanaf het startscherm.

## Stembeschikbaarheid

De app gebruikt `SpeechSynthesis` met voorkeur voor een `nl-NL` stem. Als je
device geen Nederlandse stem heeft geïnstalleerd, valt de browser terug op
de standaardstem. Op iOS/macOS kun je extra stemmen installeren via
*Instellingen → Toegankelijkheid → Gesproken materiaal → Stemmen*.

## Bestanden

- `index.html` — UI
- `styles.css` — opmaak en animaties
- `app.js` — quizlogica, spraak, scoring
- `questions.json` — vragenset
- `manifest.json` — PWA-manifest
- `sw.js` — service worker (offline cache)
- `icon-192.png`, `icon-512.png` — icons
