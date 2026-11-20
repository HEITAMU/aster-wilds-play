const assert=require('node:assert/strict');
const {test}=require('node:test');
const {EchoRun,dayKey,seedFromDay,RNG}=require('../dist-test/Core.js');
const INPUT={target:{x:0,y:0},dash:false,overdrive:false};
test('day boundary is UTC+8',()=>{
 assert.equal(dayKey(Date.UTC(2026,10,20,15,59,59)),'20261120');
 assert.equal(dayKey(Date.UTC(2026,10,20,16,0,0)),'20261121');
});
test('seeded PRNG identical runs',()=>{
 const a=new RNG(seedFromDay('20261120')),b=new RNG(seedFromDay('20261120'));
 for(let i=0;i<100;i++)assert.equal(a.next(),b.next());
});
test('daily runs start identically',()=>{
 const a=new EchoRun('20261120'),b=new EchoRun('20261120');
 assert.deepEqual(a.shards,b.shards);
 for(let i=0;i<240;i++){a.step(1/60,INPUT);b.step(1/60,INPUT);}
 assert.deepEqual(a.summary(),b.summary());
 assert.deepEqual(a.hunters,b.hunters);
});
test('echo begins only after 8 seconds',()=>{
 const a=new EchoRun('20261120');
 for(let i=0;i<60*7;i++)a.step(1/60,{...INPUT,target:{x:220,y:90}});
 assert.equal(a.echo,null);
 for(let i=0;i<75;i++)a.step(1/60,INPUT);
 assert.ok(a.echo && Math.abs(a.echo.x)<200);
});
test('dash is unavailable until cooldown and clamps bounds',()=>{
 const a=new EchoRun('20261120');
 a.step(1/60,{target:{x:300,y:0},dash:true,overdrive:false});
 assert.equal(a.dashReady,false);
 assert.equal(a.dashCooldown>6.9,true);
 for(let i=0;i<90;i++)a.step(1/60,{target:{x:500,y:0},dash:false,overdrive:false});
 assert.ok(a.player.x<=306);
});
test('overdrive cannot activate without energy',()=>{
 const a=new EchoRun('20261120');
 a.step(1/60,{...INPUT,overdrive:true});
 assert.equal(a.overdriveTime,0);
 a.energy=100;a.step(1/60,{...INPUT,overdrive:true});
 assert.ok(a.overdriveTime>8.9);
 assert.equal(a.energy,0);
});
test('score increment, waves and round length',()=>{
 const a=new EchoRun('20261120');
 const shard=a.shards[0];
 a.player={x:shard.x,y:shard.y};a.step(1/60,{...INPUT,target:{x:shard.x,y:shard.y}});
 assert.ok(a.score>0);
 const b=new EchoRun('20261120');b.invulnerable=999;
 for(let i=0;i<75*60;i++)b.step(1/60,INPUT);
 assert.equal(b.finished,true); assert.ok(b.time<=75.02);
});
