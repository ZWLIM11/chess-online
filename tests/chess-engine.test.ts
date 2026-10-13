import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { chooseAiMove, replayMoves, saveMove, gameStatus } from '../lib/chess-engine.ts';

test('replay preserves threefold repetition and blocks further AI play',()=>{
 const c=new Chess();for(const san of ['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8'])c.move(san);
 const replay=replayMoves(c.history({verbose:true}).map(saveMove));
 assert.equal(replay.isThreefoldRepetition(),true);assert.match(gameStatus(replay)!,/threefold/);assert.equal(chooseAiMove(replay,'hard'),null);
});
test('AI finds mate in one and leaves its input unchanged',()=>{
 const c=new Chess('7k/5K2/6Q1/8/8/8/8/8 w - - 0 1');const before=c.fen();const move=chooseAiMove(c,'hard');assert.ok(move);assert.equal(c.fen(),before);c.move(move);assert.equal(c.isCheckmate(),true);
});
test('all difficulty levels return a legal move without mutating the game',()=>{
 for(const level of ['easy','medium','hard','insane'] as const){const c=new Chess();c.move('e4');const before=c.fen();const move=chooseAiMove(c,level,()=>0);assert.ok(move);assert.equal(c.fen(),before);assert.doesNotThrow(()=>c.move(move));}
});
test('underpromotion survives serialization',()=>{
 const c=new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1');const move=c.move({from:'a7',to:'a8',promotion:'n'});assert.equal(saveMove(move).promotion,'n');assert.equal(c.get('a8')?.type,'n');
});
test('castling and en passant remain legal after replay',()=>{
 const c=new Chess();for(const san of ['e4','a6','e5','d5'])c.move(san);const replay=replayMoves(c.history({verbose:true}).map(saveMove));const capture=replay.move('exd6');assert.equal(capture.isEnPassant(),true);assert.equal(replay.get('d5'),undefined);
 const castle=new Chess();for(const san of ['e4','e5','Nf3','Nc6','Bc4','Nf6','O-O'])castle.move(san);assert.equal(replayMoves(castle.history({verbose:true}).map(saveMove)).get('f1')?.type,'r');
});
