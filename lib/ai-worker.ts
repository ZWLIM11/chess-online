import { chooseAiMove, replayMoves, type Difficulty, type SavedMove } from "./chess-engine";

self.onmessage = (event: MessageEvent<{ moves: SavedMove[]; difficulty: Difficulty }>) => {
  try {
    self.postMessage({ move: chooseAiMove(replayMoves(event.data.moves), event.data.difficulty) });
  } catch {
    self.postMessage({ error: "The AI could not calculate a move. Try a new game." });
  }
};
