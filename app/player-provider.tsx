'use client'

import { useState } from 'react'
import PlayerContext from "@/app/player-context";

export default function PlayerProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [player, setPlayer] = useState<string | undefined>()

  return (
    <PlayerContext.Provider value={{ player, setPlayer }}>
      {children}
    </PlayerContext.Provider>
  )
}