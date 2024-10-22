import AttemptLeft from "@/app/games/[slug]/AttemptLeft";
import React, {MouseEventHandler} from "react";

interface InProgressProps {
  phase: PhaseModel
  attempt: number
  onClick: MouseEventHandler<HTMLDivElement>
}

export default function InProgress({phase, attempt, onClick}: InProgressProps) {
  return <div onClick={onClick} className="h-full disable-selection">
    <h1
      className={`font-extrabold leading-none pt-20 sm:pt-40 md:text-9xl text-7xl text-center text-gray-300 tracking-tight magicpattern-${phase.number} h-full`}>
      Phase {phase.number}
    </h1>
    <AttemptLeft attemptLeft={attempt}/>
  </div>
}