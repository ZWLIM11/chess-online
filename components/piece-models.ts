import * as T from 'three';
import type { PieceSymbol, Color } from 'chess.js';

export const gold = new T.MeshStandardMaterial({color:0xc39957,metalness:.86,roughness:.27});
const ivory = new T.MeshStandardMaterial({color:0xe1e6e5,metalness:.63,roughness:.3});
const obsidian = new T.MeshStandardMaterial({color:0x24232b,metalness:.76,roughness:.33});
const blue = new T.MeshStandardMaterial({color:0x235b90,metalness:.3,roughness:.64});
const crimson = new T.MeshStandardMaterial({color:0x801f28,metalness:.3,roughness:.65});
const sapphire = new T.MeshStandardMaterial({color:0x58b6f0,emissive:0x1471bd,emissiveIntensity:.75,metalness:.6,roughness:.16});
const ruby = new T.MeshStandardMaterial({color:0xff553b,emissive:0xcc1e09,emissiveIntensity:.8,metalness:.5,roughness:.2});
const bladeMat = new T.MeshStandardMaterial({color:0xdce9ee,metalness:.96,roughness:.13});
const shared = new Set<T.Material>([gold,ivory,obsidian,blue,crimson,sapphire,ruby,bladeMat]);
export function disposeTree(object:T.Object3D){object.traverse(o=>{if(o instanceof T.Mesh){o.geometry.dispose();for(const material of Array.isArray(o.material)?o.material:[o.material])if(!shared.has(material))material.dispose();}});}
function add(g:T.Group,geometry:T.BufferGeometry,material:T.Material,x=0,y=0,z=0){const o=new T.Mesh(geometry,material);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
function cyl(g:T.Group,top:number,bottom:number,height:number,material:T.Material,x:number,y:number,z:number,segments=16){return add(g,new T.CylinderGeometry(top,bottom,height,segments),material,x,y,z);}
function ball(g:T.Group,r:number,material:T.Material,x:number,y:number,z:number){return add(g,new T.SphereGeometry(r,14,10),material,x,y,z);}
function sword(material:T.Material,short=false){const g=new T.Group();const h=short?.36:.65;add(g,new T.BoxGeometry(.055,h,.026),material,0,h/2,0);add(g,new T.ConeGeometry(.04,.13,4),material,0,h+.06,0);add(g,new T.BoxGeometry(.22,.035,.04),gold,0,0,0);cyl(g,.028,.028,.16,obsidian,0,-.08,0);ball(g,.04,gold,0,-.18,0);return g;}
function shield(armor:T.Material,cloth:T.Material){const g=new T.Group();const shape=new T.Shape();shape.moveTo(-.14,.19);shape.lineTo(.14,.19);shape.lineTo(.13,-.05);shape.lineTo(0,-.22);shape.lineTo(-.13,-.05);shape.closePath();add(g,new T.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSize:.014,bevelThickness:.01,bevelSegments:1,steps:1}),gold);const inner=add(g,new T.ExtrudeGeometry(shape,{depth:.015,bevelEnabled:false}),cloth,0,0,-.015);inner.scale.setScalar(.84);add(g,new T.BoxGeometry(.026,.24,.035),armor,0,0,.052);add(g,new T.BoxGeometry(.15,.025,.035),armor,0,.02,.052);return g;}
export function makePiece(type:PieceSymbol,side:Color){
 const g=new T.Group();const armor=side==='w'?ivory:obsidian,cloth=side==='w'?blue:crimson,gem=side==='w'?sapphire:ruby;
 cyl(g,.33,.36,.08,gold,0,.055,0,32);cyl(g,.28,.31,.065,armor,0,.12,0,32);cyl(g,.25,.28,.055,cloth,0,.18,0,32);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;add(g,new T.OctahedronGeometry(.027),gold,Math.cos(a)*.31,.12,Math.sin(a)*.31);}
 if(type==='r'){
  cyl(g,.21,.24,.72,armor,0,.59,0,8);cyl(g,.29,.23,.08,gold,0,.97,0,8);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;add(g,new T.BoxGeometry(.11,.18,.11),armor,Math.cos(a)*.235,1.09,Math.sin(a)*.235);}
  add(g,new T.BoxGeometry(.16,.37,.03),cloth,0,.58,-.234);add(g,new T.OctahedronGeometry(.052),gem,0,.72,-.265);
  for(const x of [-.12,.12])add(g,new T.BoxGeometry(.04,.2,.025),obsidian,x,.81,-.224);
 }else if(type==='n'){
  const body=ball(g,.2,armor,0,.58,0);body.scale.set(1,1.4,1.5);
  for(const x of [-.13,.13])for(const z of [-.17,.16]){const leg=cyl(g,.055,.045,.4,armor,x,.39,z);leg.rotation.x=z>0?-.3:.5;ball(g,.065,gold,x,.24,z-.04);}
  const neck=cyl(g,.1,.17,.45,armor,0,.93,-.13);neck.rotation.x=-.5;
  const head=ball(g,.145,armor,0,1.16,-.28);head.scale.set(.85,1,1.5);const muzzle=ball(g,.11,armor,0,1.08,-.45);muzzle.scale.set(.85,.7,1.3);
  for(const x of [-.08,.08]){add(g,new T.ConeGeometry(.035,.17,5),gold,x,1.33,-.24);ball(g,.025,gem,x,1.2,-.37);}
  for(let i=0;i<5;i++)add(g,new T.ConeGeometry(.065,.19,4),gold,0,.89+i*.08,.04-i*.035);
  if(side==='b')for(const sign of [-1,1]){const wing=new T.Shape();wing.moveTo(0,0);wing.lineTo(sign*.43,.37);wing.lineTo(sign*.34,.06);wing.lineTo(sign*.2,-.1);wing.lineTo(0,-.12);const w=add(g,new T.ShapeGeometry(wing),new T.MeshStandardMaterial({color:0x692128,side:T.DoubleSide,metalness:.3,roughness:.6}),sign*.1,.83,.08);w.rotation.y=sign*.35;}
 }else{
  const tall=type==='k'?1.18:type==='q'?1.16:type==='b'?1.09:.84;
  const robe=add(g,new T.ConeGeometry(type==='p'?.19:.24,tall*.67,12,1,true),cloth,0,.3+tall*.3,.025);robe.scale.z=.78;
  for(const x of [-.085,.085]){cyl(g,.05,.05,.26,armor,x,.32,-.035);ball(g,.07,armor,x,.23,-.065);}
  const chest=ball(g,.17,armor,0,.28+tall*.5,0);chest.scale.set(1.05,1.3,.66);cyl(g,.13,.13,.045,gold,0,.27+tall*.39,0);
  for(const sign of [-1,1]){const shoulder=ball(g,.1,armor,sign*.185,.3+tall*.54,0);shoulder.scale.y=.65;const arm=cyl(g,.045,.037,.28,armor,sign*.22,.25+tall*.4,-.02);arm.rotation.z=sign*.2;ball(g,.045,gold,sign*.245,.15+tall*.38,-.04);}
  const headY=.28+tall*.78;ball(g,.105,armor,0,headY,0);
  if(type==='p'||type==='k'){add(g,new T.BoxGeometry(.14,.022,.03),obsidian,0,headY+.016,-.096);add(g,new T.BoxGeometry(.024,.14,.03),gold,0,headY-.005,-.114);}
  if(type==='p'){add(g,new T.ConeGeometry(.106,.12,8),armor,0,headY+.1,0);const s=shield(armor,cloth);s.position.set(.24,.57,-.08);s.rotation.y=-.25;g.add(s);const weapon=sword(bladeMat,true);weapon.position.set(-.245,.48,-.06);weapon.rotation.z=-.15;g.add(weapon);}
  if(type==='b'){add(g,new T.ConeGeometry(.13,.35,8),cloth,0,headY+.2,0);const staff=cyl(g,.019,.019,.9,gold,-.26,.75,-.07);void staff;add(g,new T.OctahedronGeometry(.082),gem,-.26,1.26,-.07);const ring=add(g,new T.TorusGeometry(.11,.015,6,20),gold,-.26,1.26,-.07);ring.rotation.y=.2;}
  if(type==='k'||type==='q'){
   cyl(g,.11,.11,.06,gold,0,headY+.085,0);
   for(let i=0;i<7;i++){const a=i*2*Math.PI/7;add(g,new T.ConeGeometry(.035,.18+(i%2)*.07,5),gold,Math.cos(a)*.095,headY+.18,Math.sin(a)*.095);}
   add(g,new T.OctahedronGeometry(.037),gem,0,headY+.09,-.12);
   if(type==='k'){const weapon=sword(side==='b'?ruby:bladeMat);weapon.position.set(-.245,.51,-.1);weapon.rotation.z=-.13;g.add(weapon);}else{cyl(g,.018,.018,.73,gold,.255,.72,-.04);add(g,new T.OctahedronGeometry(.08),gem,.255,1.15,-.04);}
  }
 }
 if(side==='b')g.rotation.y=Math.PI;
 return g;
}
