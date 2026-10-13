import assert from 'node:assert/strict';
const root='http://127.0.0.1:5173';
async function post(body){const r=await fetch(root+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
assert.equal((await fetch(root)).status,200);
const host=await post({action:'create'});assert.equal(host.status,200);
const joinResults=await Promise.all([post({action:'join',id:host.data.id}),post({action:'join',id:host.data.id})]);assert.deepEqual(joinResults.map(x=>x.status).sort(),[200,409]);const guest=joinResults.find(x=>x.status===200);
const forged=await post({action:'move',id:host.data.id,token:'0'.repeat(32),revision:0,from:'e2',to:'e4'});assert.equal(forged.status,403);
const illegal=await post({action:'move',id:host.data.id,token:host.data.token,revision:0,from:'e2',to:'e5'});assert.equal(illegal.status,400);
const turn=await post({action:'move',id:host.data.id,token:guest.data.token,revision:0,from:'e7',to:'e5'});assert.equal(turn.status,409);
let revision=0;
for(const [from,to] of [['f2','f3'],['e7','e5'],['g2','g4'],['d8','h4']]){const player=revision%2===0?host:guest;const r=await post({action:'move',id:host.data.id,token:player.data.token,revision,from,to});assert.equal(r.status,200,JSON.stringify(r.data));revision=r.data.revision;}
const over=await post({action:'move',id:host.data.id,token:host.data.token,revision,from:'a2',to:'a3'});assert.equal(over.status,409);
const state=await(await fetch(root+'/api/rooms?id='+host.data.id)).json();assert.equal(state.moves.length,4);assert.equal(state.hostToken,undefined);assert.equal(state.guestToken,undefined);
console.log('PASS: page HTTP 200, concurrent joins, invalid token, illegal move, wrong turn, legal game, checkmate lock, token privacy');
