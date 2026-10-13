import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { animateBattle, abilities } from '../components/battle-animation';

test('all six capture timelines finish, retire effects and restore on cancellation', () => {
  let now=0;let next: FrameRequestCallback | undefined;
  const originalNow=performance.now;
  Object.defineProperty(performance,'now',{configurable:true,value:()=>now});
  globalThis.requestAnimationFrame=cb=>{next=cb;return 1;};
  globalThis.cancelAnimationFrame=()=>{next=undefined;};
  try {
    const signatures = new Set<string>();
    for(const kind of Object.keys(abilities)){
      now=0;const board=new T.Group(), pieces=new T.Group();pieces.name='pieces';board.add(pieces);
      const attacker=new T.Group(), victim=new T.Group();attacker.userData.square='e2';victim.userData.square='d3';pieces.add(attacker,victim);
      const cleanup=animateBattle(board,{id:1,from:'e2',square:'d3',kind,color:'w',captured:true},false);
      signatures.add(board.children[1].children.map(o=>(o as T.Mesh).geometry.type).join(','));
      now=1260;next?.(now);
      assert.ok(attacker.position.distanceTo(new T.Vector3(-.5,0,1.5))<.001);
      assert.ok(victim.scale.x<.01);
      cleanup();assert.equal(board.children.length,1);assert.equal(victim.scale.x,1);
    }
    assert.equal(signatures.size,6,'every piece has a distinct capture effect');
    now=0;const board=new T.Group(),pieces=new T.Group();pieces.name='pieces';board.add(pieces);
    const king=new T.Group(),rook=new T.Group();king.userData.square='e1';rook.userData.square='h1';pieces.add(king,rook);
    const cleanup=animateBattle(board,{id:2,from:'e1',square:'g1',kind:'k',color:'w',castle:'k'},false);
    now=700;next?.(now);assert.deepEqual(rook.position.toArray(),[1.5,0,3.5]);cleanup();
  } finally { Object.defineProperty(performance,'now',{configurable:true,value:originalNow}); }
});
