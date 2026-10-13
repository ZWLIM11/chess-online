"use client";
import type { Difficulty } from '../lib/chess-engine';
import type { Mode } from '../lib/use-chess-game';
export default function BattleLobby({level,onLevel,onChoose}:{level:Difficulty;onLevel:(level:Difficulty)=>void;onChoose:(mode:Mode)=>void}) {
 return <section className="battle-lobby">
   <div className="lobby-art"/><div className="lobby-vignette"/>
   <div className="lobby-content"><div className="lobby-overline"><span/> A GAME OF KINGS. A WAR OF REALMS. <span/></div>
   <div className="lobby-crown">♛</div><h2>Claim your<br/><em>kingdom.</em></h2>
   <p className="lobby-intro">Silver against shadow. Strategy against destiny.<br/>Choose your battleground and let the legends move.</p>
   <div className="lobby-modes">
   <article className="battle-card ai-card"><span className="card-number">I / THE CHALLENGE</span><span className="card-piece">♞</span><h3>Against the Oracle</h3><p>Test your strategy against the realm’s tireless mind.</p><div className="lobby-difficulty" aria-label="AI difficulty">{(['easy','medium','hard','insane'] as Difficulty[]).map(d=><button aria-pressed={d===level} className={d===level?'active':''} onClick={()=>onLevel(d)} key={d}>{d}</button>)}</div><button className="enter-battle" onClick={()=>onChoose('ai')}>Challenge the Oracle <span>↗</span></button><small>OFFLINE AI · FOUR DIFFICULTIES</small></article>
   <article className="battle-card local-card"><span className="card-number">II / THE DUEL</span><span className="card-piece">♚</span><h3>A Rival Beside You</h3><p>Two sovereigns. One board. Settle the rivalry face to face.</p><div className="card-detail">Pass the throne.<br/><em>Keep your strategy close.</em></div><button className="enter-battle" onClick={()=>onChoose('local')}>Begin a Local Duel <span>↗</span></button><small>TWO PLAYERS · ONE SCREEN</small></article>
   <article className="battle-card online-card"><span className="card-number">III / THE CONQUEST</span><span className="card-piece">♜</span><h3>Across the Realms</h3><p>Summon a friend with a private room code and take the field.</p><div className="card-detail">Different kingdoms.<br/><em>The same battlefield.</em></div><button className="enter-battle" onClick={()=>onChoose('online')}>Enter an Online Battle <span>↗</span></button><small>INVITE A FRIEND · PLAY ONLINE</small></article>
   </div><div className="lobby-footnote">360° ARENA <b>✦</b> SIX SIGNATURE ABILITIES <b>✦</b> CLASSIC CHESS RULES</div></div>
 </section>;
}
