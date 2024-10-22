import React from "react";

interface AttemptLeftProps {
  attemptLeft: number
}

export default function AttemptLeft({attemptLeft}: AttemptLeftProps) {
  return <div className="absolute top-0 right-0 p-3 font-extrabold">
    Attempt left: {Math.max(attemptLeft, 0)}
  </div>
}