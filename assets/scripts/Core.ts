/** Echo Arena – deterministic 75-second score attack. No engine dependencies. */
export const ROUND_SECONDS = 75;
export const ECHO_DELAY = 8;
export const MIN_X = -306;
export const MAX_X = 306;
export const MIN_Y = -405;
export const MAX_Y = 405;

export interface Vec { x: number; y: number }
export interface InputState { target: Vec; dash: boolean; overdrive: boolean }
export interface Shard { id: number; x: number; y: number; kind: 'cyan' | 'gold'; ttl: number; phase: number }
export interface Hunter { id: number; x: number; y: number; vx: number; vy: number; r: number; speed: number; kind: 0 | 1; nearCd: number; phase: number }
export interface PairPad { id: number; ax: number; ay: number; bx: number; by: number; ttl: number; hold: number; done: boolean }
export interface EchoEvent { kind: 'pick' | 'gold' | 'damage' | 'near' | 'pair' | 'dash' | 'overdrive' | 'end'; x: number; y: number; amount?: number }
interface Trace { t: number; x: number; y: number }
function clamp(x: number, a: number, b: number) { return Math.min(b, Math.max(a, x)); }
function dist2(a: Vec, b: Vec) { return (a.x-b.x)**2 + (a.y-b.y)**2; }
function dist(a: Vec, b: Vec) { return Math.sqrt(dist2(a,b)); }
/** Stable UTC+8 day for all users, independent of device locale. */
export function dayKey(timestamp = Date.now()): string {
  const d = new Date(timestamp + 8 * 3600 * 1000);
  return `${d.getUTCFullYear()}${String(d.getUTCMonth()+1).padStart(2,'0')}${String(d.getUTCDate()).padStart(2,'0')}`;
}
export function seedFromDay(day: string): number {
  let s = 0x31415926;
  for (let i=0; i<day.length; i++) s = Math.imul(s ^ day.charCodeAt(i), 2654435761) >>> 0;
  return s || 1;
}
export class RNG {
  private state: number;
  constructor(seed:number) {this.state=seed >>> 0 || 1;}
  next(): number { let x=this.state; x ^= x<<13; x ^= x>>>17; x ^= x<<5; this.state=x>>>0; return (this.state >>> 0) / 4294967296; }
  range(a:number,b:number) {return a+(b-a)*this.next();}
}
export class EchoRun {
  readonly rng:RNG;
  readonly day:string;
  readonly practice:boolean;
  time=0;
  score=0;
  health=3;
  energy=40;
  dashReady=true;
  dashCooldown=0;
  overdriveTime=0;
  invulnerable=0;
  combo=0;
  longestCombo=0;
  lastCollect=-99;
  player:Vec={x:0,y:0};
  echo:Vec|null=null;
  velocity:Vec={x:0,y:1};
  shards:Shard[]=[];
  hunters:Hunter[]=[];
  pads:PairPad[]=[];
  events:EchoEvent[]=[];
  finished=false;
  finishedByHealth=false;
  private traces:Trace[]=[];
  private tracesIndex=0;
  private traceClock=0;
  private shardClock=0;
  private enemyClock=0;
  private padClock=0;
  private nextId=1;
  private stepCount=0;

