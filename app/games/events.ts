// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface JoinRequest {
  playerName: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Reaction {
  playerName: string,
  respondTimeMillis: number
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface PhaseModel {
  number: number,
  eventReceivedEpoch: number
}