import { Chess, type Move, type PieceSymbol, type Square } from "chess.js";

export type Difficulty = "easy" | "medium" | "hard" | "insane";
export type SavedMove = { from: Square; to: Square; promotion?: PieceSymbol };
export const pieceNames: Record<PieceSymbol, string> = { p: "Pawn", n: "Knight", b: "Bishop", r: "Rook", q: "Queen", k: "King" };
const values: Record<PieceSymbol, number> = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 0 };

export function replayMoves(moves: readonly SavedMove[]): Chess {
  const game = new Chess();
  for (const move of moves) game.move({ from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}) });
  return game;
}

export function saveMove(move: Move): SavedMove {
  return { from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}) };
}

export function gameStatus(game: Chess): string | null {
  if (game.isCheckmate()) return `${game.turn() === "w" ? "Crimson Dominion" : "Ivory Order"} wins by checkmate!`;
  if (game.isStalemate()) return "Draw by stalemate.";
  if (game.isThreefoldRepetition()) return "Draw by threefold repetition.";
  if (game.isInsufficientMaterial()) return "Draw — insufficient material.";
  if (game.isDraw()) return "The battle ends in a draw.";
  return null;
}

function evaluate(game: Chess): number {
  let result = 0;
  for (const row of game.board()) for (const piece of row) {
    if (!piece) continue;
    const file = piece.square.charCodeAt(0) - 97;
    const rank = Number(piece.square[1]) - 1;
    const advance = piece.color === "w" ? rank : 7 - rank;
    const centrality = 7 - Math.abs(file - 3.5) - Math.abs(rank - 3.5);
    const positional = piece.type === "p" ? advance * 8 + centrality * 3 : piece.type === "n" || piece.type === "b" ? centrality * 10 : 0;
    result += (values[piece.type] + positional) * (piece.color === "w" ? 1 : -1);
  }
  return result * (game.turn() === "w" ? 1 : -1);
}

function orderedMoves(game: Chess): Move[] {
  return game.moves({ verbose: true }).sort((a, b) => {
    const rank = (m: Move) => (m.captured ? 10 * values[m.captured] - values[m.piece] : 0) + (m.promotion ? values[m.promotion] : 0);
    return rank(b) - rank(a);
  });
}

class SearchExpired extends Error {}

function search(game: Chess, depth: number, alpha: number, beta: number, ply: number, deadline: number): number {
  if (Date.now() >= deadline) throw new SearchExpired();
  if (game.isCheckmate()) return -100000 + ply;
  if (game.isDraw()) return 0;
  if (depth === 0) return evaluate(game);
  let best = -Infinity;
  for (const move of orderedMoves(game)) {
    game.move(move);
    let value: number;
    try { value = -search(game, depth - 1, -beta, -alpha, ply + 1, deadline); }
    finally { game.undo(); }
    best = Math.max(best, value);
    alpha = Math.max(alpha, value);
    if (alpha >= beta) break;
  }
  return best;
}

export function chooseAiMove(game: Chess, difficulty: Difficulty, random = Math.random): SavedMove | null {
  if (game.isGameOver()) return null;
  const legal = orderedMoves(game);
  if (difficulty === "easy") return saveMove(legal[Math.floor(random() * legal.length)]);
  const maxDepth = difficulty === "medium" ? 1 : difficulty === "hard" ? 3 : 5;
  const deadline = Date.now() + (difficulty === "insane" ? 2200 : difficulty === "hard" ? 900 : 300);
  let bestMove = legal[0];
  for (let depth = 1; depth <= maxDepth; depth++) {
    let best = -Infinity;
    let currentBest = bestMove;
    try {
      const candidates = [bestMove, ...legal.filter(m => m.lan !== bestMove.lan)];
      for (const move of candidates) {
        game.move(move);
        let value: number;
        try { value = -search(game, depth - 1, -Infinity, -best, 1, deadline); }
        finally { game.undo(); }
        if (value > best) { best = value; currentBest = move; }
      }
      bestMove = currentBest;
      if (best > 99000) break;
    } catch (error) {
      if (!(error instanceof SearchExpired)) throw error;
      break;
    }
  }
  return saveMove(bestMove);
}
