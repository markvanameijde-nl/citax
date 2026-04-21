# nieuws — Cloudflare Worker

Dit is de serverless-variant van de RSS-proxy uit `../server.js`. Hij draait
op Cloudflare's gratis tier en geeft je publieke nieuws-app een stabiele
endpoint zónder dat je een server hoeft te beheren.

## Waarom?

De frontend op <https://markvanameijde-nl.github.io/citax/nieuws/> is statisch
en kan niet zelf `https://www.nu.nl/rss/...` ophalen (geen CORS). Deze Worker
staat ertussen: frontend → Worker → Nu.nl.

## Eenmalig deployen

Je hebt een (gratis) Cloudflare-account nodig. Dan:

```bash
# Installeer Wrangler (de Cloudflare CLI) — eenmalig, wereldwijd.
npm install -g wrangler

cd nieuws/worker
wrangler login        # opent browser, inloggen bij Cloudflare
wrangler deploy       # pusht worker.js naar Cloudflare
```

Wrangler print aan het eind een URL, bijvoorbeeld:

```
https://citax-nieuws.<je-cf-subdomein>.workers.dev
```

Kopieer die URL.

## Frontend koppelen

Open `nieuws/app.js`, bovenin staat:

```js
const WORKER_URL = "";
```

Vul daar de zojuist gekregen URL in (**zonder** slash aan het eind):

```js
const WORKER_URL = "https://citax-nieuws.jouw-sub.workers.dev";
```

Commit + push naar `main`. GitHub Pages publiceert de nieuwe frontend en die
praat vanaf dat moment met de Worker wanneer je de app opent op
<https://markvanameijde-nl.github.io/citax/nieuws/>.

Lokaal (`npm start`) blijft gewoon werken via de Node-proxy — de frontend
detecteert `localhost` en negeert `WORKER_URL` in dat geval.

## Endpoints

- `GET /api/feeds` → `{ "feeds": ["Algemeen", ...] }`
- `GET /api/rss?feed=<naam>` → raw RSS-XML van Nu.nl (whitelisted).

## Kosten

Cloudflare's free plan is ruim genoeg: 100.000 requests/dag gratis. Voor
persoonlijk gebruik haal je dat niet.

## Lokaal testen (optioneel)

```bash
cd nieuws/worker
wrangler dev
```

Draait de Worker op <http://localhost:8787/>.
