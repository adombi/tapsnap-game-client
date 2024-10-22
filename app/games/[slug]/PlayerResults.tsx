import React from "react";

interface PlayerOverallResult {
  player: string,
  overallResult: number
}

interface PlayerResultsProps {
  results: Results,
  player: string
}

export default function PlayerResults({results, player}: PlayerResultsProps) {
  const sumOf = (results: number[]) => {
    return results.reduce((partialSum, a) => partialSum + a, 0);
  }

  const positionMapping = (pos: number) => {
    switch (pos) {
      case 1: return "1st"
      case 2: return "2nd"
      case 3: return "3rd"
      default: return `${pos}th`
    }
  }

  const overallResults = Object.entries(results)
    .map(([player, results]) => ({
      player: player,
      overallResult: sumOf(results)
    } as PlayerOverallResult))
    .filter(r => r.overallResult > 0)
    .sort((a, b) => a.overallResult < b.overallResult ? -1 : 1)
  const position = positionMapping(overallResults
    .map(value => value.player)
    .indexOf(player) + 1
    )

  return <div className="magicpattern-3 md:px-20 xl:px-60 disable-selection">
    <div className="game-bg h-full">
      <h1
        className="font-extrabold leading-none lg:text-6xl md:text-5xl pt-20 text-4xl text-center text-gray-300 tracking-tight">
        <div>{player}</div>
        <div className="py-20 xl:py-20">
          {position}
        </div>
      </h1>
      <div className="sm:px-20 md:px-10">
        <table className="w-full text-sm text-left rtl:text-right text-gray-300 bg-opacity-75">
          <thead className="text-lg uppercase bg-gray-700">
          <tr>
            <th scope="col" className="px-6 py-3">
              Player
            </th>
            <th scope="col" className="px-6 py-3">
              Overall Result
            </th>
          </tr>
          </thead>
          <tbody className="text-2xl bg-gray-900 bg-opacity-75 py-10">
          {overallResults.map(r => (
            <tr key={r.player}
                className={r.player === player ? "bg-gray-600 border border-orange-700" : ""}>
              <th className={`px-6 py-2`}>
                {r.player}
              </th>
              <td className={`px-6 py-2`}>
                {r.overallResult}
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
}