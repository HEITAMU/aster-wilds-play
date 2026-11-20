const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const get=p=>fs.readFileSync(path.join(root,p),'utf8');
const scene=JSON.parse(get('assets/scenes/Main.scene'));
const meta=JSON.parse(get('assets/scripts/Main.ts.meta'));
const sceneMeta=JSON.parse(get('assets/scenes/Main.scene.meta'));
const compress=s=>{const abc='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
 const hex=s.replace(/-/g,'');let ret=hex.slice(0,5);
 for(let i=5;i<hex.length;i+=3){const n=[...hex.slice(i,i+3)].map(c=>parseInt(c,16));ret+=abc[(n[0]<<2)|(n[1]>>2)]+abc[((n[1]&3)<<4)|n[2]];}
 return ret;};
assert.equal(scene[0].__type__,'cc.SceneAsset');
assert.equal(scene[1].__type__,'cc.Scene');
assert.equal(scene[1]._id,sceneMeta.uuid);
assert.equal(scene[7].__type__,compress(meta.uuid));
assert.equal(scene[6]._cameraComponent.__id__,4);
assert.equal(scene[2]._components.length,3);
assert.ok(get('assets/scripts/Platform.ts').includes('wx.setUserCloudStorage'));
assert.ok(get('build-templates/wechatgame/openDataContext/index.js').includes('wx.getFriendCloudStorage'));
assert.ok(get('assets/scripts/Platform.ts').includes('result?.isEnded===true'));
const assets=['hero','hero-ember','hero-stellar','hunter','hunter-elite','shard','shard-gold','pad'].map(n=>`assets/resources/art/${n}.png`)
 .concat(['collect','gold','damage','dash','pair','tap','music'].map(n=>`assets/resources/audio/${n}.wav`));
for(const f of assets)assert.ok(fs.existsSync(path.join(root,f)),`missing ${f}; run: npm run bootstrap`);
console.log('Structural checks passed:',scene.length,'scene records and',assets.length,'generated media files.');
