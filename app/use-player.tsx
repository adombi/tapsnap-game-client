'use client';

import { useContext } from "react";
import PlayerContext from "@/app/player-context";

export default function usePlayer() {
  const consumer = useContext(PlayerContext);

  if (!consumer) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }

  return consumer;
}
