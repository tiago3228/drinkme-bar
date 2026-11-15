import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClientOnly } from "@tanstack/react-router";
import { Maximize2, Minimize2, Pause, Play, SkipForward, Volume2, VolumeX } from "lucide-react";
import { publicOptions } from "./content";
import { MusicContext } from "./ambient-music.context";

export function AmbientMusicProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery(publicOptions);
  const tracks = data?.music.tracks ?? [];
  const order = data?.music.order ?? "sequential";
  const [trackId, setTrackId] = useState("");
  const [volume, setVolume] = useState(0.3);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [playbackError, setPlaybackError] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const playIntent = useRef(false);
  const autoplayAttempted = useRef(false);
  const playRequest = useRef(0);
  const currentTrack = tracks.find((track) => track.id === trackId) ?? tracks[0];
  const currentIndex = currentTrack
    ? tracks.findIndex((track) => track.id === currentTrack.id)
    : -1;
  const activeTrackId = currentTrack?.id;
  const trackUrl = currentTrack?.url;

  useEffect(() => {
    if (currentTrack && currentTrack.id !== trackId) setTrackId(currentTrack.id);
    if (!currentTrack && trackId) setTrackId("");
  }, [currentTrack, trackId]);

  useEffect(() => {
    if (currentTrack) return;
    playIntent.current = false;
    audioRef.current?.pause();
    setPlaying(false);
  }, [currentTrack]);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    const requestId = ++playRequest.current;
    playIntent.current = true;
    setPlaybackError("");
    try {
      await audio.play();
      if (requestId !== playRequest.current) return;
      setPlaying(true);
      setAutoplayBlocked(false);
    } catch {
      if (requestId !== playRequest.current) return;
      playIntent.current = false;
      setPlaying(false);
      setAutoplayBlocked(true);
      setPlaybackError(
        audio.error?.code === 3 || audio.error?.code === 4
          ? "Não foi possível decodificar esta faixa."
          : "O navegador bloqueou o áudio. Toque em Tocar para tentar novamente.",
      );
    }
  }, [currentTrack]);

  const pause = useCallback(() => {
    playRequest.current += 1;
    playIntent.current = false;
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
  }, [volume, muted, activeTrackId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrackId || !trackUrl) return;
    audio.pause();
    audio.src = trackUrl;
    audio.load();
    if (!autoplayAttempted.current) {
      autoplayAttempted.current = true;
      const requestId = ++playRequest.current;
      void audio
        .play()
        .then(() => {
          if (requestId !== playRequest.current) return;
          playIntent.current = true;
          setPlaying(true);
          setAutoplayBlocked(false);
        })
        .catch(() => {
          if (requestId !== playRequest.current) return;
          playIntent.current = false;
          setPlaying(false);
          setAutoplayBlocked(true);
        });
    } else if (playIntent.current) {
      const requestId = ++playRequest.current;
      void audio.play().then(
        () => {
          if (requestId === playRequest.current) setPlaying(true);
        },
        () => {
          if (requestId !== playRequest.current) return;
          playIntent.current = false;
          setPlaying(false);
          setAutoplayBlocked(true);
        },
      );
    }
  }, [activeTrackId, trackUrl]);

  useEffect(() => {
    if (!autoplayBlocked) return;
    const startOnFirstClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest(".spotify-shortcut")) return;
      if (!playIntent.current) void play();
    };
    window.addEventListener("click", startOnFirstClick);
    return () => window.removeEventListener("click", startOnFirstClick);
  }, [autoplayBlocked, play]);

  const muteForLesson = useCallback(() => {
    setMuted(true);
    setMinimized(true);
    if (audioRef.current) audioRef.current.muted = true;
  }, []);

  function advanceTrack() {
    if (!tracks.length) return;
    if (tracks.length === 1) {
      if (playIntent.current) void play();
      return;
    }
    const nextIndex =
      order === "random"
        ? (currentIndex + 1 + Math.floor(Math.random() * (tracks.length - 1))) % tracks.length
        : (currentIndex + 1) % tracks.length;
    const nextTrack = tracks[nextIndex];
    if (nextTrack) setTrackId(nextTrack.id);
  }

  function onEnded() {
    advanceTrack();
  }

  const toggleMute = () => {
    if (volume === 0) {
      setVolume(0.3);
      setMuted(false);
      if (audioRef.current) {
        audioRef.current.volume = 0.3;
        audioRef.current.muted = false;
      }
    } else {
      setMuted((value) => !value);
      if (audioRef.current) audioRef.current.muted = !muted;
    }
  };
  const changeVolume = (nextVolume: number) => {
    const next = Math.max(0, Math.min(1, nextVolume));
    setVolume(next);
    if (next > 0) setMuted(false);
    if (audioRef.current) {
      audioRef.current.volume = next;
      if (next > 0) audioRef.current.muted = false;
    }
  };
  const togglePlayback = () => (playing ? pause() : void play());

  return (
    <MusicContext.Provider value={muteForLesson}>
      {children}
      {currentTrack && (
        <ClientOnly>
        <aside
          className={minimized ? "ambient-music-player minimized" : "ambient-music-player"}
          aria-label="Controles da música ambiente"
        >
          <button
            className="ambient-player-toggle"
            type="button"
            aria-label={minimized ? "Expandir controles do som ambiente" : "Minimizar som ambiente"}
            title={minimized ? "Expandir controles" : "Minimizar"}
            onClick={() => setMinimized((value) => !value)}
          >
            {minimized ? <Maximize2 aria-hidden="true" /> : <Minimize2 aria-hidden="true" />}
          </button>
          {minimized ? (
            <button
              className="ambient-player-mini-play"
              type="button"
              aria-label={playing ? "Pausar música ambiente" : "Tocar música ambiente"}
              title={playing ? "Pausar" : "Tocar"}
              onClick={togglePlayback}
            >
              {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            </button>
          ) : (
            <>
              <div className="ambient-music-info">
                <span className="ambient-music-label">SOM AMBIENTE</span>
                <span className="ambient-music-track" title={currentTrack.name}>
                  {currentTrack.name}
                </span>
                {(autoplayBlocked || playbackError) && (
                  <span className="ambient-autoplay-hint" aria-live="polite">
                    {playbackError || "Toque ou clique em Tocar para iniciar"}
                  </span>
                )}
              </div>
              <div className="ambient-music-controls">
                <div className="ambient-transport-controls">
                  <button
                    type="button"
                    aria-label={playing ? "Pausar música ambiente" : "Tocar música ambiente"}
                    title={playing ? "Pausar" : "Tocar"}
                    onClick={togglePlayback}
                  >
                    {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    aria-label={
                      muted || volume === 0 ? "Ativar som ambiente" : "Silenciar som ambiente"
                    }
                    title={muted || volume === 0 ? "Ativar som" : "Silenciar"}
                    onClick={toggleMute}
                  >
                    {muted || volume === 0 ? (
                      <VolumeX aria-hidden="true" />
                    ) : (
                      <Volume2 aria-hidden="true" />
                    )}
                  </button>
                  {tracks.length > 1 && (
                    <button
                      type="button"
                      aria-label="Próxima música ambiente"
                      title="Próxima música"
                      onClick={advanceTrack}
                    >
                      <SkipForward aria-hidden="true" />
                    </button>
                  )}
                  <a
                    className="spotify-shortcut"
                    href="https://open.spotify.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Abrir Spotify em uma nova aba"
                    title="Abrir Spotify"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <circle cx="12" cy="12" r="11.25" fill="#1ED760" />
                      <path
                        d="M5.15 8.2c4.32-1.3 9.58-.78 13.72 1.53M6.02 11.4c3.64-1.1 7.86-.69 11.08 1.17M6.82 14.48c2.82-.84 5.77-.52 8.22.91"
                        fill="none"
                        stroke="#111814"
                        strokeLinecap="round"
                        strokeWidth="1.55"
                      />
                    </svg>
                  </a>
                </div>
                <label className="ambient-volume-control">
                  <span className="sr-only">Volume da música ambiente</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round(volume * 100)}
                    aria-label="Volume da música ambiente"
                    onChange={(event) => changeVolume(Number(event.target.value) / 100)}
                  />
                  <span>{Math.round(volume * 100)}%</span>
                </label>
              </div>
            </>
          )}
          <audio
            ref={audioRef}
            preload="none"
            onPlay={() => {
              setPlaying(true);
              setPlaybackError("");
            }}
            onPause={() => setPlaying(false)}
            onEnded={onEnded}
            onError={() => {
              playIntent.current = false;
              setPlaying(false);
              setAutoplayBlocked(false);
              setPlaybackError(
                "Falha ao carregar a faixa. Verifique sua conexão e tente novamente.",
              );
            }}
          />
        </aside>
        </ClientOnly>
      )}
    </MusicContext.Provider>
  );
}
