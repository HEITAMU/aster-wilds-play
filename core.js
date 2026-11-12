/* Aster Wilds — portable deterministic game model, no DOM / wx dependencies. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.AsterCore=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const COLS=6,ROWS=7;
const SKILLS=[
 {id:'heal',name:'生息',label:'回血',icon:'heart',cost:4,value:2,summary:'恢复 2 生命',detail:'恢复最多 2 点生命，不超过生命上限。',tip:'受伤后使用；满生命时不可使用。'},
 {id:'shield',name:'护壳',label:'护盾',icon:'shield',cost:3,value:2,summary:'抵挡 2 伤害',detail:'增加 2 点护盾，受伤时先扣护盾。',tip:'危险落点前使用。护盾可叠加，耗尽或本次远征结束后消失。'},
 {id:'freeze',name:'静滞',label:'停攻',icon:'snow',cost:5,value:2,summary:'持续 2 回合',detail:'接下来 2 次斩击后，所有敌人都不会攻击。',tip:'敌人仍会苏醒。重复使用会重置为 2 回合，不累加。'},
 {id:'prism',name:'折光',label:'换色',icon:'prism',cost:4,value:1,summary:'生成星核',detail:'将身边一格变成星核。经过星核后，可接另一种颜色，并获得 2 点破甲力。',tip:'需要换色延长路线、或增加破甲力时使用。'}
];
const BIOMES=[
 {name:'荧芽林地',sub:'3 色生物 · 星核',color:'#92c4a6',rule:'8 连生成星核',colors:3},
 {name:'赤潮珊庭',sub:'4 色生物 · 装甲',color:'#e79b7c',rule:'四种生命 · 装甲出现',colors:4},
 {name:'月霜荒原',sub:'4 色生物 · 冷冻护甲',color:'#a3c4db',rule:'冷冻护甲 · 蓄力破壳',colors:4},
 {name:'琥珀湿地',sub:'4 色生物 · 远程喷射',color:'#dfb96d',rule:'远程喷射 · 先读预警',colors:4},
 {name:'幽紫裂隙',sub:'4 色生物 · 岩壳障碍',color:'#c1a1d8',rule:'岩壳阻路 · 星核增多',colors:4},
 {name:'星心花园',sub:'4 色生物 · 高护甲守卫',color:'#cbd890',rule:'古老守卫 · 高额采集',colors:4}
];
const RELICS=[
 {id:'seed',name:'初芽吊坠',desc:'所有芽素收入 +10%',cost:0,icon:0},
 {id:'fang',name:'珊骨刀鞘',desc:'连线破甲力 +2',cost:8,icon:1},
 {id:'shell',name:'月蜗护壳',desc:'每次远征首次伤害 -1',cost:12,icon:2},
 {id:'lantern',name:'星灯瓶',desc:'六连即可生成星核',cost:18,icon:9},
 {id:'hour',name:'琥珀沙漏',desc:'营地产能 +25%',cost:22,icon:3},
 {id:'root',name:'共生根结',desc:'长链芽素收益额外 +25%',cost:26,icon:0},
 {id:'heart',name:'星心标本',desc:'生命上限 +1',cost:30,icon:10},
 {id:'echo',name:'回响棱镜',desc:'星核收集星尘 +1',cost:36,icon:9}
];
const RESEARCH=[
 {id:'yield',name:'细胞萃取',desc:'每级战斗芽素 +12%',base:100,max:8},
 {id:'edge',name:'共振刃',desc:'每级破甲力 +1',base:90,max:6},
 {id:'vitality',name:'生命适应',desc:'每两级生命上限 +1',base:120,max:6},
 {id:'storage',name:'生态仓储',desc:'每级离线容量 +2 小时',base:80,max:4},
 {id:'symbiosis',name:'共生网络',desc:'每级营地产能 +15%',base:130,max:8},
 {id:'focus',name:'神经回路',desc:'每级开局能量 +1',base:100,max:5}
];
const BUILDINGS=[{id:'garden',name:'荧芽培养皿',desc:'基础产能 +12 / 时',base:60,rate:12,icon:0},{id:'hatchery',name:'共生孵化巢',desc:'基础产能 +20 / 时',base:120,rate:20,icon:10},{id:'reactor',name:'星核共振器',desc:'每级总产能 +18%',base:200,rate:0,icon:9}];
const SPECIES=[{name:'荧芽团',note:'绿色生物。同色相连；苏醒后攻击相邻落点。'},{name:'赤珊蟹',note:'珊红色生物。同色相连；苏醒后攻击相邻落点。'},{name:'月翼蛾',note:'紫色生物。同色相连；苏醒后攻击相邻落点。'},{name:'蜜琥蜥',note:'黄色生物。同色相连；苏醒后攻击相邻落点。'},{name:'荆甲虫',note:'需要先积累连线破甲力，再穿过它。'},{name:'角珊卫',note:'珊红色装甲生物。连线破甲力达到标记数值后可连接。'},{name:'霜翼鸮',note:'紫色装甲生物。连线破甲力达到标记数值后可连接。'},{name:'琥晶兽',note:'黄色装甲生物。连线破甲力达到标记数值后可连接。'},{name:'星冠守卫',note:'每片区域的守门者。积累长链击破它的护甲。'}];
function rng(seed){let s=seed>>>0;const next=()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};next.state=()=>s>>>0;return next;}
function fresh(now=Date.now()){return {version:1,coins:100,dust:4,stage:1,cleared:[],stars:{},rank:0,build:{garden:1,hatchery:0,reactor:0},research:{yield:0,edge:0,vitality:0,storage:0,symbiosis:0,focus:0},relics:['seed'],equip:['seed'],codex:Array(9).fill(0),kills:0,best:0,bank:0,last:now,daily:{date:'',best:0,claimed:false},quests:[],tutorial:true,sound:true};}
function hydrate(raw,now=Date.now()){let s=fresh(now);if(!raw||raw.version!==1)return s;for(const k of ['coins','dust','stage','rank','kills','best','bank','last'])if(Number.isFinite(raw[k]))s[k]=Math.max(0,raw[k]);s.stage=Math.min(36,Math.max(1,s.stage|0));s.rank=Math.min(20,s.rank|0);for(let k in s.build)s.build[k]=Math.min(20,Math.max(0,(raw.build||{})[k]|0));for(let d of RESEARCH)s.research[d.id]=Math.min(d.max,Math.max(0,(raw.research||{})[d.id]|0));s.cleared=Array.isArray(raw.cleared)?[...new Set(raw.cleared.filter(n=>n>=1&&n<=36))]:[];s.stars=raw.stars&&typeof raw.stars==='object'?raw.stars:{};s.relics=Array.isArray(raw.relics)?RELICS.map(r=>r.id).filter(id=>raw.relics.includes(id)):['seed'];if(!s.relics.includes('seed'))s.relics.push('seed');s.equip=Array.isArray(raw.equip)?[...new Set(raw.equip.filter(x=>s.relics.includes(x)))].slice(0,3):['seed'];s.codex=Array.isArray(raw.codex)?Array.from({length:9},(_,i)=>Math.max(0,raw.codex[i]|0)):s.codex;s.quests=Array.isArray(raw.quests)?raw.quests:[];if(raw.daily&&typeof raw.daily.date==='string')s.daily=raw.daily;s.tutorial=raw.tutorial!==false;s.sound=raw.sound!==false;s.activeRun=raw.activeRun||null;s.view=['battle','camp','map','book'].includes(raw.view)?raw.view:'battle';return s;}
function has(s,id){return s.equip.includes(id);}
function rate(s){return (s.build.garden*12+s.build.hatchery*20)*(1+s.build.reactor*.18)*(1+s.research.symbiosis*.15)*(1+s.rank*.25)*(has(s,'hour')?1.25:1)*(has(s,'seed')?1.1:1);}
function cap(s){return rate(s)*(8+s.research.storage*2);}
function accrue(s,now=Date.now()){let seconds=Math.max(0,Math.min((now-s.last)/1000,(8+s.research.storage*2)*3600));s.bank=Math.min(cap(s),s.bank+rate(s)*seconds/3600);s.last=Math.max(s.last,now);return s.bank;}
function collect(s,now=Date.now()){accrue(s,now);let n=Math.floor(s.bank);s.bank-=n;s.coins+=n;return n;}
function buildCost(s,id){let b=BUILDINGS.find(x=>x.id===id);return b?Math.floor(b.base*Math.pow(1.55,s.build[id])):Infinity;}
function upgrade(s,id,now=Date.now()){if(!BUILDINGS.some(b=>b.id===id)||s.build[id]>=20)return false;let cost=buildCost(s,id);if(s.coins<cost)return false;accrue(s,now);s.coins-=cost;s.build[id]++;return true;}
function researchCost(s,id){let r=RESEARCH.find(x=>x.id===id);return r?Math.floor(r.base*Math.pow(1.7,s.research[id])):Infinity;}
function research(s,id,now=Date.now()){let r=RESEARCH.find(x=>x.id===id);if(!r||s.research[id]>=r.max||s.coins<researchCost(s,id))return false;accrue(s,now);s.coins-=researchCost(s,id);s.research[id]++;return true;}
function buyRelic(s,id){let r=RELICS.find(x=>x.id===id);if(!r||s.relics.includes(id)||s.dust<r.cost)return false;s.dust-=r.cost;s.relics.push(id);return true;}
function equip(s,id,now=Date.now()){if(!s.relics.includes(id))return false;accrue(s,now);if(s.equip.includes(id))s.equip=s.equip.filter(x=>x!==id);else{if(s.equip.length>=3)return false;s.equip.push(id);}return true;}
function maxHp(s){return 5+Math.floor(s.research.vitality/2)+(has(s,'heart')?1:0);}
function stageInfo(n){let b=Math.min(5,Math.floor((n-1)/6));let slot=(n-1)%6;return {n,biome:b,slot,name:['初见','寻光','异动','蜕壳','深行','守卫'][slot],quota:12+b*4+slot*3,boss:slot===5,colors:BIOMES[b].colors,armor:4+Math.floor(b/2),reward:45+n*8};}
function neighbors(a,b){return a!==b&&Math.abs(a%COLS-b%COLS)<=1&&Math.abs(Math.floor(a/COLS)-Math.floor(b/COLS))<=1;}
function dist(a,b){return Math.max(Math.abs(a%COLS-b%COLS),Math.abs(Math.floor(a/COLS)-Math.floor(b/COLS)));}
class Run{
 constructor(s,n,seed,mode='story'){this.s=s;this.info=stageInfo(n);this.mode=mode;this.random=rng(seed);this.seed=seed;this.hp=maxHp(s);this.maxHp=this.hp;this.energy=3+s.research.focus;this.turn=0;this.kills=0;this.best=0;this.bag=0;this.dust=0;this.hero=38;this.exit=3;this.path=[];this.shield=0;this.firstShield=has(s,'shell')?1:0;this.bossDead=!this.info.boss;this.done=false;this.result=null;this.tiles=Array(42).fill(null);this.frozen=0;this.hint=[];this.sessionStats={crystals:0,armors:0};for(let i=0;i<42;i++)if(i!==this.hero&&i!==this.exit)this.tiles[i]=this.spawn(i);if(n===1){for(let i of [31,32,25,24,18,19,13,12])this.tiles[i]={kind:'creature',color:0,age:0,wake:7,armor:0};this.tiles[20]={kind:'crystal',color:-1,age:0,wake:99,armor:0};}if(this.info.boss)this.tiles[9]={kind:'boss',color:-1,age:0,wake:3,armor:8+Math.floor(this.info.biome/2)};this.ensureMoves();}
 snapshot(){let o={n:this.info.n,seed:this.seed,mode:this.mode,rng:this.random.state(),tiles:this.tiles,path:this.path,sessionStats:this.sessionStats};for(let k of ['hp','maxHp','energy','turn','kills','best','bag','dust','hero','shield','firstShield','bossDead','done','result','frozen'])o[k]=this[k];return JSON.parse(JSON.stringify(o));}
 static restore(s,o){if(!o||!Number.isInteger(o.n)||o.n<1||o.n>36||!Array.isArray(o.tiles)||o.tiles.length!==42)return null;try{let r=new Run(s,o.n,o.seed,o.mode==='daily'?'daily':'story');for(let k of ['hp','maxHp','energy','turn','kills','best','bag','dust','hero','shield','firstShield','frozen']){if(!Number.isFinite(o[k])||o[k]<0)return null;r[k]=o[k];}if(r.hero>41||r.hero%1||r.hp>r.maxHp||r.energy>12)return null;r.bossDead=!!o.bossDead;r.done=!!o.done;r.result=o.result||null;r.tiles=JSON.parse(JSON.stringify(o.tiles));if(r.tiles.some(t=>t&&(!['creature','armor','spitter','boss','rock','crystal'].includes(t.kind)||!Number.isFinite(t.age)||!Number.isFinite(t.armor))))return null;r.sessionStats=o.sessionStats||{crystals:0,armors:0};r.random=rng(o.rng);r.path=Array.isArray(o.path)&&r.validPath(o.path).ok?o.path:[];return r;}catch(e){return null;}}
 spawn(i){let color=Math.floor(this.random()*this.info.colors),v=this.random(),kind='creature',armor=0;let b=this.info.biome;if(v<(b>=4?.08:.035)){kind='crystal';color=-1;}else if(b>=4&&v<.13){kind='rock';armor=4;}else if(this.info.n>=4&&v<.22){kind='armor';armor=this.info.armor+(b===2?1:0);}else if(b>=3&&v<.32){kind='spitter';}return {kind,color,armor,age:0,wake:4+Math.floor(this.random()*3),phase:this.random()*6.28};}
 ready(){return this.kills>=this.info.quota&&this.bossDead;}
 basePower(){return this.s.research.edge+(has(this.s,'fang')?2:0);}
 validPath(path){let prev=this.hero,color=-1,power=this.basePower(),kills=0,crystals=0,armors=0;for(let j=0;j<path.length;j++){let i=path[j];if(!Number.isInteger(i)||i<0||i>=42||!neighbors(prev,i)||path.indexOf(i)!==j)return {ok:false,reason:'只能连接相邻且未经过的格子'};if(i===this.exit){if(!this.ready()||j!==path.length-1)return {ok:false,reason:'完成目标后才能进入出口'};prev=i;continue;}let t=this.tiles[i];if(!t)return {ok:false,reason:'这里没有可连接的生命'};if(t.kind==='crystal'){color=-1;crystals++;power+=2;}else if(t.kind==='boss'||t.kind==='rock'){if(power<t.armor)return {ok:false,reason:'先积累 '+t.armor+' 点破甲力'};color=-1;if(t.kind==='boss')kills++;}else{if(color!==-1&&color!==t.color)return {ok:false,reason:'同色相连，经过星核可以换色'};if(t.armor>power)return {ok:false,reason:'先积累 '+t.armor+' 点破甲力'};color=t.color;power++;kills++;if(t.armor)armors++;}prev=i;}return {ok:true,kills,crystals,armors,power,end:prev,color};}
 add(i){if(i===this.hero){this.path=[];return true;}if(this.path.includes(i)){this.path=this.path.slice(0,this.path.indexOf(i)+1);return true;}let r=this.validPath([...this.path,i]);if(r.ok){this.path.push(i);return true;}return false;}
 preview(){let r=this.validPath(this.path);if(!r.ok)return r;let exiting=r.end===this.exit;let enough=r.kills>=3||r.crystals>0||exiting;r.commit=enough;r.damage=exiting?0:this.predictDamage(r.end,new Set(this.path));r.reward=this.reward(r.kills);return r;}
 reward(k){return Math.floor(k*4*(1+Math.max(0,k-3)*.075)*(1+this.s.research.yield*.12)*(1+this.s.rank*.25)*(has(this.s,'seed')?1.1:1)*(has(this.s,'root')&&k>=8?1.25:1));}
 danger(t,i,hero,ageOffset=0){if(!t||!['creature','armor','spitter','boss'].includes(t.kind)||t.age+ageOffset<t.wake)return false;return dist(i,hero)<=(t.kind==='spitter'?2:1);}
 predictDamage(hero,removed){if(this.frozen)return 0;let damage=0;this.tiles.forEach((t,i)=>{if(!removed.has(i)&&this.danger(t,i,hero,1))damage++;});return Math.max(0,Math.min(2,damage)-this.shield-this.firstShield);}
 commit(){if(this.done)return null;let p=this.preview();if(!p.ok||!p.commit)return null;let route=[...this.path],old=this.hero,events=[];for(let i of route){let t=this.tiles[i];if(t){events.push({index:i,tile:{...t}});if(t.kind==='boss'){this.bossDead=true;this.s.codex[8]++;this.dust+=4;}else if(t.kind==='crystal'){this.dust+=1+(has(this.s,'echo')?1:0);this.sessionStats.crystals++;}else if(t.kind!=='rock'){this.s.codex[t.armor?4+t.color:t.color]++;if(t.armor)this.sessionStats.armors++;}this.tiles[i]=null;}}
 this.kills+=p.kills;this.s.kills+=p.kills;this.best=Math.max(this.best,p.kills);this.s.best=Math.max(this.s.best,p.kills);let gained=this.reward(p.kills);this.bag+=gained;this.energy=Math.min(12,this.energy+Math.max(1,Math.floor(p.kills/4)));this.turn++;this.hero=p.end;this.path=[];this.hint=[];
 if(this.hero===this.exit){return {route,events,gained,damage:0,finished:this.finish(true)};}
 let raw=0;this.tiles.forEach((t,i)=>{if(t){t.age++;if(!this.frozen&&this.danger(t,i,this.hero))raw++;}});raw=Math.min(2,raw);let absorbed=Math.min(raw,this.shield);this.shield-=absorbed;raw-=absorbed;if(raw&&this.firstShield){raw--;this.firstShield=0;}let damage=raw;this.hp-=damage;if(this.frozen)this.frozen--;
 if(this.hp<=0){return {route,events,gained,damage,finished:this.finish(false)};}
 for(let i=0;i<42;i++)if(i!==this.hero&&i!==this.exit&&!this.tiles[i])this.tiles[i]=this.spawn(i);
 if(p.kills>=(has(this.s,'lantern')?6:8)){let at=old===this.exit?route[0]:old;if(at!==this.hero&&at!==this.exit)this.tiles[at]={kind:'crystal',color:-1,age:0,wake:99,armor:0};this.dust+=Math.floor(p.kills/8);}
 this.ensureMoves();return {route,events,gained,damage,finished:null};}
 finish(win){if(this.done)return this.result;this.done=true;let n=this.info.n,first=!this.s.cleared.includes(n),stars=win?1+(this.hp>=3?1:0)+(this.best>=8?1:0):0;let coins=Math.floor(this.bag*(win?1:.6))+(win?this.info.reward:0),dust=this.dust+(win?2:0);if(this.mode==='daily'){let today=dayKey();if(this.s.daily.date!==today)this.s.daily={date:today,best:0,claimed:false};this.s.daily.best=Math.max(this.s.daily.best,this.kills);if(win&&!this.s.daily.claimed){coins+=120;dust+=8;this.s.daily.claimed=true;}}else if(win){if(first)this.s.cleared.push(n);this.s.stage=Math.min(36,Math.max(this.s.stage,n+1));this.s.stars[n]=Math.max(this.s.stars[n]||0,stars);if(first)dust+=3;}
 this.s.coins+=coins;this.s.dust+=dust;this.result={win,coins,dust,stars,first,turns:this.turn,best:this.best,kills:this.kills};return this.result;}
 skillInfo(id){
  const def=SKILLS.find(s=>s.id===id);
  if(!def)return {ok:false,reason:'未知技能'};
  const amount=id==='heal'?Math.min(def.value,this.maxHp-this.hp):def.value;
  const target=id==='prism'?this.tiles.findIndex((t,i)=>t&&neighbors(this.hero,i)&&!['boss','crystal'].includes(t.kind)):-1;
  const reason=this.done?'远征已结束':id==='heal'&&!amount?'生命已满':id==='prism'&&target<0?'身边没有可转换的格子':this.energy<def.cost?'还差 '+(def.cost-this.energy)+' 能量':'';
  return {...def,ok:!reason,reason,amount,target};
 }
 skill(id){
  const v=this.skillInfo(id);
  if(!v.ok)return {ok:false,msg:v.reason};
  this.energy-=v.cost;
  let msg='';
  if(id==='heal'){this.hp+=v.amount;msg='生命 +'+v.amount+' · '+this.hp+' / '+this.maxHp;}
  if(id==='shield'){this.shield+=v.amount;msg='护盾 +'+v.amount+' · 可抵挡 '+this.shield+' 点伤害';}
  if(id==='freeze'){this.frozen=v.amount;msg='停攻生效 · 接下来 '+v.amount+' 回合';}
  if(id==='prism'){this.tiles[v.target]={kind:'crystal',color:-1,age:0,wake:99,armor:0};this.path=[];this.hint=[];msg='星核已生成 · 经过它可换色';}
  return {ok:true,id,cost:v.cost,amount:v.amount,target:v.target,msg};
 }
 findPath(maxLen=10){let best=[],visits=0;let walk=(path)=>{if(++visits>15000)return;let v=this.validPath(path);if(!v.ok)return;let bv=this.validPath(best);if((v.end===this.exit&&bv.end!==this.exit)||(bv.end!==this.exit&&v.kills>bv.kills))best=[...path];if(path.length>=maxLen||v.end===this.exit)return;for(let i=0;i<42;i++)if(neighbors(v.end,i)&&!path.includes(i)&&i!==this.hero)walk([...path,i]);};walk([]);return best;}
 ensureMoves(){let best=this.findPath(5);if(this.validPath(best).kills>=3||best.includes(this.exit))return false;let color=Math.floor(this.random()*this.info.colors),path=[];let cur=this.hero;for(let step=0;step<5;step++){let next=Array.from({length:42},(_,i)=>i).find(i=>neighbors(cur,i)&&i!==this.hero&&i!==this.exit&&!path.includes(i)&&(!this.tiles[i]||this.tiles[i].kind!=='boss'));if(next===undefined)break;path.push(next);this.tiles[next]={kind:'creature',color,armor:0,age:0,wake:6};cur=next;}return true;}
}
function dayKey(now=Date.now()){return new Date(now+8*3600000).toISOString().slice(0,10);}
function daySeed(now=Date.now()){return parseInt(dayKey(now).replace(/-/g,''),10);}
function ascend(s,now=Date.now()){if(s.cleared.length<12||s.rank>=20)return false;accrue(s,now);s.rank++;s.stage=1;s.cleared=[];s.stars={};s.build={garden:1,hatchery:0,reactor:0};s.coins=100;s.bank=0;s.last=now;return true;}
const QUESTS=[{id:'k30',name:'第一次相遇',desc:'累计击败 30 个生物',target:30,value:s=>s.kills,coins:80,dust:2},{id:'chain8',name:'连锁反应',desc:'完成一次 8 连击',target:8,value:s=>s.best,coins:100,dust:4},{id:'c3',name:'开拓者',desc:'完成 3 个不同关卡',target:3,value:s=>s.cleared.length,coins:150,dust:5},{id:'rate100',name:'自循环生态',desc:'营地产能达到 100 / 小时',target:100,value:s=>rate(s),coins:200,dust:8},{id:'k300',name:'自然观察家',desc:'累计击败 300 个生物',target:300,value:s=>s.kills,coins:300,dust:10},{id:'c12',name:'星际先驱',desc:'完成 12 个不同关卡',target:12,value:s=>s.cleared.length,coins:400,dust:15}];
function claim(s,id){let q=QUESTS.find(x=>x.id===id);if(!q||s.quests.includes(id)||q.value(s)<q.target)return false;s.quests.push(id);s.coins+=q.coins;s.dust+=q.dust;return true;}
return {COLS,ROWS,BIOMES,RELICS,RESEARCH,BUILDINGS,SPECIES,QUESTS,SKILLS,Run,rng,fresh,hydrate,has,rate,cap,accrue,collect,buildCost,upgrade,researchCost,research,buyRelic,equip,maxHp,stageInfo,neighbors,dist,dayKey,daySeed,ascend,claim};
});
