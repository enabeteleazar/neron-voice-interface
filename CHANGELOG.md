# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce
fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet suit le [Semantic Versioning](https://semver.org/lang/fr/).

## [1.0.0] - 2026-07-12

Première version stable de l'interface vocale.

### Ajouté
- Interface tap-to-talk (orbe animé) avec quatre états : `idle`, `listening`,
  `processing`, `speaking`.
- Connexion WebSocket JSON-RPC au gateway NéronOS avec handshake
  d'authentification (`gateway.auth`) via token optionnel.
- Capture audio cross-navigateur (`MediaRecorder`) avec sélection automatique
  du format supporté (`audio/mp4` sur iOS Safari, `audio/webm;codecs=opus`
  sur Chrome/Android, repli `audio/wav`).
- Déverrouillage de la lecture audio programmatique pour contourner la
  politique autoplay de Safari/iOS.
- Pipeline vocal complet côté client : envoi audio (`voice.send`), réception
  transcription (`voice.transcription`), streaming de la réponse texte
  (`agent.token`), lecture de la synthèse vocale (`voice.audio`).
- Gestion d'erreurs utilisateur (micro refusé, connexion impossible, lecture
  audio bloquée, etc.) remontée via toasts.
- Spécification OpenAPI de Néron Core (`neron-api.json`) versionnée dans le
  repo comme référence client.

### Connu / limitations
- Widget météo affiché en écran d'accueil : donnée simulée, non connectée à
  une source réelle.
- Pas de reconnexion WebSocket automatique en cas de coupure du gateway.
- `artifacts/mockup-sandbox` (canvas de prototypage Replit) est présent dans
  le repo mais n'est pas destiné à la production.

### Sécurité
- Aucun secret en clair dans le code — configuration exclusivement via
  variables d'environnement (`VITE_NERON_WS_URL`, `VITE_NERON_TOKEN`).
- `pnpm audit --prod` : aucune vulnérabilité connue au moment du tag.
