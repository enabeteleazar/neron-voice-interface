import { useCallback, useEffect, useRef, useState } from 'react';

export type NeronState = 'idle' | 'listening' | 'processing' | 'speaking';

interface UseNeronGatewayOptions {
  /** URL du gateway WebSocket, ex: ws://homebox.local:18789/ws */
  wsUrl?: string;
  /** Token d'authentification (gateway.auth) */
  token?: string;
  /** ID de session, une conversation logique côté orchestrateur */
  sessionId?: string;
  /** Demander aussi la synthèse vocale de la réponse (TTS) */
  synthesize?: boolean;
}

interface UseNeronGatewayResult {
  state: NeronState;
  /** Texte transcrit du dernier message vocal envoyé */
  transcript: string;
  /** Texte de la dernière réponse de Néron */
  responseText: string;
  /** Message d'erreur lisible, ou null */
  error: string | null;
  /** true une fois gateway.auth confirmé (ou si aucun token requis) */
  connected: boolean;
  /** Appelé au tap : démarre l'écoute si idle, arrête et envoie si listening */
  handleTap: () => void;
}

// Formats supportés par ordre de préférence — iOS Safari ne supporte que
// 'audio/mp4' (pas de webm/opus), Chrome/Android préfère webm/opus.
const MIME_CANDIDATES: Array<{ mime: string; ext: string }> = [
  { mime: 'audio/mp4', ext: 'clip.m4a' },
  { mime: 'audio/webm;codecs=opus', ext: 'clip.webm' },
  { mime: 'audio/webm', ext: 'clip.webm' },
  { mime: 'audio/ogg;codecs=opus', ext: 'clip.ogg' },
];

function pickMimeType(): { mime: string | undefined; ext: string } {
  if (typeof MediaRecorder === 'undefined') {
    return { mime: undefined, ext: 'clip.wav' };
  }
  for (const candidate of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(candidate.mime)) {
      return { mime: candidate.mime, ext: candidate.ext };
    }
  }
  return { mime: undefined, ext: 'clip.wav' };
}

// Conversion Blob -> base64 par chunks, pour éviter un stack overflow sur
// les gros buffers avec String.fromCharCode(...bigArray).
async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

let reqIdCounter = 0;
function nextReqId(): string {
  reqIdCounter += 1;
  return `voice-${reqIdCounter}`;
}

// Reconnexion avec backoff exponentiel plafonné : 1s, 2s, 4s, 8s, 16s, 30s, 30s...
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;

