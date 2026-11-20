import {
  _decorator, Component, Color, EventTouch, Graphics, Input, input, KeyCode, EventKeyboard,
  Label, Node, Sprite, SpriteFrame, SubContextView, UITransform, Vec3, resources, game,
} from 'cc';
import { EchoRun, ROUND_SECONDS, dayKey, MIN_X, MAX_X, MIN_Y, MAX_Y, Vec, EchoEvent } from './Core';
import { PlatformBridge } from './Platform';
import { Sound } from './Sound';
const {ccclass}= _decorator;

type Screen='menu'|'run'|'result'|'ranking'|'skins'|'paused';
type Paint={name:string; title:string; color:Color; cost:number; asset:string};
interface Pop {x:number;y:number;t:number;max:number;name:string;label:Label}
interface Burst {x:number;y:number;vx:number;vy:number;t:number;life:number;rgb:Color}
const C={
  navy:new Color(7,17,31,255), panel:new Color(13,35,52,245), panel2:new Color(20,51,69,240),
  pale:new Color(223,244,247,255), muted:new Color(135,167,181,255),
  aqua:new Color(100,241,216,255), gold:new Color(255,207,115,255),
  coral:new Color(255,112,124,255), blue:new Color(89,169,242,255),
  glow:new Color(46,172,183,70), white:new Color(255,255,255,255),
};
const PAINTS:Paint[]=[
  {name:'tidal',title:'碧潮 · 初始涂装',color:C.aqua,cost:0,asset:'hero'},
  {name:'ember',title:'赤焰 · 熔核涂装',color:C.coral,cost:480,asset:'hero-ember'},
  {name:'stellar',title:'星银 · 极光涂装',color:C.gold,cost:1380,asset:'hero-stellar'},
];
const uiClamp=(a:number,min:number,max:number)=>Math.max(min,Math.min(max,a));
const fmt=(v:number)=>Math.floor(Math.max(0,v)).toLocaleString('en-US');
@ccclass('EchoArenaMain')
export class EchoArenaMain extends Component {
  private graphics!:Graphics;
  private labels:Record<string,Label>={};
  private screen:Screen='menu';
  private run:EchoRun|null=null;
  private platform=new PlatformBridge();
  private sound!:Sound;
  private pointer:Vec={x:0,y:0};
  private pendingDash=false;
  private pendingOverdrive=false;
  private tickBalance=0;
  private currentDay=dayKey();
  private dailyBest=0;
  private allBest=0;
  private coins=0;
  private attempts=0;
  private skins=['tidal'];
  private equipped='tidal';
  private toastText='';
  private toastTimer=0;
  private pops:Pop[]=[];
  private sparkles:Burst[]=[];
  private art:Record<string,SpriteFrame>={};
  private hero:Sprite|null=null;
  private echoSprite:Sprite|null=null;
  private shardSprites:Sprite[]=[];
  private hunterSprites:Sprite[]=[];
  private pairSprites:Sprite[]=[];
  private artLayer!:Node;
  private rankNode:Node|null=null;
  private rankUnavailable='微信好友榜仅在微信真机环境显示';
  private lastBannerMode='';
  private incomingTarget:number|null=null;
  private incomingDay='';
  private firstRun=true;
  private clock=0;
  private hudClock=0;
  private settling=false;
  private keyHeld=new Set<KeyCode>();
  private suspended=false;

