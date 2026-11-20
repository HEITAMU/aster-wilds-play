import {
  _decorator, Component, director, view, ResolutionPolicy, input, Input,
  EventTouch, EventKeyboard, KeyCode, Node, Camera, Vec3, UITransform
} from 'cc';
import { CrownRules, Wave, PLAYER_Z, LANES, ROUND_SECONDS, dailySeed, dateBeijing, dailyKey } from './Rules';
import { CourtArtist, Regalia } from './Art';
import { WeChatBridge } from './WeChatBridge';
import { CrownHUD } from './HUD';
import { AudioHub } from './AudioHub';
import { AD_UNITS } from './config';
const {ccclass}= _decorator;
interface Rival {kind:Wave['kind'];data:Wave;figure:Regalia;node:Node;z:number;}
interface Particle {node:Node;time:number;life:number;}
@ccclass('CrownBoot')
export class CrownBoot extends Component {
  private hud!:CrownHUD; private bridge!:WeChatBridge;private audio!:AudioHub;
  private court!:Node;private camera!:Camera;private hero!:Regalia;
  private rules:CrownRules|null=null;
  private visible:Rival[]=[];
  private pool:Map<string,Regalia[]>=new Map();
  private effects:Particle[]=[];
  private waveIndex=0;private lane:0|1|2=1;
  private clock=0;private startTime=0;
  private actionLock=0;private visualStress=0;private toastTime=0;private shake=0;
  private state:'home'|'play'|'result'|'friends'='home';
  private touchStart:{x:number,y:number}|null=null;
  private currentDate=dateBeijing();private seed=dailySeed(this.currentDate);
  private best=0;private bestDay=0;private runShards=0;private adClaimed=false;
  private lastScore=0;
  start():void {
    // Portrait 720x1280. All model silhouettes are actual illuminated meshes, not sprites.
    view.setDesignResolutionSize(720,1280,ResolutionPolicy.FIXED_HEIGHT);
    const scene=director.getScene();if(!scene) throw new Error('Cocos scene did not load');
    this.bridge=new WeChatBridge();this.bridge.configureAds(AD_UNITS.rewardedVideo,AD_UNITS.banner);
    if(this.bridge.challenge){this.seed=this.bridge.challenge.seed;this.currentDate=this.bridge.challenge.date;}
    const stage=CourtArtist.build(scene);this.court=stage.root;this.camera=stage.camera;
    this.hero=CourtArtist.figure('hero');this.court.addChild(this.hero.root);
    this.hero.root.setPosition(0,.20,PLAYER_Z);
    this.hero.root.setScale(1.08,1.08,1.08);
    const canvas=scene.getChildByName('Canvas');
    if(!canvas)throw new Error('Expected serialized Canvas in assets/scene/Entry.scene');
    this.hud=new CrownHUD(canvas,{
      start:()=>this.startRound(),parry:()=>this.parry(),left:()=>this.move(-1),right:()=>this.move(1),
      bank:()=>this.bank(),share:()=>this.share(),friends:()=>this.showFriends(),
      back:()=>this.showHome(),ad:()=>this.rewarded()
    },this.bridge.isWeChat);
    this.audio=new AudioHub();this.best=this.bridge.load('ct_all_best',0);
    this.bestDay=this.bridge.load('ct_local_'+dailyKey(this.currentDate),0);
    this.showHome();
    input.on(Input.EventType.TOUCH_START,this.onTouchStart,this);
    input.on(Input.EventType.TOUCH_END,this.onTouchEnd,this);
    input.on(Input.EventType.KEY_DOWN,this.onKeyDown,this);
  }
  private showHome():void {
    this.state='home';this.rules=null;this.hud.show('home');this.bridge.showBanner();
    this.hero.root.active=true;this.hero.root.setPosition(0,.20,PLAYER_Z);
    for(const r of this.visible)this.recycle(r);
    this.visible=[];
    this.hero.setVanity(Math.min(12,Math.floor(this.best/1800)));
  }
  private startRound():void {
    this.bridge.hideBanner();this.state='play';this.hud.show('play');
    this.rules=new CrownRules(this.seed);this.lane=1;this.waveIndex=0;
    this.visible.forEach(r=>this.recycle(r));this.visible=[];
    this.effects.forEach(e=>e.node.destroy());this.effects=[];
    this.startTime=Date.now();this.actionLock=0;this.visualStress=0;this.toastTime=0;
    this.hero.root.setPosition(0,.20,PLAYER_Z);this.hero.setVanity(0);
    this.audio.playMusic();this.audio.cue('button');
    this.notify(this.bridge.challenge ? `挑战目标 ${this.bridge.challenge.target.toLocaleString()}` : '今日王庭 · 每个人面对相同敌阵', '#FFE5AF',1.8);
  }
  private move(dir:-1|1):void {
    if(this.state!=='play'||!this.rules||this.rules.finished)return;
    const next=Math.max(0,Math.min(2,this.lane+dir)) as 0|1|2;
    if(next!==this.lane){this.lane=next;this.audio.cue('button',.25);}
  }
  private parry():void {
    if(this.state!=='play'||!this.rules||this.rules.finished||this.actionLock>0)return;
    const choices=this.visible.filter(r=>r.data.lane===this.lane && r.z>=PLAYER_Z-2.00 && r.z<=PLAYER_Z+.55);
    choices.sort((a,b)=>Math.abs(PLAYER_Z-a.z)-Math.abs(PLAYER_Z-b.z));
    const r=choices[0];
    this.actionLock=.24;
    if(!r){
      this.rules.miss();this.visualStress=.32;
      this.notify('挥空 · 等对手进入反击区','#E0A4AC',.54);
      this.audio.cue('button',.4);return;
    }
    if(r.kind==='thorn'){
      const lost=this.rules.hit();this.notify(`刺甲反噬 -${lost.toLocaleString()}`,'#F27D9E',1.05);
      this.actionLock=.43;this.shake=.45;this.audio.cue('hurt');
    }else if(r.kind==='relic'){
      this.rules.pickup();this.notify('拾起王庭珍宝','#B4F7D4',.65);this.audio.cue('jewel');
    }else{
      const dist=Math.abs(PLAYER_Z-r.z);
      const perfect=dist<=.74;
      const earned=this.rules.successfulParry(r.data,perfect);
      this.notify(perfect?`完美夺冠 +${earned}`:`反击成功 +${earned}`,perfect?'#FFF0A8':'#D9C9B7',.72);
      this.audio.cue(perfect?'perfect':'parry');
      this.shake=perfect?.36:.19;
      this.hero.setVanity(this.rules.combo);
    }
    this.burst(r, r.kind==='thorn');this.removeRival(r);
    this.visualStress=.85;
  }
  private bank():void {
    if(this.state!=='play'||!this.rules)return;
    const saved=this.rules.bank();
    if(saved>0){this.notify(`荣耀封存 +${saved.toLocaleString()}`,'#F4D497',.9);this.audio.cue('bank');
      this.hero.setVanity(0);this.shake=.25;
      this.effects.push({node:CourtArtist.impact(this.court,new Vec3(LANES[this.lane],1.2,PLAYER_Z),false),time:0,life:.72});
    }else this.notify(this.rules.bankCooldown>0?'封存尚未冷却':'先夺取一些荣耀','#E8C2B0',.62);
  }
  private spawn(w:Wave):void {
    let list=this.pool.get(w.kind);
    let fig=list&&list.length?list.pop()!:CourtArtist.figure(w.kind);
    if(!fig.root.parent)this.court.addChild(fig.root);
    fig.root.active=true;fig.root.setPosition(LANES[w.lane],.18,-16.1);
    fig.root.setScale(w.kind==='noble'?1.07:w.kind==='relic'?.86:.92,w.kind==='noble'?1.07:w.kind==='relic'?.86:.92,w.kind==='noble'?1.07:w.kind==='relic'?.86:.92);
    fig.phase=w.index*.47;
    this.visible.push({kind:w.kind,data:w,figure:fig,node:fig.root,z:-16.1});
  }
  private recycle(r:Rival):void {
    r.node.active=false;let a=this.pool.get(r.kind);if(!a){a=[];this.pool.set(r.kind,a);}a.push(r.figure);
  }
  private removeRival(r:Rival):void{
    const i=this.visible.indexOf(r);if(i>=0)this.visible.splice(i,1);this.recycle(r);
  }
  private burst(r:Rival,red:boolean):void{
    const fx=CourtArtist.impact(this.court,new Vec3(LANES[r.data.lane],1.55,r.z),red);
    this.effects.push({node:fx,time:0,life:.46});
  }
  private notify(message:string,color:string,duration=.65):void{
    this.hud.toast(message,color);this.toastTime=duration;
  }
  private settle():void {
    if(!this.rules)return;
    this.rules.finish();this.state='result';this.hud.show('result');
    for(const r of this.visible)this.recycle(r);this.visible=[];
    const score=this.rules.banked,wasRecord=score>this.best;
    this.lastScore=score;
    this.best=Math.max(this.best,score);this.bridge.save('ct_all_best',this.best);
    // Different shared challenge seeds never inflate the fair daily leaderboard.
    if(this.seed===dailySeed(this.currentDate)&&this.currentDate===dateBeijing()){
      this.bestDay=Math.max(this.bestDay,score);
      this.bridge.save('ct_local_'+dailyKey(this.currentDate),this.bestDay);
      this.bridge.publishBest(this.bestDay,this.currentDate);
    }
    this.runShards=Math.floor(score/1200);this.adClaimed=false;
    const owned=this.bridge.load('ct_decor_shards',0);
    this.bridge.save('ct_decor_shards',owned+this.runShards);
    this.hud.renderResult(score,this.best,this.rules.perfect,this.rules.hits,this.runShards,wasRecord);
    this.bridge.showBanner();this.audio.cue('end');
  }
  private showFriends():void{
    this.audio.cue('button');this.state='friends';this.hud.show('friends');
    if(this.bridge.isWeChat)this.bridge.openFriends(dateBeijing());
    else this.hud.setFriendMessage(`好友榜需要微信运行环境\n本机历史最高 ${this.best.toLocaleString()}`);
    this.bridge.hideBanner();
  }
  private share():void {
    if(!this.bridge.share(this.lastScore,this.seed,this.currentDate))
      this.hud.setAdMessage('微信内点「晒出战绩」发送同题挑战卡');
  }
  private rewarded():void{
    if(this.state!=='result'||this.adClaimed)return;
    this.bridge.rewarded().then(state=>{
      if(this.state!=='result')return;
      if(state==='reward'&&!this.adClaimed){
        this.adClaimed=true;
        this.bridge.save('ct_decor_shards',this.bridge.load('ct_decor_shards',0)+this.runShards);
        this.hud.setAdMessage(`广告已完整观看 · 额外获得 ${this.runShards} 装饰碎片`);
        this.audio.cue('bank');
      }else if(state==='dismissed')this.hud.setAdMessage('未看完整广告 · 本次未发放额外碎片');
      else this.hud.setAdMessage('当前无可用广告 · 正常游玩不受影响');
    });
  }
  private onTouchStart(e:EventTouch):void {
    const p=e.getUILocation();this.touchStart={x:p.x,y:p.y};
  }
  private onTouchEnd(e:EventTouch):void {
    if(this.state!=='play'||!this.touchStart)return;
    const end=e.getUILocation(),start=this.touchStart;this.touchStart=null;
    const ui=this.hud.root.getComponent(UITransform);
    const local=ui?.convertToNodeSpaceAR(new Vec3(start.x,start.y,0));
    if(!local || local.y < -230 || local.y > 345)return; // never steal button taps
    const dx=end.x-start.x;
    if(Math.abs(dx)>42)this.move(dx<0?-1:1);
    else this.parry();
  }
  private onKeyDown(e:EventKeyboard):void {
    if(e.keyCode===KeyCode.ARROW_LEFT||e.keyCode===KeyCode.KEY_A)this.move(-1);
    else if(e.keyCode===KeyCode.ARROW_RIGHT||e.keyCode===KeyCode.KEY_D)this.move(1);
    else if(e.keyCode===KeyCode.SPACE)this.parry();
    else if(e.keyCode===KeyCode.KEY_B)this.bank();
  }
  update(dt:number):void {
    const now=Date.now()/1000;this.clock=now;
    this.hero.animate(now,this.visualStress,true);
    this.visualStress=Math.max(0,this.visualStress-dt*2.8);
    this.actionLock=Math.max(0,this.actionLock-dt);
    if(this.state!=='play'||!this.rules){return;}
    // Wall-clock timeline: no benefit from backgrounding the app or dropping frames.
    const desired=Math.min(ROUND_SECONDS,Math.max(0,(Date.now()-this.startTime)/1000));
    const delta=desired-this.rules.time;
    if(delta>0)this.rules.tick(delta);
    const t=this.rules.time;
    while(this.waveIndex<this.rules.waves.length && this.rules.waves[this.waveIndex].at<=t){
      this.spawn(this.rules.waves[this.waveIndex]);this.waveIndex++;
    }
    for(const r of [...this.visible]){
      r.z=-16.1+r.data.speed*(t-r.data.at);
      r.node.setPosition(LANES[r.data.lane],.18+Math.sin(t*6+r.data.index)*.06,r.z);
      r.figure.animate(t+r.data.index*.12,r.kind==='thorn'?.38:.09);
      if(r.z>PLAYER_Z+.65){
        if(r.data.lane===this.lane){
          if(r.kind==='relic'){
            this.rules.pickup();this.notify('王庭珍宝 + 荣耀','#BAF5DD',.66);this.audio.cue('jewel');
          }else{
            const lost=this.rules.hit();
            if(lost>0){this.notify(`被击中！散失 ${lost.toLocaleString()}`,'#FA90A4',.86);
              this.audio.cue('hurt');this.shake=.5;
            }
          }
        }else if(r.kind==='duel'||r.kind==='noble')this.rules.miss();
        this.removeRival(r);
      }
    }
    for(const item of [...this.effects]){
      item.time+=dt;const p=Math.min(1,item.time/item.life);
      item.node.setScale(1+p*1.2,1+p*1.2,1+p*1.2);
      item.node.setRotationFromEuler(0,p*72,0);
      if(p>=1){item.node.destroy();this.effects.splice(this.effects.indexOf(item),1);}
    }
    const h=this.hero.root.position;
    this.hero.root.setPosition(h.x+(LANES[this.lane]-h.x)*Math.min(1,dt*14),.2+Math.sin(t*8)*.06,PLAYER_Z);
    this.shake=Math.max(0,this.shake-dt*2.2);
    const j=this.shake*.10;
    this.camera.node.setPosition(j*Math.sin(t*65),9.7+j*Math.cos(t*39),17.8);
    if(this.toastTime>0){this.toastTime-=dt;if(this.toastTime<=0)this.hud.toast('');}
    this.hud.renderPlay(this.rules.banked,this.rules.loose,this.rules.combo,ROUND_SECONDS-t,this.rules.bankCooldown);
    if(this.rules.finished)this.settle();
  }
  onDestroy():void {
    input.off(Input.EventType.TOUCH_START,this.onTouchStart,this);
    input.off(Input.EventType.TOUCH_END,this.onTouchEnd,this);
    input.off(Input.EventType.KEY_DOWN,this.onKeyDown,this);
    this.bridge?.destroy();
  }
}
