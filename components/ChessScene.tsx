"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { animateBattle, type BattleMove } from "./battle-animation";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Chess, type Square } from "chess.js";
import { makePiece, disposeTree } from "./piece-models";

export type CombatEffect = BattleMove | null;
type Props = { fen: string; selected: string | null; legal: string[]; lastMove: string[]; effect: CombatEffect; flipped: boolean; onSquare: (square: string) => void };
const files = "abcdefgh";
const silver = new THREE.MeshStandardMaterial({ color: 0xdce8ee, metalness: .82, roughness: .2 });
const dark = new THREE.MeshStandardMaterial({ color: 0x19191c, metalness: .74, roughness: .24 });
const gold = new THREE.MeshStandardMaterial({ color: 0xb88845, metalness: .9, roughness: .22 });
const blue = new THREE.MeshStandardMaterial({ color: 0x276a96, metalness: .66, roughness: .2, emissive: 0x082039 });
const red = new THREE.MeshStandardMaterial({ color: 0x832c27, metalness: .65, roughness: .25, emissive: 0x260605 });

function coord(s: string) { return new THREE.Vector3(files.indexOf(s[0]) - 3.5, 0, 3.5 - (Number(s[1]) - 1)); }
function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; }
function cylinder(r1: number, r2: number, h: number, m: THREE.Material, y: number, n = 32) { return mesh(new THREE.CylinderGeometry(r1, r2, h, n), m, 0, y); }
function marbleTexture(light: boolean) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d')!;
  c.fillStyle=light?'#c9c3b5':'#101721';c.fillRect(0,0,256,256);
  for(let i=0;i<38;i++){c.beginPath();c.strokeStyle=light?'rgba(55,48,40,.16)':'rgba(190,157,103,.2)';c.lineWidth=i%5===0?1.2:.4;
    for(let x=0;x<=256;x+=4){const y=i*19-210+x*.65+Math.sin(x*.023+i)*14+Math.sin(x*.081+i)*3;if(x===0)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export default function ChessScene({ fen, selected, legal, lastMove, effect, flipped, onSquare }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ scene: THREE.Scene; renderer: THREE.WebGLRenderer; camera: THREE.PerspectiveCamera; controls: OrbitControls; squares: THREE.Mesh[]; board: THREE.Group; effects: { object: THREE.Object3D; born: number; kind: string }[]; raf: number } | null>(null);
  const callback = useRef(onSquare); callback.current = onSquare;

  useEffect(() => {
    const el = host.current; if (!el) return;
    const scene = new THREE.Scene(); scene.background = null; scene.fog = new THREE.FogExp2(0x0b0b12, .018);
    const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
    camera.position.set(8.8, 12.8, 10.6);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
    const pmrem = new THREE.PMREMGenerator(renderer); const environmentRoom = new RoomEnvironment(); const environment = pmrem.fromScene(environmentRoom,.04); scene.environment = environment.texture; scene.environmentIntensity = .55; environmentRoom.dispose(); pmrem.dispose();
    el.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, .25, 0); controls.enableDamping = true; controls.dampingFactor = .08;
    controls.minDistance = 8; controls.maxDistance = 25; controls.maxPolarAngle = Math.PI * .48; controls.minPolarAngle = .12; controls.enablePan = false;
    scene.add(new THREE.AmbientLight(0x8993a8, 1.15));
    const key = new THREE.DirectionalLight(0xffc687, 3.1); key.position.set(-4, 12, 6); key.castShadow = true; key.shadow.mapSize.set(2048,2048); key.shadow.camera.left=-9; key.shadow.camera.right=9; key.shadow.camera.top=9; key.shadow.camera.bottom=-9; scene.add(key);
    const rim = new THREE.PointLight(0x508ab8, 42, 21); rim.position.set(5, 5, -5); scene.add(rim);
    const board = new THREE.Group(); scene.add(board);
    const base = mesh(new THREE.BoxGeometry(9.2, .48, 9.2), new THREE.MeshStandardMaterial({ color: 0x17171b, metalness: .55, roughness: .38 }), 0, -.34); board.add(base);
    const border = mesh(new THREE.BoxGeometry(8.55,.1,8.55), gold,0,-.08); board.add(border);
    const ivoryMarble = marbleTexture(true), blackMarble = marbleTexture(false);
    const squares: THREE.Mesh[] = [];
    for(let rank=0;rank<8;rank++) for(let file=0;file<8;file++) {
      const light = (rank+file)%2===1;
      const mat = new THREE.MeshStandardMaterial({ color: light ? 0xb8b3a6 : 0x252b34, map: light ? ivoryMarble : blackMarble, metalness: .42, roughness: .24 });
      const sq=mesh(new THREE.BoxGeometry(.995,.045,.995),mat,file-3.5,0,3.5-rank);
      sq.userData.square=files[file]+(rank+1); board.add(sq); squares.push(sq);
      const seam=mesh(new THREE.BoxGeometry(.96,.004,.96),new THREE.MeshStandardMaterial({color:light?0xe3d5c4:0x3b3b42,transparent:true,opacity:.24}),file-3.5,.027,3.5-rank); board.add(seam);
    }
    for (const x of [-4.35,4.35]) for(const z of [-4.35,4.35]) {
      board.add(cylinder(.29,.34,.8,new THREE.MeshStandardMaterial({color:0x262429,metalness:.7,roughness:.35}),.21));
      const p=board.children[board.children.length-1]; p.position.x=x; p.position.z=z;
      const flame=mesh(new THREE.ConeGeometry(.13,.4,12),new THREE.MeshBasicMaterial({color:0xffa23e}),x,.91,z); board.add(flame);
      const fire=new THREE.PointLight(0xff8d37,8,4); fire.position.set(x,1.1,z); board.add(fire);
    }
    for(const x of [-6.7,6.7])for(const z of [-7.7]){
      board.add(mesh(new THREE.CylinderGeometry(.46,.58,3.4,8),new THREE.MeshStandardMaterial({color:0x26252b,metalness:.38,roughness:.64}),x,1.05,z));
      board.add(mesh(new THREE.CylinderGeometry(.65,.55,.27,8),gold,x,2.85,z));
      board.add(mesh(new THREE.BoxGeometry(1.25,.3,1.25),new THREE.MeshStandardMaterial({color:0x17171d,metalness:.4}),x,3.06,z));
    }
    for(const [x,color] of [[-5.8,0x1c436d],[5.8,0x722a23]] as const){
      const cloth=mesh(new THREE.PlaneGeometry(1.1,1.8),new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,metalness:.18,roughness:.7}),x,2.4,0); cloth.rotation.y=Math.PI/2;board.add(cloth);
      board.add(mesh(new THREE.BoxGeometry(.07,.07,1.35),gold,x,3.36,0));
    }
    // Gilded plinth, inset rails, engraved corners and cathedral backdrop.
    for(const size of [9.18,8.82]) for(const sign of [-1,1]) {
      board.add(mesh(new THREE.BoxGeometry(size,.035,.035),gold,0,-.15,sign*size/2));
      board.add(mesh(new THREE.BoxGeometry(.035,.035,size),gold,sign*size/2,-.15,0));
    }
    for(const x of [-4.42,4.42])for(const z of [-4.42,4.42]) {
      const crest=mesh(new THREE.OctahedronGeometry(.16),gold,x,-.025,z);crest.scale.y=.28;board.add(crest);
    }
    const dais=mesh(new THREE.CylinderGeometry(7.1,7.4,.24,64),new THREE.MeshStandardMaterial({color:0x101720,metalness:.55,roughness:.3}),0,-.55);scene.add(dais);
    for(const radius of [6.8,7.05]){const trim=mesh(new THREE.TorusGeometry(radius,.025,6,96),gold,0,-.415);trim.rotation.x=Math.PI/2;scene.add(trim);}
    const dustGeometry=new THREE.BufferGeometry(); const dustPositions=new Float32Array(180*3);
    for(let i=0;i<180;i++){dustPositions[i*3]=Math.sin(i*7.3)*10;dustPositions[i*3+1]=(i%37)/6;dustPositions[i*3+2]=Math.cos(i*3.7)*10;}
    dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
    const dustMaterial=new THREE.PointsMaterial({color:0xe3bd77,size:.024,transparent:true,opacity:.45,depthWrite:false});const dust=new THREE.Points(dustGeometry,dustMaterial);scene.add(dust);
    const ray=new THREE.Raycaster(); const mouse=new THREE.Vector2(); let down:{x:number;y:number}|null=null;
    const pointerDown=(e:PointerEvent)=>{down={x:e.clientX,y:e.clientY};};
    const pointerUp=(e:PointerEvent)=>{if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return; const rect=renderer.domElement.getBoundingClientRect();mouse.set(((e.clientX-rect.left)/rect.width)*2-1,-((e.clientY-rect.top)/rect.height)*2+1);ray.setFromCamera(mouse,camera);const pieces=board.getObjectByName("pieces");const hit=ray.intersectObjects([...squares,...(pieces?.children||[])],true)[0];if(hit){let object:THREE.Object3D|null=hit.object;while(object&&!object.userData.square)object=object.parent;if(object)callback.current(object.userData.square);}};
    renderer.domElement.addEventListener("pointerdown",pointerDown); renderer.domElement.addEventListener("pointerup",pointerUp);
    const resize=()=>{const w=el.clientWidth,h=el.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}; const observer=new ResizeObserver(resize);observer.observe(el);resize();
    const state={scene,renderer,camera,controls,squares,board,effects:[] as {object:THREE.Object3D;born:number;kind:string}[],raf:0};sceneRef.current=state;
    const loop=()=>{state.raf=requestAnimationFrame(loop);controls.update();const now=performance.now();state.effects=state.effects.filter(item=>{const t=(now-item.born)/900;if(t>=1){board.remove(item.object);disposeTree(item.object);return false;}item.object.scale.setScalar(.3+t*2.5); item.object.rotation.y+=.06; item.object.traverse(o=>{const m=(o as THREE.Mesh).material as THREE.Material;if(m && "opacity" in m) (m as THREE.MeshBasicMaterial).opacity=1-t;});return true;});renderer.render(scene,camera);};loop();
    return()=>{observer.disconnect();cancelAnimationFrame(state.raf);controls.dispose();environment.dispose();ivoryMarble.dispose();blackMarble.dispose();dustGeometry.dispose();dustMaterial.dispose();disposeTree(scene);renderer.dispose();renderer.domElement.remove();sceneRef.current=null;};
  },[]);

  useEffect(()=>{const s=sceneRef.current;if(!s)return;const old=s.board.getObjectByName("pieces");if(old){s.board.remove(old);disposeTree(old);}const group=new THREE.Group();group.name="pieces";const chess=new Chess(fen);for(let r=0;r<8;r++)for(let f=0;f<8;f++){const square=files[f]+(r+1);const p=chess.get(square as Square);if(p){const o=makePiece(p.type,p.color);o.userData.square=square;o.position.copy(coord(square));group.add(o);}}s.board.add(group);s.squares.forEach(m=>{const sq=m.userData.square as string;const mat=m.material as THREE.MeshStandardMaterial; const file=files.indexOf(sq[0]), rank=Number(sq[1])-1;mat.color.set((file+rank)%2===1?0xb8b3a6:0x252b34);mat.emissive.set(sq===selected?0x477ca5:legal.includes(sq)?0x275c68:lastMove.includes(sq)?0x625231:0x000000);mat.emissiveIntensity=sq===selected?.9:legal.includes(sq)?.8:.5;});},[fen,selected,legal,lastMove]);
  useEffect(()=>{const s=sceneRef.current;if(!s)return;const p=s.camera.position; const target=flipped?new THREE.Vector3(-8.8,12.8,-10.6):new THREE.Vector3(8.8,12.8,10.6);p.copy(target);s.controls.update();},[flipped]);
  useEffect(()=>{const s=sceneRef.current;if(!s||!effect)return;return animateBattle(s.board,effect,window.matchMedia('(prefers-reduced-motion: reduce)').matches);},[effect]);
  return <div ref={host} className="chess-canvas" aria-label="Interactive 3D chess board. Drag to rotate, scroll to zoom, click squares to move."/>;
}


