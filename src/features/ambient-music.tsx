import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
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
  const audioRef = useRef<HTMLAudioElement>(null);
  const playIntent = useRef(false);
  const autoplayAttempted = useRef(false);
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
    playIntent.current = true;
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      playIntent.current = false;
      setPlaying(false);
    }
  }, [currentTrack]);

  const pause = useCallback(() => {
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
      void audio
        .play()
        .then(() => {
          playIntent.current = true;
          setPlaying(true);
        })
        .catch(() => {
          playIntent.current = false;
          setPlaying(false);
        });
    } else if (playIntent.current) {
      void audio.play().then(
        () => setPlaying(true),
        () => {
          playIntent.current = false;
          setPlaying(false);
        },
      );
    }
  }, [activeTrackId, trackUrl]);

  const muteForLesson = useCallback(() => {
    setMuted(true);
    if (audioRef.current) audioRef.current.muted = true;
  }, []);

  function onEnded() {
    if (!tracks.length) return;
    if (tracks.length === 1) {
      if (playIntent.current) void play();
      return;
    }
    const nextIndex =
      order === "random"
        ? (currentIndex + 1 + Math.floor(Math.random() * (tracks.length - 1))) % tracks.length
        : (currentIndex + 1) % tracks.length;
    setTrackId(tracks[nextIndex].id);
  }

  const toggleMute = () => {
    if (volume === 0) {
      setVolume(0.3);
      setMuted(false);
    } else {
      setMuted((value) => !value);
    }
  };
  const togglePlayback = () => (playing ? pause() : void play());

  return (
    <MusicContext.Provider value={muteForLesson}>
      {children}
      {currentTrack && (
        <aside className="ambient-music-player" aria-label="Controles da música ambiente">
          <div className="ambient-music-info">
            <span className="ambient-music-label">SOM AMBIENTE</span>
            <span className="ambient-music-track" title={currentTrack.name}>
              {currentTrack.name}
            </span>
          </div>
          <div className="ambient-music-controls">
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
              aria-label={muted || volume === 0 ? "Ativar som ambiente" : "Silenciar som ambiente"}
              title={muted || volume === 0 ? "Ativar som" : "Silenciar"}
              onClick={toggleMute}
            >
              {muted || volume === 0 ? (
                <VolumeX aria-hidden="true" />
              ) : (
                <Volume2 aria-hidden="true" />
              )}
            </button>
            <label className="ambient-volume-control">
              <span className="sr-only">Volume da música ambiente</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={Math.round(volume * 100)}
                aria-label="Volume da música ambiente"
                onChange={(event) => setVolume(Number(event.target.value) / 100)}
              />
              <span>{Math.round(volume * 100)}%</span>
            </label>
          </div>
          <audio
            ref={audioRef}
            preload="metadata"
            onEnded={onEnded}
            onError={() => {
              playIntent.current = false;
              setPlaying(false);
            }}
          />
        </aside>
      )}
    </MusicContext.Provider>
  );
}
