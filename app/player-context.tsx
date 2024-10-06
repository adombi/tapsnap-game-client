'use client';

import { createContext, Dispatch, SetStateAction } from "react";

type TContext = {
  player: string | undefined;
  setPlayer: Dispatch<SetStateAction<string | undefined>>;
}

const PlayerContext = createContext<TContext | undefined>(undefined);

export default PlayerContext;
