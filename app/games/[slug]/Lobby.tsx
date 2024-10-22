import React from "react";

interface LobbyProps {
  gameId?: string
  users: string[]
}

export default function Lobby({gameId, users}: LobbyProps) {
  return <div className="flex magicpattern-default h-vdh md:px-20 xl:px-60 disable-selection">
    <div className="flex flex-col game-bg w-full">
      <h1
        className="font-extrabold leading-none lg:text-6xl md:text-5xl pt-10 sm:pt-20 text-4xl text-center text-gray-300 tracking-tight">
        {gameId} Lobby
      </h1>
      <h2
        className="font-extrabold leading-none lg:text-4xl md:text-3xl text-2xl p-5 text-center text-gray-300 tracking-tight">
        Waiting for other players to join<span className="loading">...</span>
      </h2>
      <div
        className="font-extrabold leading-none lg:text-xl md:text-xl text-xl p-5 text-center text-gray-300 tracking-tight">Current
        players
      </div>
      <div className="overflow-y-scroll">
        <ul
          className="flex flex-col items-center gap-2 text-center w-full h-auto overflow-y-scroll pb-2.5">
          {users.map((user: string) => (
            <li key={user}
                className="text-2xl font-semibold me-2 px-2.5 py-1 w-64 rounded text-orange-500 bg-gray-900 border-4 border-orange-700">
              {user}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
}