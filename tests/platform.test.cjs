const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PlatformBridge,PLATFORM_CONFIG}=require('../dist-test/Platform.js');
function mockWx(override={}){
 let closeCb=null;
 const writes=[],shares=[],msgs=[];
 const wx={
  getLaunchOptionsSync:()=>({query:{day:'20261120',target:'2800'}}),
  shareAppMessage:o=>shares.push(o),
  getOpenDataContext:()=>({postMessage:message=>msgs.push(message)}),
  setUserCloudStorage:o=>writes.push(o.KVDataList),
  createRewardedVideoAd:()=>({onClose:fn=>{closeCb=fn;},offClose:()=>{},show:async()=>{}}),
  ...override,
 };
 globalThis.wx=wx;
 return {writes,shares,msgs,close:(data)=>closeCb?.(data)};
}
test('share contains daily challenge but does not grant items',()=>{
 const testWx=mockWx();const p=new PlatformBridge();
 assert.deepEqual(p.getChallenge(),{day:'20261120',target:2800});
 assert.equal(p.share('20261120',2800),true);
 assert.match(testWx.shares[0].query,/day=20261120&target=2800/);
 assert.equal(testWx.writes.length,0);
 delete globalThis.wx;
});
test('friend score write is limited to own cloud storage',()=>{
 const testWx=mockWx();const p=new PlatformBridge();p.saveFriendScore('20261120',3421);
 assert.deepEqual(testWx.writes[0],[{key:'echo_daily_day',value:'20261120'},{key:'echo_daily_score',value:'3421'}]);
 PLATFORM_CONFIG.privacyFriendRelationDeclared=true;
 p.showRanking('20261120');assert.deepEqual(testWx.msgs[0],{type:'echo-rank',day:'20261120',mode:'daily'});
 PLATFORM_CONFIG.privacyFriendRelationDeclared=false;delete globalThis.wx;
});
test('ad unavailable when not configured',async()=>{
 mockWx();PLATFORM_CONFIG.rewardedAdUnitId='';
 const p=new PlatformBridge();assert.equal(p.adsConfigured,false);
 assert.equal(await p.rewardedCosmetic(),false);delete globalThis.wx;
});
test('reward only resolves true on full watch and false on early close',async()=>{
 const w=mockWx();PLATFORM_CONFIG.rewardedAdUnitId='adunit-test-only';
 const p=new PlatformBridge();
 const early=p.rewardedCosmetic();await Promise.resolve();w.close({isEnded:false});
 assert.equal(await early,false);
 const full=p.rewardedCosmetic();await Promise.resolve();w.close({isEnded:true});w.close({isEnded:true});
 assert.equal(await full,true);
 PLATFORM_CONFIG.rewardedAdUnitId='';delete globalThis.wx;
});
