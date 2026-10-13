import * as T from 'three';
import { disposeTree } from './piece-models';

export const abilities: Record<string, { name: string; movement: string; capture: string }> = {
  p: { name: 'Dagger oath', movement: 'March', capture: 'A quick lunge and crossed dagger strike' },
  n: { name: 'Dragon fang', movement: 'Vault', capture: 'A soaring leap, closing jaws and three claw marks' },
  b: { name: 'Soul lance', movement: 'Levitate', capture: 'A focused beam through an arcane seal' },
  r: { name: 'Citadel crush', movement: 'Siege charge', capture: 'A heavy slam that fractures the ground' },
  q: { name: 'Astral eclipse', movement: 'Phase', capture: 'An orbiting vortex that consumes the target' },
  k: { name: 'Sovereign judgment', movement: 'Royal advance', capture: 'A golden greatsword descends in judgment' },
};
export type BattleMove = { id: number; square: string; from: string; kind: string; color: 'w' | 'b'; captured?: boolean; victimSquare?: string; castle?: string };
const point = (s: string) => new T.Vector3('abcdefgh'.indexOf(s[0]) - 3.5, 0, 4.5 - Number(s[1]));

export function animateBattle(board: T.Group, move: BattleMove, reduced: boolean) {
  const pieces = board.getObjectByName('pieces');
  const attacker = pieces?.children.find(o => o.userData.square === move.from);
  const victim = move.captured ? pieces?.children.find(o => o.userData.square === (move.victimSquare || move.square)) : undefined;
  const rook = move.castle ? pieces?.children.find(o => o.userData.square === (move.castle === 'k' ? 'h' : 'a') + move.from[1]) : undefined;
  const rookStart = rook?.position.clone();
  const start = point(move.from), end = point(move.square);
  const originalRotation = attacker?.rotation.clone();
  const victimPosition = victim?.position.clone();
  const victimRotation = victim?.rotation.clone();
  const victimScale = victim?.scale.clone();
  const fx = new T.Group(); fx.position.copy(end); board.add(fx);
  const color = move.kind === 'k' ? 0xffd694 : move.color === 'w' ? 0x71d5ff : 0xff6049;
  const material = () => new T.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
  const add = (geo: T.BufferGeometry, x=0, y=0, z=0) => { const m=new T.Mesh(geo,material());m.position.set(x,y,z);fx.add(m);return m; };
  const ring = (radius: number, y: number) => { const m=add(new T.TorusGeometry(radius,.018,6,64),0,y);m.rotation.x=Math.PI/2;return m; };
  if (move.captured) {
    switch(move.kind) {
      case 'p':
        for(const sign of [-1,1]) { const blade=add(new T.BoxGeometry(.045,.95,.035),sign*.13,.75);blade.rotation.z=sign*.7; }
        break;
      case 'n':
        for(const sign of [-1,1]) for(let i=0;i<5;i++) { const fang=add(new T.ConeGeometry(.075,.32,5),(i-2)*.14,.65+sign*.34);fang.rotation.z=sign===1?Math.PI:0;fang.userData.jaw=sign; }
        for(let i=0;i<3;i++){const claw=add(new T.BoxGeometry(.027,1.2,.025),(i-1)*.22,.8,.18);claw.rotation.z=-.48;}
        break;
      case 'b': {
        ring(.56,.045); ring(.43,.06);
        const direction=end.clone().sub(start);const beam=add(new T.CylinderGeometry(.035,.035,direction.length(),8));
        beam.position.copy(start.clone().sub(end).multiplyScalar(.5));beam.position.y=.9;beam.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());
        for(let i=0;i<8;i++){const a=i*Math.PI/4;add(new T.OctahedronGeometry(.09),Math.cos(a)*.5,.18,Math.sin(a)*.5);} break;
      }
      case 'r':
        for(let i=0;i<3;i++)ring(.25+i*.26,.045);
        for(let i=0;i<12;i++){const a=i*Math.PI/6;const crack=add(new T.BoxGeometry(.025,.025,.6),Math.sin(a)*.5,.04,Math.cos(a)*.5);crack.rotation.y=a;}
        break;
      case 'q':
        for(let i=0;i<5;i++){const r=ring(.22+i*.09,.2+i*.22);r.rotation.x+=i*.18;}
        add(new T.IcosahedronGeometry(.22,1),0,.85);break;
      case 'k':
        add(new T.BoxGeometry(.13,1.7,.05),0,1.4);
        add(new T.ConeGeometry(.11,.3,4),0,.4).rotation.z=Math.PI;
        add(new T.BoxGeometry(.7,.07,.08),0,2.05);ring(.65,.04);break;
    }
    for(let i=0;i<22;i++){const a=i*2.399;const m=add(new T.OctahedronGeometry(.025+(i%3)*.012),Math.cos(a)*.45,.1,Math.sin(a)*.45);m.userData.spark=true;m.userData.angle=a;}
  } else if(move.kind==='b'||move.kind==='q') { ring(.34,.04); }
  const born=performance.now(), duration=reduced?180:move.captured?1250:650;
  let frame=0;
  const tick=()=>{
    const t=Math.min(1,(performance.now()-born)/duration);
    const travel=move.captured?(move.kind==='b'||move.kind==='q'?Math.max(0,(t-.5)/.5):Math.min(1,t/.62)):t;
    const ease=travel*travel*(3-2*travel);
    if(attacker){
      attacker.position.lerpVectors(start,end,ease);
      if(!reduced) {
        const arch=Math.sin(travel*Math.PI);
        attacker.position.y=move.kind==='n'?arch*1.5:move.kind==='b'?arch*.42:move.kind==='q'?arch*.22:move.kind==='r'?arch*.08:Math.abs(Math.sin(travel*Math.PI*4))*.075;
        attacker.rotation.z=(move.kind==='p'?.13:move.kind==='k'?.06:move.kind==='r'?.025:0)*Math.sin(travel*Math.PI*2);
        if(move.kind==='q')attacker.scale.setScalar(1-arch*.38);
      }
    }
    if(rook&&rookStart)rook.position.lerpVectors(rookStart,point((move.castle==='k'?'f':'d')+move.from[1]),ease);
    const impact=Math.max(0,(t-.3)/.7);
    fx.rotation.y=move.kind==='q'?impact*Math.PI*4:0;
    fx.children.forEach(o=>{
      const m=o as T.Mesh<T.BufferGeometry,T.MeshBasicMaterial>;
      m.material.opacity=move.captured?Math.sin(impact*Math.PI):Math.sin(t*Math.PI)*.65;
      if(o.userData.jaw)o.position.y=.75+o.userData.jaw*(.45-Math.sin(impact*Math.PI)*.32);
      if(o.userData.spark){const a=o.userData.angle;o.position.set(Math.cos(a)*(.3+impact*.85),Math.sin(impact*Math.PI)*.8,Math.sin(a)*(.3+impact*.85));}
    });
    if(move.kind==='r')fx.scale.setScalar(1+impact*.7);
    if(move.kind==='k')fx.position.y=(1-impact)*.9;
    if(victim&&impact>0){
      const fall=Math.min(1,impact*1.4);
      if(move.kind==='q'){victim.rotation.y+=.12;victim.position.y=fall*.55;}
      else if(move.kind==='b')victim.position.y=fall*.2;
      else {victim.rotation.z=fall*1.5;victim.position.y=-fall*.15;}
      victim.scale.setScalar(Math.max(.001,1-fall));
    }
    if(t<1)frame=requestAnimationFrame(tick);
  };tick();
  return()=>{cancelAnimationFrame(frame);board.remove(fx);disposeTree(fx);if(attacker){attacker.position.copy(start);attacker.scale.setScalar(1);if(originalRotation)attacker.rotation.copy(originalRotation);}if(victim){if(victimPosition)victim.position.copy(victimPosition);if(victimRotation)victim.rotation.copy(victimRotation);if(victimScale)victim.scale.copy(victimScale);}if(rook&&rookStart)rook.position.copy(rookStart);};
}