  onLoad(){
    const gNode=new Node('VectorUI');gNode.parent=this.node;
    gNode.addComponent(UITransform).setContentSize(750,1334);
    gNode.layer=this.node.layer;
    this.graphics=gNode.addComponent(Graphics);
    this.artLayer=new Node('Actors');this.artLayer.parent=this.node;
    this.artLayer.layer=this.node.layer;
    const audioHost=new Node('Audio');audioHost.parent=this.node;this.sound=new Sound(audioHost);
    this.sound.load();
    this.loadArt();
    this.createLabels();
    this.node.on(Node.EventType.TOUCH_START,this.onTouchStart,this);
    this.node.on(Node.EventType.TOUCH_MOVE,this.onTouchMove,this);
    this.node.on(Node.EventType.TOUCH_END,this.onTouchEnd,this);
    this.node.on(Node.EventType.TOUCH_CANCEL,this.onTouchEnd,this);
    input.on(Input.EventType.KEY_DOWN,this.onKeyDown,this);
    input.on(Input.EventType.KEY_UP,this.onKeyUp,this);
    game.on(game.EVENT_HIDE,this.onHide,this);
    this.platform.init();
    this.platform.onAdError((msg)=>this.toast(msg,4));
    this.loadSave();this.setBanner(false);
    const ch=this.platform.getChallenge();
    if(ch.day && ch.target!==null){this.incomingDay=ch.day;this.incomingTarget=ch.target;}
    this.repaint();
  }
  onDestroy(){
    this.node.off(Node.EventType.TOUCH_START,this.onTouchStart,this);
    this.node.off(Node.EventType.TOUCH_MOVE,this.onTouchMove,this);
    this.node.off(Node.EventType.TOUCH_END,this.onTouchEnd,this);
    this.node.off(Node.EventType.TOUCH_CANCEL,this.onTouchEnd,this);
    input.off(Input.EventType.KEY_DOWN,this.onKeyDown,this);
    input.off(Input.EventType.KEY_UP,this.onKeyUp,this);
    game.off(game.EVENT_HIDE,this.onHide,this);
    this.platform.hideBanner();
  }
  private loadSave(){
    const today=this.platform.getLocal<{day:string;best:number}>('daily',{day:this.currentDay,best:0});
    this.dailyBest=today.day===this.currentDay && Number.isFinite(today.best)?Math.max(0,today.best):0;
    this.allBest=Math.max(this.dailyBest,this.platform.getLocal<number>('allBest',0)||0);
    this.coins=Math.max(0,this.platform.getLocal<number>('coins',0)||0);
    this.attempts=Math.max(0,this.platform.getLocal<number>('attempts',0)||0);
    const saved=this.platform.getLocal<string[]>('skins',['tidal']);
    this.skins=Array.isArray(saved)?Array.from(new Set(['tidal',...saved.filter((v)=>PAINTS.some(s=>s.name===v))])):['tidal'];
    const equipped=this.platform.getLocal<string>('equipped','tidal');
    this.equipped=this.skins.includes(equipped)?equipped:'tidal';
    this.firstRun=Boolean(this.platform.getLocal<boolean>('firstRun',true));
  }
  private save(){
    this.platform.setLocal('daily',{day:this.currentDay,best:this.dailyBest});
    this.platform.setLocal('allBest',this.allBest);
    this.platform.setLocal('coins',this.coins);
    this.platform.setLocal('attempts',this.attempts);
    this.platform.setLocal('skins',this.skins);
    this.platform.setLocal('equipped',this.equipped);
    this.platform.setLocal('firstRun',this.firstRun);
  }
  private loadArt(){
    for(const name of ['hero','hero-ember','hero-stellar','hunter','hunter-elite','shard','shard-gold','pad']){
      resources.load(`art/${name}/spriteFrame`,SpriteFrame,(error,frame)=>{
        if(error||!frame){console.warn('[EchoArena] optional art unavailable:',name);return;}
        this.art[name]=frame;
        if(name.startsWith('hero'))this.updateHeroArt();
        this.updateActorSprites();
      });
    }
    this.hero=this.makeSprite('Pilot',84);
    this.echoSprite=this.makeSprite('DelayedSelf',74);
    this.echoSprite.color=new Color(112,182,255,143);
    for(let i=0;i<16;i++)this.shardSprites.push(this.makeSprite(`Shard${i}`,52));
    for(let i=0;i<10;i++)this.hunterSprites.push(this.makeSprite(`Hunter${i}`,63));
    for(let i=0;i<4;i++)this.pairSprites.push(this.makeSprite(`DoubleCore${i}`,86));
  }
  private makeSprite(name:string,size:number){
    const n=new Node(name);n.parent=this.artLayer;n.layer=this.node.layer;
    n.addComponent(UITransform).setContentSize(size,size);
    const s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;
    n.active=false;return s;
  }
  private updateHeroArt(){
    const frame=this.art[PAINTS.find(p=>p.name===this.equipped)?.asset||'hero'];
    if(this.hero && frame)this.hero.spriteFrame=frame;
    if(this.echoSprite && this.art.hero)this.echoSprite.spriteFrame=this.art.hero;
  }
  private updateActorSprites(){
    this.updateHeroArt();
    for(const s of this.shardSprites)if(this.art.shard)s.spriteFrame=this.art.shard;
    for(const s of this.hunterSprites)if(this.art.hunter)s.spriteFrame=this.art.hunter;
    for(const s of this.pairSprites)if(this.art.pad)s.spriteFrame=this.art.pad;
  }
  private syncSprites(){
    const run=this.screen==='run'||this.screen==='paused'?this.run:null;
    if(this.hero){this.hero.node.active=!!(run && this.hero.spriteFrame);if(run){this.hero.node.setPosition(run.player.x,run.player.y,1);
      this.hero.node.setRotationFromEuler(0,0,-Math.atan2(run.velocity.x,run.velocity.y)*180/Math.PI);
      this.hero.color=run.invulnerable>0 && Math.floor(this.clock*12)%2===0?new Color(255,255,255,120):C.white;}}
    if(this.echoSprite){this.echoSprite.node.active=!!(run?.echo && this.echoSprite.spriteFrame);
      if(run?.echo)this.echoSprite.node.setPosition(run.echo.x,run.echo.y,1);}
    this.shardSprites.forEach((s,i)=>{const v=run?.shards[i];s.node.active=!!(v && this.art.shard);
      if(v){s.spriteFrame=this.art[v.kind==='gold'?'shard-gold':'shard']||this.art.shard||null;
        s.node.setPosition(v.x,v.y+Math.sin(this.clock*3+v.phase)*4,1);s.node.setScale(v.kind==='gold'?0.96:0.7);}});
    this.hunterSprites.forEach((s,i)=>{const h=run?.hunters[i];s.node.active=!!(h && this.art.hunter);
      if(h){s.spriteFrame=this.art[h.kind?'hunter-elite':'hunter']||this.art.hunter||null;s.node.setPosition(h.x,h.y,1);
        s.node.setRotationFromEuler(0,0,Math.atan2(h.vy,h.vx)*180/Math.PI-90);}});
    this.pairSprites.forEach((s,i)=>{const p=run?.pads[Math.floor(i/2)];s.node.active=!!(p && this.art.pad);
      if(p){s.node.setPosition(i%2?p.bx:p.ax,i%2?p.by:p.ay,1);s.node.setScale(0.88+0.09*Math.sin(this.clock*5));}});
  }
  private addText(key:string,size:number,color:Color,weight=false){
    const n=new Node(key);n.parent=this.node;n.layer=this.node.layer;
    n.addComponent(UITransform).setContentSize(720,size*2.2);
    const l=n.addComponent(Label);l.fontSize=size;l.lineHeight=size*1.35;l.isBold=weight;
    l.horizontalAlign=Label.HorizontalAlign.CENTER;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;
    l.color=color;l.string='';n.active=false;this.labels[key]=l;return l;
  }
  private createLabels(){
    this.addText('title',64,C.pale,true);this.addText('subtitle',23,C.muted);
    this.addText('detail',21,C.muted);this.addText('info',24,C.aqua);
    this.addText('main',34,C.pale,true);this.addText('practice',28,C.pale,true);
    this.addText('third',28,C.pale,true);this.addText('fourth',26,C.pale,true);
    this.addText('fifth',26,C.pale,true);this.addText('sixth',24,C.pale,true);
    this.addText('hudTitle',24,C.muted);this.addText('hudScore',43,C.pale,true);
    this.addText('hudTime',38,C.gold,true);this.addText('hudHealth',26,C.coral,true);
    this.addText('hudCombo',24,C.aqua);this.addText('hudHint',22,C.muted);
    this.addText('dash',25,C.pale,true);this.addText('overdrive',24,C.pale,true);
    this.addText('resultTitle',58,C.pale,true);this.addText('resultScore',62,C.gold,true);
    this.addText('resultRecord',28,C.aqua,true);this.addText('resultChain',23,C.muted);
    this.addText('rankTitle',47,C.pale,true);this.addText('rankPrompt',22,C.muted);
    this.addText('skinTitle',48,C.pale,true);this.addText('skinCoins',27,C.gold,true);
    this.addText('skin1',27,C.pale,true);this.addText('skin2',27,C.pale,true);
    this.addText('skin3',27,C.pale,true);this.addText('toast',25,C.pale,true);
    for(let i=0;i<9;i++)this.addText(`pop${i}`,24,C.gold,true);
  }
  private put(key:string,str:string,x:number,y:number,width=690,color?:Color){
    const l=this.labels[key];if(!l)return;
    l.node.active=true;l.string=str;l.node.setPosition(x,y,3);
    l.node.getComponent(UITransform)?.setContentSize(width,Math.max(44,l.fontSize*2));
    if(color)l.color=color;
  }
  private clearLabels(){for(const key in this.labels)this.labels[key].node.active=false;}
  private box(x:number,y:number,w:number,h:number,r:number,fill:Color,edge?:Color,thickness=2){
    const g=this.graphics;g.fillColor=fill;g.roundRect(x-w/2,y-h/2,w,h,r);g.fill();
    if(edge){g.lineWidth=thickness;g.strokeColor=edge;g.roundRect(x-w/2,y-h/2,w,h,r);g.stroke();}
  }
  private circle(x:number,y:number,r:number,fill:Color,outline?:Color){
    const g=this.graphics;g.fillColor=fill;g.circle(x,y,r);g.fill();if(outline){g.lineWidth=2;g.strokeColor=outline;g.circle(x,y,r);g.stroke();}
  }
  private line(ax:number,ay:number,bx:number,by:number,c:Color,width=2){
    const g=this.graphics;g.lineWidth=width;g.strokeColor=c;g.moveTo(ax,ay);g.lineTo(bx,by);g.stroke();
  }
  private toast(str:string,seconds=2.4){this.toastText=str;this.toastTimer=seconds;}
  private onHide(){if(this.screen==='run' && this.run && !this.run.finished){this.suspended=true;this.screen='paused';this.platform.hideBanner();}}
  private onKeyDown(e:EventKeyboard){this.keyHeld.add(e.keyCode);if(this.screen==='run'){
    if(e.keyCode===KeyCode.SPACE)this.pendingDash=true;
    if(e.keyCode===KeyCode.SHIFT_LEFT)this.pendingOverdrive=true;
  }}
  private onKeyUp(e:EventKeyboard){this.keyHeld.delete(e.keyCode);}
  private touchPoint(e:EventTouch):Vec{
    const p=e.getUILocation();
    const q=this.node.getComponent(UITransform)?.convertToNodeSpaceAR(new Vec3(p.x,p.y,0));
    return {x:q?.x||0,y:q?.y||0};
  }
  private onTouchStart(e:EventTouch){
    const p=this.touchPoint(e);
    if(this.screen==='run'){
      if(p.y<-490){if(p.x>75)this.pendingDash=true;else this.pendingOverdrive=true;this.sound.play('tap');return;}
      this.pointer={x:uiClamp(p.x,MIN_X,MAX_X),y:uiClamp(p.y,MIN_Y,MAX_Y)};
      return;
    }
    if(this.screen==='paused'){this.screen='run';this.suspended=false;this.tickBalance=0;this.sound.play('tap');return;}
    if(this.screen==='menu'){
      if(this.hit(p,0,-262,550,83))this.start(false);
      else if(this.hit(p,0,-367,550,78))this.start(true);
      else if(this.hit(p,0,-471,550,79))this.enterRanking();
      else if(this.hit(p,0,-564,550,78))this.openSkins();
      else if(this.hit(p,298,558,95,85))this.toggleSound();
    }else if(this.screen==='result'){
      if(this.hit(p,0,35,570,78))this.start(false);
      else if(this.hit(p,0,-74,570,78))this.enterRanking();
      else if(this.hit(p,0,-181,570,78))this.share();
      else if(this.hit(p,0,-290,570,78))void this.rewardVideo();
      else if(this.hit(p,0,-402,570,77))this.goMenu();
    }else if(this.screen==='ranking'){
      if(this.hit(p,0,-543,570,90))this.goMenu();
      else if(this.hit(p,0,-448,550,78))this.share();
    }else if(this.screen==='skins'){
      if(this.hit(p,0,273,575,103))this.pickSkin(0);
      else if(this.hit(p,0,120,575,103))this.pickSkin(1);
      else if(this.hit(p,0,-32,575,103))this.pickSkin(2);
      else if(this.hit(p,0,-428,575,86))this.goMenu();
    }
  }
  private onTouchMove(e:EventTouch){
    if(this.screen!=='run')return;
    const p=this.touchPoint(e);
    if(p.y<-495)return;
    this.pointer={x:uiClamp(p.x,MIN_X,MAX_X),y:uiClamp(p.y,MIN_Y,MAX_Y)};
  }
  private onTouchEnd(_e:EventTouch){}
  private hit(p:Vec,x:number,y:number,w:number,h:number){return Math.abs(p.x-x)<=w/2 && Math.abs(p.y-y)<=h/2;}
  private toggleSound(){this.sound.setMuted(!this.sound.isMuted);this.toast(this.sound.isMuted?'音效已关闭':'音效已开启');}
  private goMenu(){this.screen='menu';this.run=null;if(this.rankNode)this.rankNode.active=false;this.setBanner(false);this.platform.hideRanking();}
  private setBanner(on:boolean){
    const state=on?'on':'off';if(this.lastBannerMode===state)return;
    this.lastBannerMode=state;
    if(on)this.platform.showBanner();else this.platform.hideBanner();
  }
  private start(practice:boolean){
    this.currentDay=dayKey();
    if(!practice){const daily=this.platform.getLocal<{day:string;best:number}>('daily',{day:this.currentDay,best:0});
      this.dailyBest=daily.day===this.currentDay?Math.max(0,daily.best||0):0;}
    this.screen='run';if(this.rankNode)this.rankNode.active=false;this.platform.hideRanking();this.run=new EchoRun(this.currentDay,practice,practice?((Date.now()^Math.floor(Math.random()*2**30))>>>0):undefined);
    this.firstRun=false;this.suspended=false;this.setBanner(false);
    this.pointer={x:0,y:0};this.pendingDash=false;this.pendingOverdrive=false;
    this.tickBalance=0;this.pops=[];this.sparkles=[];this.hudClock=0;
    this.platform.setLocal('firstRun',false);this.sound.play('tap');
  }
  private enterRanking(){
    this.screen='ranking';this.sound.play('tap');this.setBanner(false);
    if(this.platform.rankingAvailable){
      if(!this.rankNode){const n=new Node('FriendRankingSharedCanvas');n.parent=this.node;n.layer=this.node.layer;
        n.setPosition(0,-5,2);n.addComponent(UITransform).setContentSize(650,780);
        const v=n.addComponent(SubContextView);v.fps=8;this.rankNode=n;
      }
      this.rankNode.active=true;
      this.scheduleOnce(()=>this.platform.showRanking(this.currentDay),0.45);
    }else{
      this.rankUnavailable=this.platform.isWeChat?'好友榜需先在微信后台完成微信朋友关系隐私声明':'好友榜需使用微信真机打开';
    }
  }
  private openSkins(){this.screen='skins';this.sound.play('tap');this.setBanner(false);}
  private pickSkin(i:number){
    const p=PAINTS[i];if(!p)return;
    if(this.skins.includes(p.name)){this.equipped=p.name;this.updateHeroArt();this.save();this.sound.play('tap');this.toast(`已换装：${p.title}`);return;}
    if(this.coins<p.cost){this.toast(`光谱币不足，还差 ${p.cost-this.coins}`);return;}
    this.coins-=p.cost;this.skins.push(p.name);this.equipped=p.name;
    this.updateHeroArt();this.save();this.sound.play('pair');this.toast(`解锁成功：${p.title}`);
  }
  private share(){const score=this.run?.score||this.dailyBest;
    if(!this.platform.share(this.currentDay,score))this.toast('请在微信小游戏中分享挑战');
    else this.sound.play('tap');
  }
  private async rewardVideo(){
    if(!this.platform.adsConfigured){this.toast('需要先填写真实激励视频广告位ID');return;}
    const result=await this.platform.rewardedCosmetic();
    if(result){this.coins+=120;this.save();this.sound.play('pair');this.toast('完整观看成功：光谱币 +120');}
    else this.toast('未完整观看或广告加载失败，未发放奖励');
  }
  private finish(){
    if(!this.run || this.settling)return;
    this.settling=true;
    this.screen='result';this.attempts++;
    const gained=Math.max(8,Math.min(75,Math.floor(this.run.score/300)));
    this.coins+=gained; // Rewarded for actual play, not sharing or ads.
    if(!this.run.practice){
      if(this.run.score>this.dailyBest){this.dailyBest=this.run.score;this.platform.saveFriendScore(this.currentDay,this.dailyBest);}
      this.allBest=Math.max(this.allBest,this.run.score);
    }
    this.save();this.setBanner(true);this.platform.maybeInterstitial(this.attempts);
    this.settling=false;
  }
  private pop(event:EchoEvent){
    if(event.kind==='end')return;
    if(event.kind==='pick')this.sound.play('collect');
    if(event.kind==='gold')this.sound.play('gold');
    if(event.kind==='dash')this.sound.play('dash');
    if(event.kind==='damage')this.sound.play('damage');
    if(event.kind==='pair'||event.kind==='overdrive')this.sound.play('pair');
    if(event.amount){
      const l=this.labels[`pop${this.pops.length%9}`];
      if(this.pops.length>=9)this.pops.shift();
      l.color=event.kind==='pair'?C.gold:event.kind==='near'?C.blue:event.kind==='damage'?C.coral:C.aqua;
      this.pops.push({x:event.x,y:event.y,t:0,max:0.8,label:l,name:`+${event.amount}`});
    }
    const count=event.kind==='pair'?14:event.kind==='damage'?12:6;
    const col=event.kind==='damage'?C.coral:event.kind==='gold'||event.kind==='pair'?C.gold:C.aqua;
    for(let i=0;i<count;i++){
      const a=(i/count)*Math.PI*2+this.clock;
      const sp=70+Math.random()*150;
      this.sparkles.push({x:event.x,y:event.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,t:0,life:0.34+Math.random()*0.4,rgb:col});
    }
    if(this.sparkles.length>110)this.sparkles.splice(0,this.sparkles.length-110);
  }
  update(dt:number){
    dt=Math.min(Math.max(0,dt),0.08);this.clock+=dt;this.toastTimer=Math.max(0,this.toastTimer-dt);
    if(this.screen==='run' && this.run && !this.suspended){
      const velocity=350*dt;
      if(this.keyHeld.has(KeyCode.ARROW_LEFT)||this.keyHeld.has(KeyCode.KEY_A))this.pointer.x-=velocity;
      if(this.keyHeld.has(KeyCode.ARROW_RIGHT)||this.keyHeld.has(KeyCode.KEY_D))this.pointer.x+=velocity;
      if(this.keyHeld.has(KeyCode.ARROW_UP)||this.keyHeld.has(KeyCode.KEY_W))this.pointer.y+=velocity;
      if(this.keyHeld.has(KeyCode.ARROW_DOWN)||this.keyHeld.has(KeyCode.KEY_S))this.pointer.y-=velocity;
      this.tickBalance=Math.min(0.13,this.tickBalance+dt);
      let iterations=0;
      while(this.tickBalance>=1/60 && iterations<8 && !this.run.finished){
        this.run.step(1/60,{target:this.pointer,dash:this.pendingDash,overdrive:this.pendingOverdrive});
        this.pendingDash=false;this.pendingOverdrive=false;
        for(const e of this.run.events)this.pop(e);
        this.tickBalance-=1/60;iterations++;
      }
      if(this.run.finished)this.finish();
    }
    for(const p of this.pops)p.t+=dt;
    this.pops=this.pops.filter(p=>p.t<p.max);
    for(const s of this.sparkles){s.t+=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;s.vx*=0.974;s.vy*=0.974;}
    this.sparkles=this.sparkles.filter(s=>s.t<s.life);
    this.syncSprites();this.repaint();
  }
  private background(){
    const g=this.graphics;g.clear();
    g.fillColor=C.navy;g.rect(-400,-750,800,1500);g.fill();
    // Background grid and subtle particles are procedural; not a static moving wallpaper.
    for(let i=0;i<13;i++){
      const x=-360+i*60;const shift=Math.sin(this.clock*0.3+i)*1.6;
      this.line(x+shift,-735,x+shift,735,new Color(28,67,78,44),1);
    }
    for(let i=0;i<24;i++){
      const y=-700+i*62;this.line(-375,y,375,y,new Color(26,60,73,43),1);
    }
    for(let i=0;i<18;i++){
      const x=Math.sin(i*6.4)*338, y=Math.cos(i*8.2)*610;
      this.circle(x,y,1.2+Math.sin(this.clock*1.4+i)*0.5,new Color(126,204,219,60));
    }
  }
  private drawMenu(){
    this.box(0,360,655,210,32,new Color(11,42,55,222),new Color(72,147,158,95));
    for(let i=0;i<4;i++){
      const r=66+i*37;this.circle(0,155,r,new Color(0,0,0,0),new Color(47,160,165,40+i*8));
    }
    this.circle(-122,150,32,new Color(34,107,119,80),C.blue);
    this.circle(122,150,32,new Color(30,115,108,80),C.aqua);
    this.line(-95,150,95,150,new Color(89,198,207,110),3);
    this.box(0,-262,552,85,22,new Color(22,126,132,245),C.aqua,3);
    this.box(0,-367,552,79,22,C.panel2,C.blue);
    this.box(0,-471,552,80,22,C.panel2,new Color(100,190,202,135));
    this.box(0,-564,552,78,22,C.panel,C.gold);
    this.box(297,558,95,74,18,C.panel2,new Color(75,156,167,150));
    this.put('title','回 声 猎 场',0,544);
    this.put('subtitle','ECHO ARENA  ·  每日 75 秒公平挑战',0,478,680,C.aqua);
    this.put('detail','现在的你  +  8 秒前的你  =  更高的纪录',0,384,655,C.pale);
    this.put('info',`今日最高  ${fmt(this.dailyBest)}       历史最高  ${fmt(this.allBest)}`,0,-125,690,C.gold);
    this.put('main','开始今日挑战',0,-260);
    this.put('practice','自由练习  ·  不计排行',0,-368);
    this.put('third','微信好友排行榜',0,-472);
    this.put('fourth',`光谱涂装  ·  ${fmt(this.coins)} 币`,0,-562);
    this.put('sixth',this.sound.isMuted?'静音':'♪',298,558,85);
    if(this.incomingTarget!==null){
      this.put('hudHint',this.incomingDay===this.currentDay?`收到好友挑战：目标 ${fmt(this.incomingTarget)} 分`:'收到好友挑战：非今日成绩，仅供参考',0,-194,695,C.coral);
    }else this.put('hudHint','拾取能量 · 回声协作 · 避开追猎 · 超载翻倍',0,-194,700);
  }
  private drawRun(){
    const r=this.run;if(!r)return;
    this.box(0,0,680,906,28,new Color(12,32,46,228),new Color(73,160,166,100),3);
    this.box(0,0,650,870,19,new Color(8,26,39,180));
    const a=this.clock*0.18;
    for(let i=0;i<12;i++){
      const x=-300+i*55;
      this.line(x,MIN_Y,x,MAX_Y,new Color(55,106,119,36),1);
    }
    for(let i=0;i<15;i++){
      const y=-380+i*54;this.line(MIN_X,y,MAX_X,y,new Color(55,106,119,36),1);
    }
    for(let i=0;i<4;i++)this.circle(0,0,65+i*90+Math.sin(a+i)*2,new Color(0,0,0,0),new Color(49,114,125,30));
    for(const p of r.pads){
      this.line(p.ax,p.ay,p.bx,p.by,new Color(105,211,229,85),4);
      if(!this.art.pad){this.circle(p.ax,p.ay,37,new Color(51,139,151,90),C.blue);this.circle(p.bx,p.by,37,new Color(49,137,147,90),C.aqua);}
      if(p.hold>0){this.line(p.ax,p.ay,p.bx,p.by,C.gold,4);}
    }
    for(const s of r.shards)if(!this.art.shard){
      this.circle(s.x,s.y,16,new Color(s.kind==='gold'?243:57,s.kind==='gold'?162:224,s.kind==='gold'?97:209,205),s.kind==='gold'?C.gold:C.aqua);
    }
    for(const h of r.hunters)if(!this.art.hunter){
      this.circle(h.x,h.y,h.r,new Color(147,48,70,215),C.coral);
      this.circle(h.x,h.y,7,new Color(255,185,161,225));
    }
    if(r.echo){
      // Echo path stays visible and is more informative than simply moving a duplicate texture.
      this.circle(r.echo.x,r.echo.y,38,new Color(58,148,209,33),new Color(70,152,222,90));
      if(!this.art.hero)this.circle(r.echo.x,r.echo.y,20,new Color(67,143,222,95),C.blue);
    }
    this.circle(r.player.x,r.player.y,33,new Color(40,230,200,r.overdriveTime>0?90:30));
    if(!this.art.hero){this.circle(r.player.x,r.player.y,19,r.invulnerable>0?C.white:C.aqua,C.pale);}
    if(r.invulnerable>0)this.circle(r.player.x,r.player.y,44,new Color(0,0,0,0),new Color(103,216,233,130));
    if(r.overdriveTime>0)this.circle(r.player.x,r.player.y,50+Math.sin(this.clock*12)*4,new Color(0,0,0,0),C.gold);
    for(const s of this.sparkles){
      const alpha=Math.round(230*(1-s.t/s.life));
      this.circle(s.x,s.y,2.5+2*(1-s.t/s.life),new Color(s.rgb.r,s.rgb.g,s.rgb.b,alpha));
    }
    this.box(0,565,662,145,20,C.panel,new Color(78,165,168,110));
    this.box(-171,-566,293,92,24,r.energy>=100?new Color(172,97,38,248):C.panel2,r.energy>=100?C.gold:C.blue,3);
    this.box(172,-566,293,92,24,r.dashReady?new Color(20,112,117,230):C.panel,r.dashReady?C.aqua:C.muted,3);
    this.box(0,472,665,40,13,C.panel);
    this.graphics.fillColor=r.overdriveTime>0?C.gold:C.aqua;
    this.graphics.roundRect(-312,458,624*r.energy/100,10,5);this.graphics.fill();
    const timeLeft=Math.max(0,ROUND_SECONDS-r.time);
    this.put('hudTitle','第 '+this.currentDay.slice(4,6)+' 月 '+this.currentDay.slice(6)+' 日 · 今日擂台',0,645,700);
    this.put('hudScore',fmt(r.score),-118,572,410,C.pale);
    this.put('hudTime',`${Math.ceil(timeLeft)}s`,227,572,175,timeLeft<15?C.coral:C.gold);
    this.put('hudHealth',`护盾  ${'◆'.repeat(Math.max(0,r.health))}${'◇'.repeat(Math.max(0,3-r.health))}`,0,521,610,C.coral);
    this.put('hudCombo',`连击 x${r.multiplier}     最大 ${r.longestCombo}     能量 ${Math.floor(r.energy)}%`,0,421,680,C.aqua);
    this.put('overdrive',r.overdriveTime>0?`超载 ${r.overdriveTime.toFixed(1)}s`:r.energy>=100?'超载 ×2 · 可用':'超载 · 蓄能中',-171,-566,270,r.energy>=100?C.gold:C.pale);
    this.put('dash',r.dashReady?'瞬移冲刺':`冷却 ${Math.ceil(r.dashCooldown)}s`,172,-566,260);
    this.put('hudHint',r.echo===null?`回声准备中 ${Math.ceil(r.echoesLeft)} 秒`:'回声已出现 · 同时站上双核，可获得高额积分',0,-469,690,r.echo===null?C.muted:C.aqua);
    if(r.time<5)this.put('info','拖动控制方向  ·  靠近光核拾取  ·  别碰红色追猎者',0,354,665,C.gold);
  }
  private drawResult(){
    const r=this.run;if(!r)return;
    this.box(0,230,664,680,30,C.panel,new Color(86,194,196,150),3);
    this.put('resultTitle',r.finishedByHealth?'追猎终止':'挑战完成',0,522,690,r.finishedByHealth?C.coral:C.aqua);
    this.put('detail',r.practice?'自由练习 · 不计排名':`${this.currentDay.slice(0,4)}.${this.currentDay.slice(4,6)}.${this.currentDay.slice(6)}  ·  每日同场挑战`,0,455,690);
    this.put('resultScore',fmt(r.score),0,370,680,C.gold);
    this.put('resultRecord',r.practice?'练习成绩不提交排行榜':r.score>=this.dailyBest?'★ 今日最佳成绩':'今日最高 '+fmt(this.dailyBest),0,288,690,C.aqua);
    this.put('resultChain',`最高连击 ${r.longestCombo}  ·  存活 ${Math.floor(r.time)}s  ·  装饰币 +${Math.max(8,Math.min(75,Math.floor(r.score/300)))}`,0,216,680);
    this.box(0,35,560,78,20,new Color(21,125,130,235),C.aqua,3);
    this.box(0,-74,560,78,20,C.panel2,C.blue);
    this.box(0,-181,560,78,20,C.panel2,C.gold);
    this.box(0,-290,560,78,20,C.panel2,new Color(127,150,179,155));
    this.box(0,-402,560,78,20,C.panel,new Color(102,141,149,160));
    this.put('main','再战一局',0,35);
    this.put('practice','查看好友战绩',0,-74);
    this.put('third','分享我的成绩挑战',0,-181);
    this.put('fourth','观看广告 · 120 装饰币',0,-290);
    this.put('fifth','返回主界面',0,-402);
    this.put('hudHint',`历史最高 ${fmt(this.allBest)}       光谱币 ${fmt(this.coins)}`,0,-500,680,C.muted);
  }
  private drawRanking(){
    this.box(0,0,684,1110,26,C.panel,new Color(68,165,178,120));
    this.put('rankTitle','好友战绩擂台',0,568,690);
    this.put('rankPrompt','每日 00:00（北京时间）重置 · 仅展示已参与的好友',0,507,670);
    if(!this.platform.rankingAvailable){
      this.box(0,15,620,700,24,new Color(19,49,62,210));
      this.put('detail',this.rankUnavailable,0,56,585,C.pale);
      this.put('info','好友真实数据不会用模拟成绩冒充',0,-10,595,C.muted);
    }
    this.box(0,-448,553,79,18,C.panel2,C.gold);
    this.box(0,-543,553,80,18,new Color(21,124,131,245),C.aqua);
    this.put('third','分享今日挑战',0,-448);
    this.put('main','返回主界面',0,-543);
  }
  private drawSkins(){
    this.put('skinTitle','光谱涂装',0,563);
    this.put('skinCoins',`现有光谱币  ${fmt(this.coins)}`,0,486);
    this.put('detail','所有涂装只改变外观，不改变成绩或胜负',0,411,680);
    PAINTS.forEach((p,i)=>{
      const y=273-i*153;
      this.box(0,y,576,110,25,C.panel2,p.color,3);
      this.circle(-238,y,28,new Color(p.color.r,p.color.g,p.color.b,100),p.color);
      const state=this.equipped===p.name?'已装备':this.skins.includes(p.name)?'点击装备':`${fmt(p.cost)} 币解锁`;
      this.put(`skin${i+1}`,`${p.title}     ${state}`,39,y,470,p.color);
    });
    this.box(0,-428,570,88,20,new Color(22,122,129,245),C.aqua);
    this.put('main','返回主界面',0,-428);
  }
  private repaint(){
    if(!this.graphics)return;
    this.clearLabels();this.background();
    if(this.screen==='menu')this.drawMenu();
    else if(this.screen==='run'||this.screen==='paused')this.drawRun();
    else if(this.screen==='result')this.drawResult();
    else if(this.screen==='ranking')this.drawRanking();
    else if(this.screen==='skins')this.drawSkins();
    if(this.screen==='paused'){
      this.box(0,0,680,480,28,new Color(7,24,37,250),C.aqua);
      this.put('resultTitle','已暂停',0,85);
      this.put('resultRecord','返回游戏后点击任意位置继续',0,-20);
      this.put('resultChain','切到微信后台不会偷偷消耗挑战时间',0,-95);
    }
    if(this.screen==='run'||this.screen==='paused'){
      for(const p of this.pops){
        p.label.node.active=true;p.label.string=p.name;p.label.node.setPosition(p.x,p.y+p.t*45,4);
        p.label.color=new Color(p.label.color.r,p.label.color.g,p.label.color.b,Math.max(0,Math.floor(255*(1-p.t/p.max))));
      }
    }
    if(this.toastTimer>0){
      this.box(0, -635,675,60,18,new Color(32,72,82,241),C.aqua);
      this.put('toast',this.toastText,0,-633,656);
    }
  }
}