export function useNeronGateway(options: UseNeronGatewayOptions = {}): UseNeronGatewayResult {
  const {
    wsUrl = import.meta.env.VITE_NERON_WS_URL ?? 'ws://localhost:18789/ws',
    token = import.meta.env.VITE_NERON_TOKEN,
    sessionId = 'mobile-default',
    synthesize = true,
  } = options;

  const [state, setState] = useState<NeronState>('idle');
  const [transcript, setTranscript] = useState('');
  const [responseText, setResponseText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const authenticatedRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const mimeRef = useRef(pickMimeType());
  const stateRef = useRef<NeronState>('idle');

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  function getAudioEl(): HTMLAudioElement {
    if (!audioElRef.current) {
      audioElRef.current = new Audio();
    }
    return audioElRef.current;
  }

  // Déverrouille la lecture audio programmatique (politique autoplay de
  // Safari/iOS) : doit être appelé de façon SYNCHRONE dans un gestionnaire
  // de geste utilisateur (avant le premier `await`), sur l'élément qui
  // servira ensuite à jouer la vraie réponse.
  function unlockAudioPlayback() {
    const audio = getAudioEl();
    audio.muted = true;
    audio.play().catch(() => {});
    audio.pause();
    audio.muted = false;
  }

  // ── Connexion WebSocket, avec reconnexion automatique ─────────────────────
  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let disconnectNotified = false;

    function scheduleReconnect() {
      if (cancelled) return;
      const delay = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** attempt, RECONNECT_MAX_DELAY_MS);
      attempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    }

    function connect() {
      if (cancelled) return;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      authenticatedRef.current = false;

      ws.onmessage = (evt) => {
        if (cancelled) return;
        let msg: any;
        try {
          msg = JSON.parse(evt.data);
        } catch {
          return;
        }

        // Auth handshake
        if (msg.event === 'gateway.auth_required') {
          if (token) {
            ws.send(JSON.stringify({
              id: 'auth',
              method: 'gateway.auth',
              params: { token },
            }));
          } else {
            setError("Le gateway exige un token d'authentification.");
          }
          return;
        }
        if (msg.id === 'auth') {
          if (msg.error) {
            setError('Authentification refusée par le gateway.');
          } else {
            authenticatedRef.current = true;
            setConnected(true);
            attempt = 0;
            if (disconnectNotified) {
              disconnectNotified = false;
              setError(null);
            }
          }
          return;
        }

        // Events du pipeline vocal
        switch (msg.event) {
          case 'voice.transcription':
            setTranscript(msg.data?.text ?? '');
            break;
          case 'agent.token':
            setResponseText((prev) => prev + (msg.data?.token ?? ''));
            break;
          case 'agent.done':
            // Si pas de synthèse demandée, on affiche la réponse texte puis
            // on revient à idle après un court délai.
            if (!synthesize) {
              setState('speaking');
              setTimeout(() => setState('idle'), 4000);
            }
            break;
          case 'voice.audio': {
            const audioB64 = msg.data?.audio_b64;
            const mimetype = msg.data?.mimetype || 'audio/wav';
            if (audioB64) {
              const audio = getAudioEl();
              audio.src = `data:${mimetype};base64,${audioB64}`;
              setState('speaking');
              audio.onended = () => setState('idle');
              audio.onerror = () => {
                setError('Lecture audio impossible.');
                setState('idle');
              };
              audio.play().catch(() => {
                setError('Lecture audio bloquée par le navigateur.');
                setState('idle');
              });
            } else {
              setState('idle');
            }
            break;
          }
          case 'agent.error':
          case 'voice.error':
            setError(msg.data?.message ?? 'Erreur inconnue.');
            setState('idle');
            break;
          default:
            break;
        }
      };

      // onerror est systématiquement suivi de onclose côté spec WebSocket :
      // toute la logique de notification/reconnexion est centralisée là-bas
      // pour éviter un double message.
      ws.onerror = () => {};

      ws.onclose = () => {
        if (cancelled) return;
        setConnected(false);
        authenticatedRef.current = false;

        // Coupure pendant un enregistrement/traitement en cours : on nettoie
        // proprement plutôt que de laisser l'utilisateur bloqué sur un état
        // qui ne pourra jamais aboutir.
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state !== 'inactive') {
          recorder.stop();
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (stateRef.current !== 'idle') {
          setState('idle');
        }

        // Un seul toast de notification par coupure (pas un par tentative),
        // effacé automatiquement à la reconnexion réussie.
        if (!disconnectNotified) {
          disconnectNotified = true;
          setError('Connexion au gateway perdue — reconnexion automatique en cours...');
        }

        scheduleReconnect();
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [wsUrl, token, synthesize]);

  // ── Démarrage de l'enregistrement ─────────────────────────────────────────
  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');
    setResponseText('');
    unlockAudioPlayback();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError("Ce navigateur ne supporte pas l'enregistrement audio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const { mime } = mimeRef.current;
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start();
      setState('listening');
    } catch {
      setError('Accès au micro refusé.');
      setState('idle');
    }
  }, []);

  // ── Arrêt de l'enregistrement + envoi voice.send ──────────────────────────
  const stopAndSend = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    recorder.onstop = async () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      const blob = new Blob(chunksRef.current, { type: mimeRef.current.mime || 'audio/wav' });
      chunksRef.current = [];

      if (blob.size === 0) {
        setError('Aucun audio capté.');
        setState('idle');
        return;
      }

      setState('processing');

      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN || !authenticatedRef.current) {
        setError('Non connecté au gateway.');
        setState('idle');
        return;
      }

      try {
        const audio_b64 = await blobToBase64(blob);
        ws.send(JSON.stringify({
          id: nextReqId(),
          method: 'voice.send',
          params: {
            audio_b64,
            filename: mimeRef.current.ext,
            session_id: sessionId,
            synthesize,
          },
        }));
      } catch {
        setError("Échec de l'envoi de l'audio.");
        setState('idle');
      }
    };

    recorder.stop();
  }, [sessionId, synthesize]);

  const handleTap = useCallback(() => {
    if (state === 'idle') {
      void startListening();
    } else if (state === 'listening') {
      stopAndSend();
    } else if (state === 'speaking' && audioElRef.current) {
      // Interrompt la lecture de la réponse et revient à idle.
      audioElRef.current.pause();
      setState('idle');
    }
    // Pendant 'processing', le tap ne fait rien.
  }, [state, startListening, stopAndSend]);

  return { state, transcript, responseText, error, connected, handleTap };
}