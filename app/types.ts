// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface Game {
  id: string
  users: string[]
  results: Results
}

interface Results {
  [player: string]: number[]
}