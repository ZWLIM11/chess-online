"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Move, PieceSymbol, Square } from "chess.js";
import { gameStatus, pieceNames, replayMoves, saveMove, type Difficulty, type SavedMove } from "./chess-engine";
import type { CombatEffect } from "../components/ChessScene";

export type Mode = "ai" | "local" | "online";
type Room = { id: string; token: string; color: "w" | "b"; revision: number; ready: boolean };
type Snapshot = { id: string; moves: SavedMove[]; revision: number; ready: boolean; token?: string };

async function requestRoom(body: object): Promise<Snapshot> {
  const response = await fetch("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json() as Snapshot & { error?: string };
  if (!response.ok) throw new Error(result.error || "The room could not be reached.");
  return result;
}

export function useChessGame() {
  const [savedMoves, setSavedMoves] = useState<SavedMove[]>([]);
  const [mode, setMode] = useState<Mode>("ai");
  const [level, setLevel] = useState<Difficulty>("medium");
  const [selected, setSelected] = useState<Square | null>(null);
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [effect, setEffect] = useState<CombatEffect>(null);
  const [flipped, setFlipped] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [roomInput, setRoomInput] = useState("");
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [message, setMessage] = useState("Select a piece to begin");
  const [promotion, setPromotion] = useState<Move[] | null>(null);
  const game = useMemo(() => replayMoves(savedMoves), [savedMoves]);
  const moves = useMemo(() => game.history({ verbose: true }), [game]);
  const generation = useRef(0);
  const operation = useRef(false);
  const current = useRef({ savedMoves, mode, room });
  current.current = { savedMoves, mode, room };
  const fen = game.fen();
  const legal = useMemo(() => selected ? game.moves({ square: selected, verbose: true }).map(move => move.to) : [], [game, selected]);
  const lastMove = useMemo(() => moves.length ? [moves[moves.length - 1].from, moves[moves.length - 1].to] : [], [moves]);
  const turn = game.turn() === "w" ? "Ivory Order" : "Crimson Dominion";

  const reset = useCallback((next: Mode) => {
    generation.current++;
    operation.current = false;
    setBusy(false); setThinking(false); setPromotion(null); setEffect(null); setSelected(null);
    setSavedMoves([]); setRoom(null); setMode(next); setFlipped(false);
    setMessage(next === "local" ? "Local duel — Ivory moves first" : "Select a piece to begin");
    window.history.replaceState(null, "", location.pathname);
  }, []);

  const animate = useCallback(async (move: Move, epoch: number) => {
    setEffect({ id: Date.now(), square: move.to, from: move.from, kind: move.piece, color: move.color, captured: !!move.captured, victimSquare: move.flags.includes("e") ? move.to[0] + move.from[1] : move.to, castle: move.flags.includes("k") ? "k" : move.flags.includes("q") ? "q" : undefined });
    if (move.captured) {
      setMessage(move.piece === "b" || move.piece === "q" ? "Arcane magic strikes!" : move.piece === "n" ? "The knight attacks!" : move.piece === "r" ? "A crushing blow!" : "A blade finds its target!");
    } else setMessage(`${pieceNames[move.piece]} advances to ${move.to.toUpperCase()}`);
    await new Promise(resolve => setTimeout(resolve, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 200 : move.captured ? 1300 : 700));
    if (generation.current === epoch) setEffect(null);
    return generation.current === epoch;
  }, []);

  const commit = useCallback(async (input: SavedMove) => {
    if (operation.current) return;
    const epoch = generation.current;
    const state = current.current;
    const board = replayMoves(state.savedMoves);
    if (board.isGameOver()) return;
    let move: Move;
    try { move = board.move(input); } catch { setMessage("That move is not legal."); return; }
    operation.current = true; setBusy(true); setSelected(null); setPromotion(null);
    try {
      let snapshot: Snapshot | null = null;
      if (state.mode === "online") {
        if (!state.room?.ready) throw new Error("Wait for a challenger to join.");
        snapshot = await requestRoom({ action: "move", id: state.room.id, token: state.room.token, revision: state.room.revision, ...saveMove(move) });
      }
      if (generation.current !== epoch) return;
      if (!await animate(move, epoch)) return;
      setSavedMoves(snapshot ? snapshot.moves : [...state.savedMoves, saveMove(move)]);
      if (snapshot && state.room) setRoom({ ...state.room, revision: snapshot.revision, ready: snapshot.ready });
    } catch (error) {
      if (generation.current === epoch) setMessage(error instanceof Error ? error.message : "Move failed. Please try again.");
    } finally {
      if (generation.current === epoch) { operation.current = false; setBusy(false); }
    }
  }, [animate]);

  const onSquare = useCallback((square: string) => {
    if (operation.current || promotion || game.isGameOver()) return;
    if (mode === "ai" && game.turn() === "b") return;
    if (mode === "online" && (!room?.ready || game.turn() !== room.color)) return;
    const sq = square as Square;
    if (selected) {
      const candidates = game.moves({ square: selected, verbose: true }).filter(move => move.to === sq);
      if (candidates.some(move => move.promotion)) { setPromotion(candidates); return; }
      if (candidates[0]) { void commit(saveMove(candidates[0])); return; }
    }
    const piece = game.get(sq);
    setSelected(piece?.color === game.turn() ? sq : null);
  }, [game, selected, mode, room, promotion, commit]);

  useEffect(() => {
    if (mode !== "ai" || game.turn() !== "b" || game.isGameOver() || busy) return;
    const worker = new Worker("/ai-worker.js", { type: "module" });
    setThinking(true);
    worker.onmessage = (event: MessageEvent<{ move?: SavedMove; error?: string }>) => {
      setThinking(false);
      if (event.data.move) void commit(event.data.move);
      else if (event.data.error) setMessage(event.data.error);
      worker.terminate();
    };
    worker.onerror = () => { setThinking(false); setMessage("AI could not start. Reload the game or try Local Duel."); };
    worker.postMessage({ moves: savedMoves, difficulty: level });
    return () => worker.terminate();
  }, [savedMoves, mode, level, busy, game, commit]);

  useEffect(() => {
    if (!room) return;
    let active = true;
    let pending = false;
    const epoch = generation.current;
    const poll = async () => {
      if (pending || operation.current) return;
      pending = true;
      let ownsLock = false;
      try {
        const response = await fetch(`/api/rooms?id=${encodeURIComponent(room.id)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Connection interrupted. Reconnecting…");
        const snapshot = await response.json() as Snapshot;
        if (!active || epoch !== generation.current || operation.current) return;
        const player = current.current.room;
        if (!player || player.id !== room.id) return;
        if (snapshot.revision > player.revision) {
          ownsLock = true;
          operation.current = true; setBusy(true); setSelected(null);
          const replay = replayMoves(snapshot.moves);
          const last = replay.history({ verbose: true }).at(-1);
          if (last && !await animate(last, epoch)) return;
          if (!active) return;
          setSavedMoves(snapshot.moves);
          setRoom({ ...player, revision: snapshot.revision, ready: snapshot.ready });
        } else if (snapshot.ready !== player.ready) {
          setRoom({ ...player, ready: snapshot.ready });
          setMessage("Challenger joined. Battle begins!");
        }
      } catch {
        if (active && epoch === generation.current) setMessage("Connection interrupted. Reconnecting…");
      } finally {
        pending = false;
        if (ownsLock && epoch === generation.current) { operation.current = false; setBusy(false); }
      }
    };
    const timer = setInterval(poll, 1500);
    return () => { active = false; clearInterval(timer); };
  }, [room?.id, animate]);

  function remember(player: Room) {
    sessionStorage.setItem(`arcane-room-${player.id}`, JSON.stringify(player));
    window.history.replaceState(null, "", `?room=${player.id}`);
  }

  async function enterRoom(action: "create" | "join") {
    if (operation.current) return;
    const id = roomInput.trim().toUpperCase();
    if (action === "join" && !/^[A-Z0-9]{6}$/.test(id)) { setMessage("Enter a six-character room code."); return; }
    reset("online");
    const epoch = generation.current;
    operation.current = true; setBusy(true);
    try {
      const data = await requestRoom({ action, ...(action === "join" ? { id } : {}) });
      if (generation.current !== epoch) return;
      if (!data.token) throw new Error("The server did not return a player seat.");
      const player: Room = { id: data.id, token: data.token, color: action === "create" ? "w" : "b", revision: data.revision, ready: data.ready };
      setSavedMoves(data.moves); setRoom(player); remember(player); setFlipped(player.color === "b"); setOnlineOpen(false);
      setMessage(action === "create" ? `Room ${data.id} is ready. Copy the invite link below.` : "You joined as Crimson. Ivory moves first.");
    } catch (error) { if (generation.current === epoch) setMessage(error instanceof Error ? error.message : "Could not connect."); }
    finally { if (generation.current === epoch) { operation.current = false; setBusy(false); } }
  }

  useEffect(() => {
    const id = new URLSearchParams(location.search).get("room")?.toUpperCase();
    if (!id) return;
    setRoomInput(id);
    const epoch = generation.current;
    let active = true;
    const saved = sessionStorage.getItem(`arcane-room-${id}`);
    if (!saved) { setOnlineOpen(true); return; }
    try {
      const player = JSON.parse(saved) as Room;
      fetch(`/api/rooms?id=${encodeURIComponent(id)}`, { cache: "no-store" }).then(async response => {
        if (!response.ok) throw new Error("Room unavailable");
        const data = await response.json() as Snapshot;
        if (!active || epoch !== generation.current) return;
        setSavedMoves(data.moves); setMode("online"); setRoom({ ...player, revision: data.revision, ready: data.ready }); setFlipped(player.color === "b"); setMessage("Online battle restored.");
      }).catch(() => { if (active) setOnlineOpen(true); });
    } catch { setOnlineOpen(true); }
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const status = gameStatus(game);
    if (status) setMessage(status);
    else if (game.isCheck()) setMessage(`${turn} king is in check!`);
  }, [game, turn]);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => setMessage("Offline caching is unavailable. Keep this tab open to play locally."));
    }
  }, []);

  async function copyInvite() {
    if (!room) return;
    try { await navigator.clipboard.writeText(`${location.origin}/?room=${room.id}`); setMessage("Invite link copied."); }
    catch { setMessage(`Share this room code: ${room.id}`); }
  }
  function undo() {
    if (mode === "online" || busy || !savedMoves.length) return;
    generation.current++;
    const count = mode === "ai" && game.turn() === "w" ? 2 : 1;
    setSavedMoves(savedMoves.slice(0, Math.max(0, savedMoves.length - count)));
    setSelected(null); setPromotion(null); setThinking(false); setMessage("Move taken back.");
  }
  function promote(type: PieceSymbol) {
    const move = promotion?.find(candidate => candidate.promotion === type);
    if (move) void commit(saveMove(move));
  }
  return { fen, game, moves, mode, level, setLevel, selected, legal, lastMove, busy, thinking, effect, flipped, setFlipped, room, roomInput, setRoomInput, onlineOpen, setOnlineOpen, message, turn, reset, onSquare, undo, copyInvite, createRoom: () => enterRoom("create"), joinRoom: () => enterRoom("join"), promotion, promote };
}

