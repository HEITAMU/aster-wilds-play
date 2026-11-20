import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const a=JSON.parse(fs.readFileSync(path.join(base,'assets/scene/Entry.scene'),'utf8'));
const meta=JSON.parse(fs.readFileSync(path.join(base,'assets/scene/Entry.scene.meta'),'utf8'));
const boot=JSON.parse(fs.readFileSync(path.join(base,'assets/scripts/Boot.ts.meta'),'utf8'));
const compress=u=>{const s=u.replace(/-/g,'');const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';return s.slice(0,5)+Array.from({length:9},(_,i)=>{const n=parseInt(s.slice(5+i*3,8+i*3),16);return chars[n>>6]+chars[n&63];}).join('');};
if(a[0].__type__!=='cc.SceneAsset'||a[1].__type__!=='cc.Scene')throw Error('invalid scene root');
if(a[1]._id!==meta.uuid)throw Error('scene uuid mismatch');
if(!a.some(x=>x.__type__===compress(boot.uuid)))throw Error('bootstrap script classId mismatch');
for(const [n,obj] of a.entries()){
 for(const value of Object.values(obj)){
  if(value&&typeof value==='object'&&Object.keys(value).length===1&&value.__id__!==undefined){
   if(value.__id__>=a.length||value.__id__<0)throw Error(`invalid scene reference ${n}`);
  }
 }
}
for(const name of ['court_loop','button','parry','perfect','hurt','bank','jewel','end']){
 if(!fs.statSync(path.join(base,'assets/resources/audio',name+'.mp3')).size)throw Error('missing sound '+name);
}
if(!fs.readFileSync(path.join(base,'wechat/openDataContext/index.js'),'utf8').includes('wx.getFriendCloudStorage'))throw Error('missing friend cloud');
if(!fs.readFileSync(path.join(base,'assets/scripts/WeChatBridge.ts'),'utf8').includes('setUserCloudStorage'))throw Error('missing score upload');
// Offline type-check uses a deliberately permissive engine stub; this does NOT replace an editor build.
execFileSync('tsc',['-p','tests/tsconfig.stub.json'],{cwd:base,stdio:'inherit'});
console.log('PASS: scene IDs, Cocos boot binding, audio, social wiring, TypeScript syntax');
