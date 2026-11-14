import { createContext, useContext } from "react";

export const MusicContext = createContext<() => void>(() => {});

export function useAmbientMusic() {
  return useContext(MusicContext);
}
