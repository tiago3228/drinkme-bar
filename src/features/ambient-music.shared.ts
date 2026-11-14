export const BUILTIN_AMBIENT_TRACK_ID = "builtin-red-hot-piano";
export const BUILTIN_AMBIENT_TRACK_NAME = "Red Hot Chili Peppers — Piano para estudo";
export const BUILTIN_AMBIENT_TRACK_URL = "/api/ambient-audio?track=builtin-red-hot-piano";
export const SECOND_BUILTIN_AMBIENT_TRACK_ID = "builtin-classical-study";
export const SECOND_BUILTIN_AMBIENT_TRACK_NAME = "Cantos e Encantos — Clássicos para relaxar";
export const SECOND_BUILTIN_AMBIENT_TRACK_URL = "/api/ambient-audio?track=builtin-classical-study";

export type AmbientMusicConfig = {
  track_ids: string[];
  order: "sequential" | "random";
};

export type AmbientTrack = { id: string; name: string; url: string };
export type AmbientMusicData = { tracks: AmbientTrack[]; order: "sequential" | "random" };
