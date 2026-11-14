export const BUILTIN_AMBIENT_TRACK_ID = "builtin-red-hot-piano";
export const BUILTIN_AMBIENT_TRACK_NAME = "Red Hot Chili Peppers — Piano para estudo";
export const BUILTIN_AMBIENT_TRACK_URL =
  "https://files.manuscdn.com/user_upload_by_module/session_file/310519663944662130/qNSMGMklwZieRTUU.mp3";

export type AmbientMusicConfig = {
  track_ids: string[];
  order: "sequential" | "random";
};

export type AmbientTrack = { id: string; name: string; url: string };
export type AmbientMusicData = { tracks: AmbientTrack[]; order: "sequential" | "random" };
