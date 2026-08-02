# Néron Voice Interface

Interface vocale web (mobile & desktop) pour [NéronOS](https://github.com/enabeteleazar), l'assistant IA
personnel auto-hébergé exécuté sur homebox. L'app se connecte en WebSocket au
gateway JSON-RPC de NéronOS pour envoyer de l'audio, recevoir la transcription,
le flux de réponse texte, puis la synthèse vocale (TTS).

## Sommaire

- [Stack](#stack)
- [Structure du repo](#structure-du-repo)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Développement](#développement)
- [Build de production](#build-de-production)
- [Variables d'environnement](#variables-denvironnement)
- [Limitations connues](#limitations-connues)

## Stack

- **pnpm workspaces**, Node.js 24, TypeScript 5.9
- **Frontend** : React 19, Vite 7, Tailwind CSS 4, Framer Motion, shadcn/ui (Radix)
- **Communication temps réel** : WebSocket JSON-RPC vers le gateway NéronOS
  (méthodes `gateway.auth`, `voice.send`, événements `voice.transcription`,
  `agent.token`, `voice.audio`, etc.)
- **Audio** : `MediaRecorder` avec sélection automatique du format supporté
  (`audio/mp4` sur iOS Safari, `audio/webm;codecs=opus` sur Chrome/Android)

## Structure du repo

```
artifacts/
  neron/            → @workspace/neron — l'application réelle (voir .replit-artifact/artifact.toml)
  mockup-sandbox/    → @workspace/mockup-sandbox — canvas de prototypage UI (Replit), pas déployé en prod
scripts/             → @workspace/scripts — utilitaires internes (placeholder pour l'instant)
neron-api.json       → spec OpenAPI de Néron Core, utilisée comme référence côté client
```

Seul `artifacts/neron` est buildé et servi en production (voir
`artifacts/neron/.replit-artifact/artifact.toml`).

## Prérequis

- Node.js 24
- pnpm (`corepack enable` ou `npm install -g pnpm`)
- Une instance NéronOS accessible (gateway WebSocket, port `18789` par défaut)

## Installation

```bash
git clone https://github.com/enabeteleazar/neronVoiceInterface neron
cd neron
pnpm install
```

## Développement

```bash
pnpm --filter @workspace/neron run dev
```

Le serveur de dev écoute sur `0.0.0.0:<PORT>` (voir variables d'environnement
ci-dessous).

## Build de production

```bash
PORT=20506 BASE_PATH=/ pnpm --filter @workspace/neron run build
```

Le build statique est généré dans `artifacts/neron/dist/public`.

> ⚠️ `PORT` et `BASE_PATH` sont **obligatoires**, y compris pour le build
> statique (contrainte héritée de la config Vite/Replit). Sans ces variables,
> `pnpm run build` échoue immédiatement.

Pour lancer le typecheck complet du monorepo :

```bash
pnpm run typecheck
```

## Variables d'environnement

Définies dans `artifacts/neron/.env` (voir `.env.example`) :

| Variable              | Description                                                              | Défaut                         |
|------------------------|---------------------------------------------------------------------------|----------------------------------|
| `VITE_NERON_WS_URL`    | URL du gateway WebSocket NéronOS                                          | `ws://homebox.local:18789/ws`   |
| `VITE_NERON_TOKEN`     | Token d'authentification attendu par le gateway (`NERON_TOKEN` côté serveur) | vide (pas d'auth)               |

Variables de build (non liées à `.env`, à passer à la commande) :

| Variable     | Description                                  |
|--------------|-----------------------------------------------|
| `PORT`       | Port du serveur Vite (dev/preview) et requis au build |
| `BASE_PATH`  | Base path de déploiement (`/` en standalone)  |

## Limitations connues

- Le widget météo affiché en idle (`WeatherIcon`, `22° — Nuageux`) est une
  donnée **simulée**, non branchée à une source réelle.
- Aucune reconnexion WebSocket automatique : si le gateway coupe, l'app reste
  en état déconnecté jusqu'au rechargement de la page.
- `artifacts/mockup-sandbox` est un outil de prototypage Replit, non destiné à
  la production.

## Licence

MIT — voir [LICENSE](./LICENSE).