  constructor(day=dayKey(), practice=false, practiceSeed?:number) {
    this.day=day;this.practice=practice;
    this.rng=new RNG(practice && practiceSeed !== undefined ? practiceSeed : seedFromDay(day));
    for(let i=0;i<9;i++) this.spawnShard();
  }
  private spawnShard() {
    if(this.shards.length>=16) return;
    let p:Vec={x:0,y:0};
    for(let i=0;i<10;i++) {
      p={x:this.rng.range(MIN_X+38,MAX_X-38),y:this.rng.range(MIN_Y+45,MAX_Y-45)};
      if(dist2(p,this.player)>80*80 && this.shards.every(s=>dist2(p,s)>48*48)) break;
    }
    this.shards.push({id:this.nextId++,x:p.x,y:p.y,kind:this.rng.next()<0.18?'gold':'cyan',ttl:14,phase:this.rng.range(0,6.28)});
  }
  private spawnHunter(){
    if(this.hunters.length>=10) return;
    const side=Math.floor(this.rng.range(0,4));
    const x=side===0?-340:side===1?340:this.rng.range(-300,300);
    const y=side===2?-435:side===3?435:this.rng.range(-400,400);
    const kind:0|1=this.rng.next()<0.28?1:0;
    this.hunters.push({id:this.nextId++,x,y,vx:0,vy:0,r:kind?25:20,speed:(kind?70:95)+this.time*0.45,kind,nearCd:0,phase:this.rng.range(0,6.28)});
  }
  private spawnPair(){
    if(this.pads.filter(p=>!p.done).length>=2) return;
    const side = this.rng.next()<0.5 ? -1 : 1;
    const ax=side*this.rng.range(135,240), bx=-side*this.rng.range(135,240);
    const ay=this.rng.range(-300,300), by=this.rng.range(-300,300);
    this.pads.push({id:this.nextId++,ax,ay,bx,by,ttl:21,hold:0,done:false});
  }
  private reward(base:number, p:Vec, kind:EchoEvent['kind']) {
    const chain = Math.min(5,1+Math.floor(this.combo/3));
    const amount=Math.round(base*chain*(this.overdriveTime>0?2:1));
    this.score+=amount;
    this.events.push({kind,x:p.x,y:p.y,amount});
  }
  private collect(s:Shard, viaEcho:boolean){
    const base = s.kind==='gold'?300:100;
    if(this.time-this.lastCollect<=2.55) this.combo=Math.min(16,this.combo+1);
    else this.combo=1;
    this.longestCombo=Math.max(this.longestCombo,this.combo);
    this.lastCollect=this.time;
    this.energy=clamp(this.energy+(viaEcho?5:(s.kind==='gold'?22:12)),0,100);
    this.reward(viaEcho?Math.round(base*0.6):base,{x:s.x,y:s.y},s.kind==='gold'?'gold':'pick');
  }
  private sampleEcho(t:number): Vec|null {
    if(t<0 || this.traces.length===0) return null;
    // Cursor advances monotonically; avoids O(n) search per frame.
    while(this.tracesIndex+1<this.traces.length && this.traces[this.tracesIndex+1].t<=t) this.tracesIndex++;
    const a=this.traces[this.tracesIndex], b=this.traces[this.tracesIndex+1];
    if(!a) return null;
    if(!b || b.t<=a.t) return {x:a.x,y:a.y};
    const k=clamp((t-a.t)/(b.t-a.t),0,1);
    return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k};
  }
  /** Called at a FIXED 1/60 second step. */
  step(dt:number, input:InputState){
    if(this.finished)return;
    dt=clamp(dt,0,1/20);
    this.events=[];
    this.time=Math.min(ROUND_SECONDS,this.time+dt);this.stepCount++;
    this.invulnerable=Math.max(0,this.invulnerable-dt);
    this.dashCooldown=Math.max(0,this.dashCooldown-dt);
    if(this.dashCooldown===0) this.dashReady=true;
    this.overdriveTime=Math.max(0,this.overdriveTime-dt);
    if(this.time-this.lastCollect>3.5) this.combo=0;
    const tgt={x:clamp(input.target.x,MIN_X,MAX_X),y:clamp(input.target.y,MIN_Y,MAX_Y)};
    const dx=tgt.x-this.player.x,dy=tgt.y-this.player.y;
    const len=Math.hypot(dx,dy);
    if(len>1){
      const pace=Math.min(len,480*dt);
      this.velocity={x:dx/len,y:dy/len};
      this.player.x+=this.velocity.x*pace;
      this.player.y+=this.velocity.y*pace;
    }
    if(input.dash && this.dashReady && this.dashCooldown===0){
      this.dashReady=false;
      this.dashCooldown=7;
      this.invulnerable=Math.max(this.invulnerable,0.4);
      this.player.x=clamp(this.player.x+this.velocity.x*142,MIN_X,MAX_X);
      this.player.y=clamp(this.player.y+this.velocity.y*142,MIN_Y,MAX_Y);
      this.events.push({kind:'dash',x:this.player.x,y:this.player.y});
    }
    if(input.overdrive && this.energy>=100 && this.overdriveTime===0){
      this.energy=0;this.overdriveTime=9;
      this.events.push({kind:'overdrive',x:this.player.x,y:this.player.y});
    }
    this.traceClock+=dt;
    if(this.traces.length===0 || this.traceClock>=1/30){
      this.traces.push({t:this.time,x:this.player.x,y:this.player.y});
      this.traceClock=0;
    }
    this.echo=this.sampleEcho(this.time-ECHO_DELAY);
    this.shardClock+=dt;
    if(this.shardClock>=0.9){this.shardClock-=0.9;this.spawnShard();}
    this.enemyClock+=dt;
    if(this.time>4.5 && this.enemyClock>=Math.max(2.5,5.5-this.time/35)){
      this.enemyClock=0;this.spawnHunter();
    }
    this.padClock+=dt;
    if(this.time>3.5 && this.padClock>=16){this.padClock=0;this.spawnPair();}
    // Temporary objects have deadlines; maintaining this creates pacing and decisions.
    this.shards=this.shards.filter(s=>{s.ttl-=dt;return s.ttl>0;});
    for(let i=this.shards.length-1;i>=0;i--){
      const s=this.shards[i];
      if(dist2(this.player,s)<(s.kind==='gold'?31:29)**2){this.collect(s,false);this.shards.splice(i,1);}
      else if(this.echo && dist2(this.echo,s)<24**2){this.collect(s,true);this.shards.splice(i,1);}
    }
    for(const h of this.hunters){
      h.nearCd=Math.max(0,h.nearCd-dt);
      const target=h.kind===1 && this.echo?this.echo:this.player;
      const delta={x:target.x-h.x,y:target.y-h.y};
      const norm=Math.max(1,Math.hypot(delta.x,delta.y));
      const speed=h.speed*(this.overdriveTime>0?1.35:1);
      const vx=delta.x/norm*speed,vy=delta.y/norm*speed;
      h.vx+=(vx-h.vx)*Math.min(1,4*dt);h.vy+=(vy-h.vy)*Math.min(1,4*dt);
      h.x+=h.vx*dt;h.y+=h.vy*dt;
      const d=dist(this.player,h);
      if(d<h.r+16 && this.invulnerable<=0){
        const damage=this.overdriveTime>0?2:1;
        this.health-=damage;this.invulnerable=1.5;this.combo=0;
        this.events.push({kind:'damage',x:this.player.x,y:this.player.y,amount:damage});
      }else if(d<h.r+48 && d>h.r+23 && h.nearCd===0 && this.invulnerable===0){
        h.nearCd=2.5;this.energy=clamp(this.energy+5,0,100);
        this.reward(35,this.player,'near');
      }
    }
    for(const p of this.pads){
      if(p.done)continue;
      p.ttl-=dt;
      if(!this.echo)continue;
      const pa={x:p.ax,y:p.ay}, pb={x:p.bx,y:p.by};
      const hit=(dist2(this.player,pa)<43**2 && dist2(this.echo,pb)<43**2)
        ||(dist2(this.player,pb)<43**2 && dist2(this.echo,pa)<43**2);
      p.hold=hit?p.hold+dt:Math.max(0,p.hold-dt*2);
      if(p.hold>=0.3){p.done=true;this.combo=Math.min(16,this.combo+2);this.energy=clamp(this.energy+35,0,100);this.reward(1200,{x:(p.ax+p.bx)/2,y:(p.ay+p.by)/2},'pair');}
    }
    this.pads=this.pads.filter(p=>p.ttl>0 && !p.done);
    if(this.health<=0 || this.time>=ROUND_SECONDS-1e-6){
      this.finished=true;this.finishedByHealth=this.health<=0;
      this.events.push({kind:'end',x:this.player.x,y:this.player.y});
    }
  }
  get multiplier() {return Math.min(5,1+Math.floor(this.combo/3))*(this.overdriveTime>0?2:1);}
  get echoesLeft(){return Math.max(0,ECHO_DELAY-this.time);}
  /** For diagnostics: no server-authoritative anti-cheat is claimed. */
  summary(){return {day:this.day,practice:this.practice,score:this.score,seconds:Math.min(ROUND_SECONDS,this.time),combo:this.longestCombo,health:Math.max(0,this.health),finished:this.finished};}
}
