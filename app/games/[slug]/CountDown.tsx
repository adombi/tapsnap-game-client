import React from "react";
import AttemptLeft from "@/app/games/[slug]/AttemptLeft";

interface CountDownProps {
  text: string
  attemptLeft: number
}

export default function CountDown({text, attemptLeft}: CountDownProps) {
  return <>
    <div className="leading-none pt-20 sm:pt-40 text-center tracking-tight magicpattern-default disable-selection">
      <h1 className="font-extrabold md:text-9xl text-7xl text-gray-300 ">{text}</h1>
    </div>
    <AttemptLeft attemptLeft={attemptLeft} />
  </>
}