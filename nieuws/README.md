# nieuws

Toegankelijke nieuws-PWA die berichten van [Nu.nl](https://www.nu.nl/) toont
via de officiële RSS-feeds. Onderdeel van [citax](https://markvanameijde-nl.github.io/citax/).

## Features

- Berichten uit meerdere Nu.nl-RSS-feeds (Algemeen, Economie, Sport, Tech, …).
- Gesorteerd **oud → nieuw** (oudste bovenaan).
- Alleen **titel** en **categorie** per bericht — geen afbeeldingen, geen
  samenvatting, geen ruis.
- Ongelezen berichten zijn **vetgedrukt**, na één klik worden ze
  gemarkeerd als gelezen.
- Klik opent het originele Nu.nl-artikel in een nieuw tabblad.
- Elk bericht heeft een duidelijke **Wis**-knop. Verwijderde berichten
  blijven verwijderd na refresh (opgeslagen in `localStorage`).
- **Donkere modus**: zwarte achtergrond, witte tekst, WCAG AAA-contrast,
  grote lettergrootte (20 px basis / 24 px titels) en ruime witruimte.
- **PWA**: installeerbaar als fullscreen-app op mobiel en desktop.

## Waarom een proxy?

Nu.nl stuurt geen `Access-Control-Allow-Origin`-header, dus de browser mag
de RSS-feed niet rechtstreeks ophalen. De kleine Node-proxy in `server.js`
fetcht de feed server-side en voegt een CORS-header toe. Hij serveert ook de
statische frontend zodat één commando (`npm start`) genoeg is om te draaien.

## Lokaal draaien

Je hebt Node.js 18 of hoger nodig.

```bash
cd nieuws
npm start
```

Open daarna <http://localhost:3000/> in de browser.

Er zijn **geen npm-dependencies** — `server.js` gebruikt alleen Node-builtins.
`npm install` is niet nodig (maar werkt ook gewoon — het installeert niets).

Wil je een andere poort?

```bash
PORT=8080 npm start
```

## Endpoints van de proxy

- `GET /api/feeds` — JSON-lijst met toegestane feeds.
- `GET /api/rss?feed=Algemeen` — proxyt de bijbehorende Nu.nl-feed
  (`https://www.nu.nl/rss/Algemeen`). Alleen whitelisted namen zijn
  toegestaan; de proxy is dus geen open relay.

## Publiek draaien via Cloudflare Worker

GitHub Pages serveert alleen statische bestanden en kan de Node-proxy niet
draaien. Om de app publiek bruikbaar te maken op
<https://markvanameijde-nl.github.io/citax/nieuws/> staat er een kant-en-klare
Cloudflare Worker in [`worker/`](./worker/) die exact dezelfde endpoints
aanbiedt als `server.js`.

Eenmalige deploy (gratis Cloudflare-account volstaat):

```bash
npm install -g wrangler
cd nieuws/worker
wrangler login
wrangler deploy
```

Wrangler geeft je een URL terug, bijvoorbeeld
`https://citax-nieuws.<jij>.workers.dev`. Zet die in `nieuws/app.js`:

```js
const WORKER_URL = "https://citax-nieuws.<jij>.workers.dev";
```

Commit + push naar `main`. De frontend op GitHub Pages praat vanaf dan met de
Worker. Lokaal (`npm start`) blijft via de Node-proxy werken — de frontend
detecteert `localhost` en negeert `WORKER_URL` in dat geval.

Zie [`worker/README.md`](./worker/README.md) voor alle details.

## Installeren als PWA

### Desktop (Chrome, Edge)

1. Open de app in de browser.
2. Klik op het install-icoon rechts in de adresbalk (of via menu →
   "App installeren").
3. De app start in een eigen venster, zonder adresbalk.

### iOS (Safari)

1. Open de app in Safari.
2. Tik op het deelicoon (vierkantje met pijl).
3. Kies **"Zet op beginscherm"**.
4. Start de app vanaf het beginscherm.

### Android (Chrome)

1. Open de app in Chrome.
2. Tik op het menu (drie puntjes).
3. Kies **"App installeren"** of **"Toevoegen aan startscherm"**.
4. Start de app vanaf het startscherm.

## Privacy

- Geen trackers, geen analytics, geen third-party requests.
- Gelezen-status en verwijderde berichten staan alleen in je eigen
  browser (`localStorage`).
- De proxy logt alleen wat Node standaard logt naar stdout en slaat niets op.

## Bestanden

- `server.js` — Node-proxy + statische file server (lokaal).
- `package.json` — `npm start`-script.
- `index.html` — UI-skelet.
- `styles.css` — donkere, hoog-contrast opmaak.
- `app.js` — RSS ophalen, parsen, renderen, persistentie.
- `manifest.json` — PWA-manifest.
- `sw.js` — service worker (offline cache van de app-shell).
- `icon.svg`, `icon-192.svg`, `icon-512.svg` — app-iconen.
- `worker/` — Cloudflare Worker-variant van de proxy voor publieke hosting.
