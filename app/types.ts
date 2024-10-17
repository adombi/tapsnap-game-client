// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Game {
  id: string
  users: string[]
  results: Results
}

interface Results {
  [player: string]: number[]
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface PlayerResults {
  position: number
  overallResult: number
  results: number[]
}