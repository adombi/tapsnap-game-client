'use client'

import Link from "next/link";
import NameModal from "@/app/name-modal";
import usePlayer from "@/app/use-player";
import {useEffect, useState} from "react";

export default function Home() {
  const { player } = usePlayer();
  const [games, setGames] = useState<Game[]>([])

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_HTTP_SERVER_HOST}/games`)
      .then(data => data.json())
      .then(g => setGames(g))
  }, [])

  if (player === undefined) {
    return (
      <NameModal/>
    )
  }

  return (
    <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
      <h1 className="mb-4 text-4xl font-extrabold leading-none tracking-tight text-gray-900 md:text-5xl lg:text-6xl dark:text-white text-center w-full">
        Games
      </h1>
      <div className="flex gap-4 items-center flex-col">
        {games.map((game: Game) => (
          <Link
            className="rounded-md border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-2xl h-10 sm:h-12 px-4 sm:px-5"
            key={game.id}
            href={`/games/${game.id}`}
            rel="noopener noreferrer"
          >
            {game.id}
          </Link>
        ))}
      </div>
    </main>
  );
}
