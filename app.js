/* Shared Canvas presentation: browser and WeChat mini-game. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core'));else root.AsterApp=factory(root.AsterCore);})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
const P={bg:'#10292c',panel:'#18373d',panel2:'#2a4b4e',ink:'#f4e6c7',muted:'#aac1b3',gold:'#f0bf72',mint:'#bce1b9',coral:'#ed9982',line:'#516e62'};
const COLORS=['#a9d99f','#ef8b6c','#bca5ee','#f1c86c'];
const UI_RECTS={gold:[18,107,589,196],plain:[655,107,571,195],mint:[20,496,588,181],panel:[660,419,561,323],shelf:[9,946,608,145],badge:[735,802,411,408]};
const UI_ICONS={sword:0,camp:1,map:2,book:3,heart:4,shield:5,snow:6,prism:7,leaf:8,gem:9,star:10,upgrade:11};
class App{
 constructor(env){this.env=env;this.canvas=env.canvas;this.ctx=this.canvas.getContext('2d');this.width=420;this.height=880;this.hits=[];this.t=0;this.tab='battle';this.campTab='ecology';this.mapPage=0;this.bookPage=0;this.modal=null;this.toastText='';this.toastUntil=0;this.drag=false;this.anim=null;this.hurtUntil=0;this.spawnAt=0;this.particles=[];this.floaters=[];this.images={};this.loaded=0;this.lastSave=0;this.s=C.hydrate(env.read());this.tab=this.s.view||'battle';let before=this.s.bank;C.accrue(this.s);this.offline=Math.floor(this.s.bank-before);this.run=C.Run.restore(this.s,this.s.activeRun)||new C.Run(this.s,this.s.stage,(Date.now()&0xffffffff));if(this.run.done&&this.tab==='battle')this.modal={type:'result',result:this.run.result};this.guide=this.s.tutorial;this.questPage=0;this.resize();env.listen(this);this.load('atlas','assets/creatures-v2.png');this.load('motion','assets/motion.png');this.load('camp','assets/camp.jpg');this.load('grove','assets/grove.jpg');this.load('biomes','assets/biomes.jpg');this.load('ui','assets/ui-frames-v1.png');this.load('uiIcons','assets/ui-icons-v1.png');this.save();this.tick=this.tick.bind(this);env.raf(this.tick);}
 load(key,path){let im=this.env.image();im.onload=()=>{this.images[key]=im;this.loaded++;};im.onerror=()=>{this.loaded++;this.toast('部分画面未加载，可刷新重试');};im.src=path;}
 resize(){let d=this.env.dimensions();this.dpr=Math.min(d.dpr||1,2);this.cssW=d.width;this.cssH=d.height;this.canvas.width=Math.round(d.width*this.dpr);this.canvas.height=Math.round(d.height*this.dpr);let top=d.safeTop||0,bottom=d.safeBottom||0;this.scale=Math.min(d.width/420,(d.height-top-bottom)/880);this.ox=(d.width-420*this.scale)/2;this.oy=top+(d.height-top-bottom-880*this.scale)/2;}
 save(){C.accrue(this.s);this.s.activeRun=this.run.snapshot();this.s.view=this.tab;this.env.write(this.s);}
 toast(text){this.toastText=text;this.toastUntil=this.t+2.5;}
 audio(type){if(this.s.sound&&this.env.audio)this.env.audio(type);}
 haptic(){if(this.env.haptic)this.env.haptic();}
 pos(x,y){return {x:(x-this.ox)/this.scale,y:(y-this.oy)/this.scale};}
 tileAt(x,y){let c=Math.floor((x-27)/61),r=Math.floor((y-222)/58);return c>=0&&c<6&&r>=0&&r<7?r*6+c:-1;}
 center(i){return {x:57.5+(i%6)*61,y:251+Math.floor(i/6)*58};}
 down(x,y){let p=this.pos(x,y);this.pointer=p;if(this.anim)return;for(let i=this.hits.length-1;i>=0;i--){let h=this.hits[i];if(p.x>=h.x&&p.x<=h.x+h.w&&p.y>=h.y&&p.y<=h.y+h.h){this.pressed=h.id;h.fn();this.audio('tap');return;}}if(this.modal||this.tab!=='battle'||this.run.done||this.guide)return;let i=this.tileAt(p.x,p.y);if(i>=0){this.drag=true;this.dragPoint=p;if(this.run.path.length&&!C.neighbors(this.run.path[this.run.path.length-1],i)&&!this.run.path.includes(i))this.run.path=[];if(this.run.add(i))this.audio('select');else this.toast(this.run.validPath([...this.run.path,i]).reason||'从探险家身边开始连线');}}
 sweptTiles(from,to){
  // Hit the bodies, not square cell corners. Sweep the full segment so low
  // touch-event rates cannot skip a monster. Normalize for the rectangular grid.
  const dx=(to.x-from.x)/61,dy=(to.y-from.y)/58,a=dx*dx+dy*dy,hits=[];
  if(a<1e-10)return hits;
  for(let i=0;i<42;i++){
   const p=this.center(i),x=(from.x-p.x)/61,y=(from.y-p.y)/58;
   const b=2*(x*dx+y*dy),c=x*x+y*y-.44*.44,d=b*b-4*a*c;
   if(d<0)continue;
   const enter=(-b-Math.sqrt(d))/(2*a),leave=(-b+Math.sqrt(d))/(2*a);
   if(leave>=0&&enter<=1)hits.push({i,t:Math.max(0,enter)});
  }
  return hits.sort((a,b)=>a.t-b.t);
 }
 move(x,y){
  if(!this.drag||this.anim||this.modal)return;
  const p=this.pos(x,y),from=this.dragPoint||p;this.pointer=p;
  for(const {i} of this.sweptTiles(from,p)){
   const tail=this.run.path.length?this.run.path[this.run.path.length-1]:this.run.hero;
   if(i===tail)continue;
   if(this.run.add(i)){this.audio('select');this.haptic();}
  }
  this.dragPoint=p;
 }
 up(x,y){if(Number.isFinite(x)&&Number.isFinite(y))this.move(x,y);this.drag=false;this.dragPoint=null;this.pressed=null;}
 tick(ts){let next=ts/1000,dt=this.t?Math.min(.05,next-this.t):.016;this.t=next;if(!this.env.hidden){this.update(dt);this.draw();}this.env.raf(this.tick);}
 update(dt){if(this.anim){this.anim.elapsed+=dt;let n=Math.max(0,Math.floor((this.anim.elapsed-.12)/.12));while(this.anim.emitted<n&&this.anim.emitted<this.anim.events.length){let e=this.anim.events[this.anim.emitted++];this.burst(this.center(e.index),COLORS[e.tile.color]||P.gold);this.audio('hit');}if(this.anim.elapsed>this.anim.duration){let a=this.anim;this.anim=null;this.spawnAt=this.t;this.hurtUntil=a.damage?this.t+.6:0;if(a.finished){this.modal={type:'result',result:a.finished};this.audio(a.finished.win?'win':'lose');}else if(this.run.ready())this.toast('目标完成，连接顶部出口撤离');this.save();}}this.particles=this.particles.filter(p=>(p.life-=dt)>0);for(let p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=90*dt;}this.floaters=this.floaters.filter(f=>(f.life-=dt)>0);for(let f of this.floaters)f.y-=18*dt;if(this.t-this.lastSave>10){C.accrue(this.s);this.save();this.lastSave=this.t;}}
 burst(pt,color){for(let i=0;i<15;i++){let a=Math.random()*6.283,s=25+Math.random()*100;this.particles.push({x:pt.x,y:pt.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-20,life:.35+Math.random()*.3,color,r:1+Math.random()*3});}}
 openSkill(id){
  if(this.tab!=='battle'||this.anim||this.run.done)return;
  this.drag=false;this.dragPoint=null;this.modal={type:'skill',id};
 }
 useSkill(id){
  if(this.modal?.type!=='skill'||this.modal.id!==id||this.anim)return;
  const v=this.run.skill(id);
  if(!v.ok){this.toast(v.msg);return;}
  this.modal=null;
  const colors={heal:P.mint,shield:P.gold,freeze:'#b2dbee',prism:'#d0b5eb'},color=colors[id],p=this.center(id==='prism'?v.target:this.run.hero);
  this.skillEffect={id,index:id==='prism'?v.target:this.run.hero,until:this.t+1.6};
  this.burst(p,color);
  this.floaters.push({x:p.x,y:p.y-32,text:id==='heal'?'生命 +'+v.amount:id==='shield'?'护盾 +'+v.amount:id==='freeze'?'停攻 '+v.amount+' 回合':'换色星核',life:1.6,color});
  this.toast(v.msg);this.audio('skill');this.haptic();this.save();
 }
 attack(){let p=this.run.preview();if(!p.commit){this.toast('连接至少 3 只同色生物，或连接一枚星核');return;}let old=this.run.hero,oldTiles=JSON.parse(JSON.stringify(this.run.tiles));let result=this.run.commit();if(!result)return;this.anim={...result,old,oldTiles,elapsed:0,emitted:0,duration:Math.max(.6,result.route.length*.12+.42)};this.floaters.push({x:210,y:690,text:'+'+result.gained+' 芽素',life:1.5,color:P.gold});if(result.damage)this.floaters.push({x:210,y:380,text:'−'+result.damage+' 生命',life:1.5,color:P.coral});this.guide=false;this.s.tutorial=false;this.haptic();this.save();}
 nextStage(){return this.run.mode==='daily'?this.s.stage:(this.run.result&&this.run.result.win?Math.min(36,this.run.info.n+1):this.run.info.n);}
 openBattle(){if(this.run.done)this.newRun(this.nextStage());else{this.tab='battle';this.modal=null;this.guide=false;this.s.tutorial=false;this.save();}}
 goToTab(tab){this.drag=false;this.dragPoint=null;if(tab==='battle'){this.openBattle();return;}this.tab=tab;this.modal=null;this.guide=false;this.s.tutorial=false;this.save();}
 newRun(n,mode='story'){this.run=new C.Run(this.s,n,mode==='daily'?C.daySeed():Date.now()&0xffffffff,mode);this.tab='battle';this.modal=null;this.anim=null;this.guide=false;this.s.tutorial=false;this.save();}
 startLevel(n,mode='story'){if(this.run.turn>0&&!this.run.done){this.modal={type:'confirm',title:'结束当前远征？',lines:['带回当前芽素的 60% 和已获得星尘。','新的远征将从满生命开始。'],action:()=>{this.run.finish(false);this.newRun(n,mode);}};}else this.newRun(n,mode);}
 rr(x,y,w,h,r=16){let g=this.ctx;r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
 box(x,y,w,h,fill=P.panel,stroke=null,r=16){if(stroke&&w>=95&&h>=60&&!String(fill).startsWith('rgba')&&this.skin('panel',x,y,w,h))return;this.rr(x,y,w,h,r);let g=this.ctx;g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=1;g.stroke();}}
 skin(type,x,y,w,h,borderOnly=false){
  const im=this.images.ui,rect=UI_RECTS[type];if(!im||!rect)return false;
  const g=this.ctx,k=im.width/1254,[rx,ry,rw,rh]=rect,sx=rx*k,sy=ry*k,sw=rw*k,sh=rh*k;
  if(type==='badge'){g.drawImage(im,sx,sy,sw,sh,x,y,w,h);return true;}
  const cut=(type==='panel'?74:type==='shelf'?54:70)*k,dx=Math.min(w/3,h*.43,type==='panel'?17:18),dy=Math.min(h/3,dx);
  const ssx=[sx,sx+cut,sx+sw-cut],ssy=[sy,sy+cut,sy+sh-cut],ssw=[cut,sw-cut*2,cut],ssh=[cut,sh-cut*2,cut];
  const ddx=[x,x+dx,x+w-dx],ddy=[y,y+dy,y+h-dy],ddw=[dx,w-dx*2,dx],ddh=[dy,h-dy*2,dy];
  for(let r=0;r<3;r++)for(let c=0;c<3;c++){if(borderOnly&&r===1&&c===1)continue;g.drawImage(im,ssx[c],ssy[r],ssw[c],ssh[r],ddx[c],ddy[r],ddw[c],ddh[r]);}
  return true;
 }
 paintedIcon(type,x,y,size,alpha=1){const im=this.images.uiIcons,i=UI_ICONS[type];if(!im||i===undefined)return false;const g=this.ctx,w=im.width/4,h=im.height/3;g.save();g.globalAlpha*=alpha;g.drawImage(im,i%4*w,Math.floor(i/4)*h,w,h,x-size*.6,y-size*.6,size*1.2,size*1.2);g.restore();return true;}
 text(str,x,y,size=14,color=P.ink,align='left',weight=400){let g=this.ctx;g.fillStyle=color;g.textAlign=align;g.textBaseline='middle';g.font=(weight>=600?'bold':'normal')+' '+size+'px sans-serif';g.fillText(String(str),x,y);}
 wrap(str,x,y,maxWidth,size=14,color=P.muted,lineHeight=24){let line='',row=0;this.ctx.font='normal '+size+'px sans-serif';for(let ch of str){if(this.ctx.measureText(line+ch).width>maxWidth){this.text(line,x,y+row*lineHeight,size,color);row++;line=ch;}else line+=ch;}if(line)this.text(line,x,y+row*lineHeight,size,color);return row+1;}
 line(x1,y1,x2,y2,color=P.line,w=1){let g=this.ctx;g.strokeStyle=color;g.lineWidth=w;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();}
 circle(x,y,r,fill,stroke=null){let g=this.ctx;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.stroke();}}
 icon(type,x,y,size=20,color=P.gold){if(this.paintedIcon(type,x,y,size,['#45605a','#718f80'].includes(color)?.4:1))return;let g=this.ctx;g.save();g.translate(x,y);g.scale(size/20,size/20);g.strokeStyle=color;g.fillStyle=color;g.lineWidth=1.7;g.lineCap='round';g.lineJoin='round';g.beginPath();if(type==='leaf'){g.moveTo(-7,7);g.bezierCurveTo(-12,-8,6,-11,9,-9);g.bezierCurveTo(12,5,1,10,-7,7);g.moveTo(-8,8);g.lineTo(5,-5);}else if(type==='gem'){g.moveTo(0,-10);g.lineTo(8,0);g.lineTo(0,10);g.lineTo(-8,0);g.closePath();g.moveTo(0,-10);g.lineTo(0,10);g.moveTo(-8,0);g.lineTo(8,0);}else if(type==='sword'){g.moveTo(-7,9);g.lineTo(8,-9);g.lineTo(6,-2);g.lineTo(-3,6);g.moveTo(-9,1);g.lineTo(0,9);}else if(type==='camp'){g.moveTo(-11,8);g.lineTo(0,-10);g.lineTo(11,8);g.closePath();g.moveTo(0,-2);g.lineTo(4,8);g.moveTo(0,-2);g.lineTo(-4,8);}else if(type==='map'){g.moveTo(-10,-7);g.lineTo(-3,-10);g.lineTo(3,-6);g.lineTo(10,-9);g.lineTo(10,8);g.lineTo(3,11);g.lineTo(-3,7);g.lineTo(-10,10);g.closePath();g.moveTo(-3,-10);g.lineTo(-3,7);g.moveTo(3,-6);g.lineTo(3,11);}else if(type==='book'){g.moveTo(0,9);g.lineTo(0,-7);g.quadraticCurveTo(-8,-12,-11,-7);g.lineTo(-11,9);g.quadraticCurveTo(-5,6,0,9);g.quadraticCurveTo(5,6,11,9);g.lineTo(11,-7);g.quadraticCurveTo(8,-12,0,-7);}else if(type==='heart'){g.moveTo(0,8);g.bezierCurveTo(-18,-2,-5,-15,0,-6);g.bezierCurveTo(5,-15,18,-2,0,8);}else if(type==='shield'){g.moveTo(0,-11);g.lineTo(9,-6);g.lineTo(7,5);g.lineTo(0,11);g.lineTo(-7,5);g.lineTo(-9,-6);g.closePath();}else if(type==='snow'){for(let a=0;a<3;a++){let c=Math.cos(a*Math.PI/3)*10,s=Math.sin(a*Math.PI/3)*10;g.moveTo(-c,-s);g.lineTo(c,s);}}else if(type==='star'){for(let i=0;i<10;i++){let a=-Math.PI/2+i*Math.PI/5,r=i%2?4:10;if(i===0)g.moveTo(Math.cos(a)*r,Math.sin(a)*r);else g.lineTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();}else if(type==='close'){g.moveTo(-6,-6);g.lineTo(6,6);g.moveTo(6,-6);g.lineTo(-6,6);}else if(type==='back'){g.moveTo(4,-7);g.lineTo(-4,0);g.lineTo(4,7);}else if(type==='sound'){g.moveTo(-8,-3);g.lineTo(-3,-3);g.lineTo(2,-8);g.lineTo(2,8);g.lineTo(-3,3);g.lineTo(-8,3);g.closePath();g.moveTo(6,-5);g.quadraticCurveTo(11,0,6,5);}else {g.arc(0,0,9,0,Math.PI*2);g.moveTo(0,-4);g.lineTo(0,1);g.moveTo(0,5);g.lineTo(.1,5);}g.stroke();g.restore();}
 sprite(i,x,y,size,angle=0,alpha=1){let im=this.images.atlas;if(!im)return;let g=this.ctx,w=im.width/4,h=im.height/3;g.save();g.globalAlpha=alpha;g.translate(x,y);g.rotate(angle);let rect=i===10?[738,778,235,240]:i===11?[995,700,453,386]:null;if(rect){let sx=im.width/1448,sy=im.height/1086,aspect=rect[2]/rect[3],dw=aspect>1?size:size*aspect,dh=aspect>1?size/aspect:size;g.drawImage(im,rect[0]*sx,rect[1]*sy,rect[2]*sx,rect[3]*sy,-dw/2,-dh/2,dw,dh);}else g.drawImage(im,(i%4)*w,Math.floor(i/4)*h,w,h,-size/2,-size/2,size,size);g.restore();}
 motion(i,x,y,size,angle=0,alpha=1){
  let im=this.images.motion;if(!im){this.sprite(i<4?8:i-4,x,y,size,angle,alpha);return;}
  let g=this.ctx,w=im.width/4,h=im.height/2;g.save();g.translate(x,y);g.rotate(angle);g.globalAlpha=alpha;g.drawImage(im,(i%4)*w,Math.floor(i/4)*h,w,h,-size/2,-size/2,size,size);g.restore();
 }
 campDepartureLabel(){return this.run.done?(this.run.result&&this.run.result.win?'出发 · 第 '+String(this.nextStage()).padStart(2,'0')+' 站':'再次出发'):'继续远征 →';}
  button(id,x,y,w,h,label,fn,kind='plain',disabled=false,disabledReason='条件尚未满足'){
  const g=this.ctx,primary=kind==='gold'||kind==='mint',pressed=this.pressed===id,yy=y+(pressed?2:0),ink=disabled?'#8ca89d':primary?'#213933':P.ink;
  g.save();if(pressed){g.translate(x+w/2,yy+h/2);g.scale(.97,.97);g.translate(-x-w/2,-yy-h/2);}if(disabled)g.globalAlpha=.65;
  if(!this.skin(disabled?'plain':kind==='gold'?'gold':kind==='mint'?'mint':'plain',x,yy,w,h))this.box(x,yy,w,h,primary?P.gold:P.panel2,P.line,12);
  let textSize=14;g.font='bold '+textSize+'px sans-serif';while(g.measureText(label).width>w-22&&textSize>10){textSize--;g.font='bold '+textSize+'px sans-serif';}
  this.text(label,x+w/2,yy+h/2,textSize,ink,'center',700);g.restore();this.hits.push({id,x,y,w,h,fn:disabled?()=>this.toast(disabledReason):fn});
 }
 hit(id,x,y,w,h,fn){this.hits.push({id,x,y,w,h,fn});}
 draw(){let g=this.ctx;g.setTransform(1,0,0,1,0,0);g.fillStyle='#0b2023';g.fillRect(0,0,this.canvas.width,this.canvas.height);g.setTransform(this.dpr*this.scale,0,0,this.dpr*this.scale,this.dpr*this.ox,this.dpr*this.oy);g.save();g.beginPath();g.rect(0,0,420,880);g.clip();this.hits=[];this.background();this.header();if(this.tab==='battle')this.battle();else if(this.tab==='camp')this.camp();else if(this.tab==='map')this.map();else this.book();this.nav();if(this.guide&&!this.modal)this.drawGuide();if(this.modal)this.drawModal();if(this.toastUntil>this.t){let w=Math.min(384,30+this.toastText.length*13);this.box((420-w)/2,787,w,34,'#e9dbba',null,12);this.text(this.toastText,210,804,12,P.bg,'center',600);}g.restore();}
 background(){let g=this.ctx,im=this.images.grove;if(im){let bi=this.run.info.biome,bg=this.images.biomes;if(bi>0&&bg&&this.tab==='battle'){let w=bg.width/3,h=bg.height/2;g.drawImage(bg,(bi%3)*w,Math.floor(bi/3)*h,w,h,0,0,420,880);}else g.drawImage(im,0,0,420,880);let gr=g.createLinearGradient(0,0,0,880);gr.addColorStop(0,'rgba(9,28,30,.72)');gr.addColorStop(.24,'rgba(9,28,30,.13)');gr.addColorStop(.78,'rgba(9,28,30,.2)');gr.addColorStop(1,'#102a2e');g.fillStyle=gr;g.fillRect(0,0,420,880);}else{g.fillStyle=P.bg;g.fillRect(0,0,420,880);}if(this.tab!=='battle'){g.fillStyle='rgba(12,32,35,.82)';g.fillRect(0,100,420,710);}for(let i=0;i<13;i++){let x=(i*97+Math.sin(this.t*.25+i)*8)%420,y=(i*67+this.t*(3+i%3))%800;this.circle(x,y,.8+i%2,'rgba(230,196,119,'+(.15+Math.sin(this.t+i)*.1)+')');}}
 header(){
  let g=this.ctx,gr=g.createLinearGradient(0,0,0,102);gr.addColorStop(0,'rgba(8,28,32,.97)');gr.addColorStop(1,'rgba(11,34,39,.84)');g.fillStyle=gr;g.fillRect(0,0,420,102);
  this.icon('star',37,46,37);this.text('星壤远征',64,41,24,P.ink,'left',750);this.text('A S T E R  W I L D S',66,66,8,P.muted);
  this.skin('plain',251,29,88,37);this.icon('leaf',270,47,24);this.text(this.num(this.s.coins),302,47,13,P.ink,'center',700);
  this.skin('plain',344,29,63,37);this.icon('gem',359,47,23);this.text(this.num(this.s.dust),383,47,13,P.ink,'center',700);
  this.line(29,92,391,92,'#617666');this.line(55,95,365,95,'rgba(183,198,143,.15)');this.icon('leaf',210,93,12);
 }

 num(n){return n>=1000000?(n/1000000).toFixed(1)+'m':n>=10000?(n/1000).toFixed(1)+'k':Math.floor(n).toString();}
 battle(){let r=this.run,info=r.info,b=C.BIOMES[info.biome],g=this.ctx;this.skin('panel',18,105,384,103);this.text((r.mode==='daily'?'每日观测':'第 '+String(info.n).padStart(2,'0')+' 站')+' / '+b.name,32,130,18,P.ink,'left',700);this.text(b.rule,32,153,11,P.muted);this.circle(375,124,16,'#1b3739',P.line);this.text('?',375,124,16,P.ink,'center',600);this.hit('help',354,104,42,42,()=>this.modal={type:'help'});
 for(let i=0;i<r.maxHp;i++)this.icon('heart',38+i*18,177,16,i<r.hp?P.coral:'#45605a');if(r.shield)this.text('护盾 '+r.shield,186,177,12,P.mint);if(r.frozen)this.text('停攻 '+r.frozen+' 回合',254,177,11,'#afd7ed');this.text('回合 '+r.turn,392,176,12,P.muted,'right');
 let percent=Math.min(1,r.kills/info.quota);this.box(28,201,364,5,'#2c4a45',null,2);this.box(28,201,Math.max(5,364*percent),5,b.color,null,2);this.text(r.ready()?'出口已开启 · 连接出口撤离':'采集 '+r.kills+' / '+info.quota+(info.boss?' · '+(r.bossDead?'守卫已击破':'击破守卫'):''),210,217,10,r.ready()?P.gold:P.muted,'center');
 this.box(17,231,386,398,'rgba(7,27,33,.48)','rgba(172,196,152,.3)',22);this.line(39,237,381,237,'rgba(173,203,161,.12)');
 for(let i=0;i<42;i++){let p=this.center(i);if(i!==r.exit)this.circle(p.x,p.y+17,18,'rgba(5,24,27,.18)');}
 // Exit, always visible; it is never a monster tile.
 let ep=this.center(r.exit),pulse=1+Math.sin(this.t*2)*.07;g.save();g.translate(ep.x,ep.y);g.scale(pulse,pulse);g.strokeStyle=r.ready()?P.gold:'#5f7b70';g.lineWidth=2;g.beginPath();g.ellipse(0,-2,14,22,0,0,6.283);g.stroke();g.fillStyle=r.ready()?'rgba(237,198,112,.25)':'rgba(22,46,46,.5)';g.fill();g.restore();this.text(r.ready()?'出口':'封印',ep.x,ep.y+19,9,r.ready()?P.gold:P.muted,'center');
 let route=this.anim?this.anim.route:r.path,origin=this.anim?this.anim.old:r.hero;if(route.length){g.save();g.lineCap='round';g.lineJoin='round';g.strokeStyle='#e6cb7b';g.shadowColor='#d7ca74';g.shadowBlur=12;g.lineWidth=5;g.beginPath();let p=this.center(origin);g.moveTo(p.x,p.y);for(let i of route){p=this.center(i);g.lineTo(p.x,p.y);}g.stroke();g.restore();}
 // A light tether follows the finger between confirmed nodes; the solid route
 // still contains only selected monsters and is retained when the finger lifts.
 if(this.drag&&!this.anim&&this.pointer){let tail=this.center(route.length?route[route.length-1]:r.hero),dx=this.pointer.x-tail.x,dy=this.pointer.y-tail.y,d=Math.hypot(dx,dy);if(d>8&&d<112){g.save();g.globalAlpha=.5;g.setLineDash([3,5]);this.line(tail.x,tail.y,this.pointer.x,this.pointer.y,P.gold,2);g.setLineDash([]);this.circle(this.pointer.x,this.pointer.y,4,'rgba(240,191,114,.3)',P.gold);g.restore();}}
 let visibleTiles=this.anim?this.anim.oldTiles:r.tiles;
 for(let i=0;i<42;i++){let tile=visibleTiles[i];if(!tile)continue;let routeIndex=route.indexOf(i);if(this.anim&&routeIndex>=0&&routeIndex<this.anim.emitted)continue;this.drawTile(tile,i,route.includes(i));}
 if(r.frozen&&!this.anim){g.save();g.globalAlpha=.55;visibleTiles.forEach((tile,i)=>{if(tile&&['creature','armor','spitter','boss'].includes(tile.kind)){let p=this.center(i);this.icon('snow',p.x+17,p.y+14,12,'#b2dbee');}});g.restore();}
 if(this.anim){
  let a=this.anim,n=Math.max(0,(a.elapsed-.12)/.12),nodes=[a.old,...a.route],f=Math.min(nodes.length-1,n),idx=Math.floor(f),p1=this.center(nodes[idx]),p2=this.center(nodes[Math.min(idx+1,nodes.length-1)]),u=f-idx;
  let ease=1-Math.pow(1-u,2),hx=p1.x+(p2.x-p1.x)*ease,hy=p1.y+(p2.y-p1.y)*ease,pose=a.elapsed<.12?1:u<.65?2:3;
  this.circle(hx,hy+18,22,'rgba(5,23,27,.3)');this.motion(pose,hx,hy-4,77,Math.sin(n*8)*.06);
  if(a.elapsed>.12&&n<a.route.length){g.save();g.translate(hx,hy);g.rotate(Math.atan2(p2.y-p1.y,p2.x-p1.x));g.strokeStyle='#fff2c6';g.lineWidth=4;g.lineCap='round';g.globalAlpha=(1-u)*.9;g.beginPath();g.arc(0,0,33,-1.4+u*.9,1.1+u*.9);g.stroke();g.lineWidth=1.5;g.strokeStyle=P.gold;g.beginPath();g.arc(0,0,40,-.9+u,1.15+u);g.stroke();g.restore();}
 }else{
  let p=this.center(r.hero),hurt=this.hurtUntil>this.t;this.circle(p.x,p.y+16,24,'rgba(241,193,105,.18)',hurt?P.coral:'rgba(224,192,128,.5)');
  if(r.shield){g.save();g.strokeStyle='rgba(222,201,139,.85)';g.lineWidth=2;g.beginPath();g.ellipse(p.x,p.y,30,33,0,0,Math.PI*2);g.stroke();this.icon('shield',p.x-25,p.y+11,17);g.restore();}
  this.motion(r.path.length?1:0,p.x+(hurt?Math.sin(this.t*70)*3:0),p.y-5+Math.sin(this.t*2)*1.3,71,0,hurt&&Math.sin(this.t*45)<0?.65:1);this.text('探险家',p.x,p.y+25,8,P.gold,'center',650);
 }
 if(this.skillEffect&&this.skillEffect.until>this.t&&!this.anim){let e=this.skillEffect,p=this.center(e.index),f=(e.until-this.t)/1.6,c=e.id==='heal'?P.mint:e.id==='prism'?'#d0b5eb':e.id==='freeze'?'#b2dbee':P.gold;g.save();g.globalAlpha=f;g.lineWidth=2;this.circle(p.x,p.y,27+(1-f)*22,'rgba(0,0,0,0)',c);g.restore();}
 if(r.hint.length&&!route.length){g.save();g.setLineDash([4,5]);g.strokeStyle=P.mint;g.lineWidth=2;g.beginPath();let p=this.center(r.hero);g.moveTo(p.x,p.y);for(let i of r.hint){p=this.center(i);g.lineTo(p.x,p.y);}g.stroke();g.restore();}
 for(let p of this.particles)this.circle(p.x,p.y,p.r,p.color);
 let pv=r.preview(),len=pv.kills||0;this.skin('panel',17,635,386,188);
 this.text(len?len+' 连击  /  破甲力 '+pv.power:'从探险家身边连接 3 只同色生物',28,651,13,len?P.gold:P.ink,'left',len?650:400);this.text(len&&pv.damage?'预计 −'+pv.damage+' 生命':len?'安全落点':'斜向也能连接',392,651,11,pv.damage?P.coral:P.muted,'right');
 C.SKILLS.forEach((sk,i)=>{let x=28+i*95,v=r.skillInfo(sk.id),pressed=this.pressed===sk.id,dy=pressed?2:0;this.skin('plain',x,669+dy,80,61);this.icon(sk.icon,x+19,685+dy,24,v.ok?P.ink:'#718f80');this.text(sk.label,x+36,685+dy,13,P.ink,'left',650);this.text(sk.summary,x+40,704+dy,10,P.ink,'center');this.text(sk.cost+' 能量',x+40,720+dy,10,r.energy>=sk.cost?P.gold:P.muted,'center');this.hit(sk.id,x,669,80,61,()=>this.openSkill(sk.id));});
 this.button('clear',28,736,64,56,'重选',()=>{r.path=[];r.hint=[];});this.button('attack',102,736,216,56,this.anim?'连斩 '+this.anim.emitted+' / '+this.anim.events.length:len?'斩击  ·  '+len+' 连击':r.path.includes(r.exit)?'通过出口':'连线后斩击',()=>this.attack(),'gold',!pv.commit||!!this.anim);this.button('hint',328,736,64,56,'寻路',()=>{r.path=[];r.hint=r.findPath();this.toast('虚线是可连接路线，沿线拖动即可');});this.text('能量 '+r.energy+' / 12',32,807,11,P.muted);this.text('战利品 '+r.bag+' 芽素 · '+r.dust+' 星尘',388,807,11,P.muted,'right');
 for(let f of this.floaters)this.text(f.text,f.x,f.y,20,f.color,'center',700);
 }
 drawTile(t,i,selected){
  let p=this.center(i),g=this.ctx,phase=t.phase||i*.77,dy=Math.sin(this.t*2+phase)*1.3,rot=Math.sin(this.t*1.5+phase)*.02;
  if(selected){this.circle(p.x,p.y,27,'rgba(238,201,114,.2)','#ebd18d');this.circle(p.x,p.y,24,'rgba(241,207,133,.06)');}
  if(t.kind==='rock'){g.save();g.translate(p.x,p.y);g.fillStyle='#647a7b';g.strokeStyle='#b6c3ad';g.lineWidth=1.5;g.beginPath();g.moveTo(-21,7);g.lineTo(-16,-15);g.lineTo(2,-22);g.lineTo(20,-9);g.lineTo(23,10);g.lineTo(8,20);g.lineTo(-15,19);g.closePath();g.fill();g.stroke();g.restore();this.text(t.armor,p.x,p.y,15,P.ink,'center',650);return;}
  let index=t.kind==='boss'?11:t.kind==='crystal'?9:t.armor?4+t.color:t.color,attacking=this.hurtUntil>this.t&&t.color>=0&&!t.armor&&this.run.danger(t,i,this.run.hero);
  let pop=this.spawnAt&&this.t-this.spawnAt<.3?1+Math.sin((this.t-this.spawnAt)/.3*Math.PI)*.045:1,size=(t.kind==='boss'?66:t.kind==='crystal'?50:58)*pop;
  if(attacking)this.motion(t.color+4,p.x,p.y-3,size+5,rot);else this.sprite(index,p.x,p.y-2+dy,size,rot);
  if(t.armor){this.circle(p.x+18,p.y+13,9,'#203b41','#e2cc97');this.text(t.armor,p.x+18,p.y+13,10,P.ink,'center',750);}
  if(t.kind==='spitter'){this.circle(p.x+19,p.y-16,7,'#7a4d43');this.text('↗',p.x+19,p.y-16,11,P.ink,'center',700);}
  if(t.kind!=='crystal'&&t.age+1>=t.wake){this.circle(p.x-18,p.y-18,7,t.age>=t.wake?P.coral:'#b29862');this.text('!',p.x-18,p.y-18,10,P.bg,'center',800);}
  if(selected&&!this.anim){let n=this.run.path.indexOf(i)+1;this.circle(p.x+19,p.y-19,8,P.gold,'#3b4434');this.text(n,p.x+19,p.y-19,9,P.bg,'center',750);}else if(t.kind==='creature')this.circle(p.x,p.y+21,2,COLORS[t.color]);
 }
 nav(){
  this.skin('shelf',12,823,396,56);
  [['battle','sword','远征'],['camp','camp','营地'],['map','map','星图'],['book','book','图鉴']].forEach((v,i)=>{
   let x=65+i*97,active=this.tab===v[0];if(active)this.skin('mint',x-40,828,80,45);
   this.icon(v[1],x-18,850,30);this.text(v[2],x+5,851,13,active?'#233e37':P.ink,'left',700);
   this.hit('nav'+v[0],x-44,826,88,53,()=>this.goToTab(v[0]));
  });
 }

 section(title,sub){this.text(title,28,128,25,P.ink,'left',750);if(sub)this.text(sub,28,158,11,P.muted);}
 camp(){
  this.icon('camp',43,128,34);this.text('星光营地',69,129,25,P.ink,'left',750);
  this.button('campDeparture',268,110,124,47,this.campDepartureLabel(),()=>this.openBattle(),'gold');
  ['生态','研究','遗物'].forEach((n,i)=>{let key=['ecology','research','relics'][i];this.button('ct'+i,25+i*125,173,120,42,n,()=>{this.campTab=key;},this.campTab===key?'mint':'plain');});
  if(this.campTab==='ecology')this.ecology();else if(this.campTab==='research')this.research();else this.relics();
 }
 ecology(){
  C.accrue(this.s);let g=this.ctx,im=this.images.camp;
  this.box(22,231,376,216,P.panel,'#819075',18);if(im){g.save();this.rr(24,233,372,212,17);g.clip();g.drawImage(im,24,233,372,212);let shade=g.createLinearGradient(0,339,0,445);shade.addColorStop(0,'rgba(12,34,39,0)');shade.addColorStop(.5,'rgba(12,34,39,.8)');shade.addColorStop(1,'rgba(12,34,39,.98)');g.fillStyle=shade;g.fillRect(24,339,372,108);g.restore();let glow=g.createRadialGradient(262,334,0,262,334,20);glow.addColorStop(0,'rgba(244,200,105,'+(.12+Math.sin(this.t*2)*.04)+')');glow.addColorStop(1,'rgba(244,200,105,0)');g.fillStyle=glow;g.fillRect(242,314,40,40);}
  this.skin('panel',22,231,376,216,true);this.text('营地产能',40,367,11,P.mint);this.text(C.rate(this.s)>=1000?(C.rate(this.s)/1000).toFixed(1)+'k':C.rate(this.s).toFixed(1),40,397,31,P.ink,'left',750);this.text('芽素 / 小时',150,403,11,P.muted);this.text('已积累 '+Math.floor(this.s.bank)+' / '+Math.floor(C.cap(this.s)),40,428,11,P.muted);
  this.button('collect',266,390,112,38,'领取芽素',()=>{let n=C.collect(this.s);this.toast(n?'收获 '+n+' 芽素':'暂无可领取芽素');this.save();},'gold');
  C.BUILDINGS.forEach((b,i)=>{let y=464+i*80,lv=this.s.build[b.id],cost=C.buildCost(this.s,b.id);this.box(28,y,364,70,P.panel,'#506c5c',15);this.skin('badge',32,y+5,60,60);this.sprite(b.icon,62,y+34,48);this.text(b.name,99,y+22,15,P.ink,'left',650);this.text('Lv.'+lv+'  ·  '+(b.id==='reactor'?'总产能 +'+lv*18+'%':'基础 +'+b.rate*lv+' / 时'),99,y+48,11,P.muted);this.button('build'+b.id,284,y+18,94,35,lv>=20?'已满级':cost+' 芽素',()=>{let old=C.rate(this.s);if(C.upgrade(this.s,b.id)){this.toast('产能 '+old.toFixed(1)+' → '+C.rate(this.s).toFixed(1)+' / 时');this.audio('win');this.save();}else this.toast('芽素不足，远征或领取营地产出');},'gold',lv>=20);});
  this.box(28,716,364,77,'#2c4545','#607365',16);this.icon('star',49,740,17,P.gold);this.text('共生蜕变 · '+this.s.rank+' 阶',66,740,14,P.gold,'left',650);this.text('完成 12 站，永久提高收益 25%',45,767,11,P.muted);this.button('ascend',294,733,82,42,'蜕变',()=>{this.modal={type:'ascend'};});
 }
 research(){
  const icons=['leaf','sword','heart','camp','upgrade','prism'];
  C.RESEARCH.forEach((r,i)=>{
   let y=232+i*85,lv=this.s.research[r.id];this.box(28,y,364,76,P.panel,'#385550',14);
   this.skin('badge',36,y+14,45,45);this.icon(icons[i],58,y+36,28);
   this.text(r.name,91,y+23,15,P.ink,'left',700);this.text('Lv.'+lv+' / '+r.max,270,y+23,10,P.muted,'right');this.text(r.desc,91,y+50,11,P.muted);
   this.button('research'+r.id,284,y+18,92,40,lv>=r.max?'已完成':C.researchCost(this.s,r.id)+' 芽素',()=>{if(C.research(this.s,r.id)){this.toast('研究完成，下次远征生效');this.save();}else this.toast('芽素不足');},'gold',lv>=r.max);
  });this.text('蜕变后保留研究等级',32,770,12,P.muted);
 }

 relics(){this.text('已携带 '+this.s.equip.length+' / 3',28,235,12,P.muted);C.RELICS.forEach((r,i)=>{let col=i%2,row=Math.floor(i/2),x=28+col*187,y=255+row*133,owned=this.s.relics.includes(r.id),active=this.s.equip.includes(r.id);this.box(x,y,177,121,active?'#2c4e47':P.panel,active?'#a9b991':'#3b5651',15);this.sprite(r.icon,x+29,y+30,40);this.text(r.name,x+55,y+24,13,P.ink,'left',650);this.text(active?'已携带':owned?'已获得':r.cost+' 星尘',x+55,y+45,10,active?P.mint:P.gold);this.text(r.desc,x+12,y+69,10,P.muted);this.button('relic'+r.id,x+12,y+86,153,25,active?'卸下':owned?'携带':'制作',()=>{if(!owned){if(!C.buyRelic(this.s,r.id)){this.toast('星尘不足');return;}this.toast('遗物已制作');}else if(!C.equip(this.s,r.id))this.toast('最多携带 3 件，先卸下一件');this.save();},active?'mint':'plain');});}
 map(){let biome=C.BIOMES[this.mapPage];this.section('远征星图','6 个区域 · 36 个关卡');for(let i=0;i<6;i++){let x=45+i*66,active=this.mapPage===i;this.skin('badge',x-23,172,46,46);if(active)this.circle(x,196,14,'rgba(239,193,105,.7)');this.text(String(i+1).padStart(2,'0'),x,195,13,active?P.bg:P.muted,'center',650);this.hit('biome'+i,x-23,172,46,46,()=>this.mapPage=i);}this.box(28,233,364,94,'#203f40','#456358',17);this.text(biome.name,48,261,24,biome.color,'left',700);this.text(biome.rule,48,293,12,P.muted);for(let i=0;i<6;i++){let n=this.mapPage*6+i+1,inf=C.stageInfo(n),unlocked=n<=this.s.stage,x=28+(i%2)*187,y=348+Math.floor(i/2)*116,stars=this.s.stars[n]||0;this.box(x,y,177,100,unlocked?P.panel:'#142f33',unlocked?'#849577':'#344a47',17);let bg=this.images.biomes;if(bg){let gg=this.ctx;gg.save();this.rr(x+1,y+1,175,98,16);gg.clip();let sw=bg.width/3,sh=bg.height/2;gg.drawImage(bg,(this.mapPage%3)*sw,Math.floor(this.mapPage/3)*sh,sw,sh,x,y,177,100);gg.fillStyle=unlocked?'rgba(9,32,39,.65)':'rgba(9,32,39,.88)';gg.fillRect(x,y,177,100);gg.restore();}this.skin('panel',x,y,177,100,true);this.text(String(n).padStart(2,'0'),x+16,y+27,21,unlocked?P.ink:'#5b726b','left',650);this.text(inf.boss?'星冠守卫':inf.name,x+60,y+24,14,unlocked?P.ink:P.muted,'left',600);this.text(unlocked?'目标 '+inf.quota+' · '+(inf.boss?'击破守卫':'采集生物'):'通过前一站解锁',x+16,y+53,11,P.muted);this.text(stars?'★'.repeat(stars)+'☆'.repeat(3-stars):unlocked?'点击前往 →':'未解锁',x+16,y+79,12,stars?P.gold:P.muted);this.hit('level'+n,x,y,177,100,()=>unlocked?this.startLevel(n):this.toast('先完成前面的远征'));}this.box(28,713,364,82,'#263e42','#6b7180',16);this.text('每日观测',46,738,16,P.ink,'left',650);this.text(C.dayKey()+' · 相同种子，每日首胜额外奖励',46,763,10,P.muted);this.button('daily',294,731,81,42,'挑战',()=>this.startLevel(10,'daily'),'gold');}
 book(){this.section('生物图鉴','已记录 '+this.s.codex.filter(n=>n>0).length+' / '+C.SPECIES.length);this.button('species',28,179,178,35,'生物图鉴',()=>this.bookPage=0,this.bookPage===0?'mint':'plain');this.button('quests',214,179,178,35,'探索委托',()=>this.bookPage=1,this.bookPage===1?'mint':'plain');if(this.bookPage===1){C.QUESTS.forEach((q,i)=>{let y=234+i*88,val=Math.min(q.target,q.value(this.s)),claimed=this.s.quests.includes(q.id);this.box(28,y,364,79,P.panel,P.line,15);this.text(q.name,44,y+20,15,P.ink,'left',650);this.text(q.desc+'  '+Math.floor(val)+'/'+q.target,44,y+43,11,P.muted);this.text(q.coins+' 芽素 · '+q.dust+' 星尘',44,y+63,10,P.gold);this.button('quest'+q.id,294,y+21,82,36,claimed?'已领取':'领取',()=>{if(C.claim(this.s,q.id)){this.toast('奖励已领取');this.save();}else this.toast('目标尚未完成');},'gold',claimed);});return;}C.SPECIES.forEach((s,i)=>{let x=28+i%3*125,y=236+Math.floor(i/3)*166,n=this.s.codex[i],discovered=n>0;this.box(x,y,114,150,P.panel,discovered?'#68816a':'#36514b',15);this.sprite(i===8?11:i,x+57,y+48,80,Math.sin(this.t+i)*.02,discovered?1:.32);this.text(s.name,x+57,y+99,13,discovered?P.ink:P.muted,'center',600);this.text(discovered?'已观察 '+n+' 次':'未记录',x+57,y+123,10,P.muted,'center');this.hit('bio'+i,x,y,114,150,()=>this.modal={type:'species',index:i});});this.text('累计击倒 '+this.s.kills+' · 最长连击 '+this.s.best,28,758,12,P.muted);this.button('settings',28,781,364,30,'设置与说明',()=>this.modal={type:'settings'});}
 drawGuide(){this.hits=[];let g=this.ctx;g.fillStyle='rgba(7,21,24,.62)';g.fillRect(0,0,420,880);this.box(28,299,364,302,'#e9ddbd',null,24);this.sprite(8,82,353,79);this.text('操作说明',139,352,23,P.bg,'left',750);this.text('1',55,421,17,'#748660','center',700);this.text('从探险家身边，拖过相邻同色生物',78,421,13,P.bg);this.text('2',55,457,17,'#748660','center',700);this.text('松手保留路线，点击「斩击」出手',78,457,13,P.bg);this.text('3',55,493,17,'#748660','center',700);this.text('8 连生成星核，经过星核可以换色',78,493,13,P.bg);this.button('begin',49,537,322,44,'开始远征',()=>{this.guide=false;this.s.tutorial=false;this.run.hint=[31,32,25,24,18,19,13,12];this.save();},'gold');}
 drawSkillModal(){
  const r=this.run,v=r.skillInfo(this.modal.id),g=this.ctx;
  if(!v.id){this.modal=null;return;}
  this.box(26,184,368,540,P.panel,P.line,24);
  this.skin('badge',43,203,74,74);this.icon(v.icon,80,240,45);
  this.text(v.label,127,229,27,P.ink,'left',750);
  this.text(v.name+' · 技能',129,256,12,P.muted);
  this.icon('close',365,216,18);this.hit('modalclose',343,194,44,44,()=>this.modal=null);
  this.box(51,286,318,97,'rgba(8,29,33,.58)','rgba(166,191,153,.25)',16);
  if(v.id==='prism'){
   const dx=v.target<0?0:v.target%6-r.hero%6,dy=v.target<0?0:Math.floor(v.target/6)-Math.floor(r.hero/6);
   for(let row=-1;row<=1;row++)for(let col=-1;col<=1;col++){
    let x=91+col*22,y=333+row*22;
    this.circle(x,y,8,'#274b4c',v.target>=0&&col===dx&&row===dy?'#d0b5eb':'#49655e');
    if(col===0&&row===0)this.motion(0,x,y,25);
    else if(v.target>=0&&col===dx&&row===dy)this.icon('prism',x,y,17);
   }
   const direction=['左上方','正上方','右上方','左侧','','右侧','左下方','正下方','右下方'][(dy+1)*3+dx+1];
   this.text(v.target>=0?direction+' → 星核':'没有转换目标',145,320,20,P.ink,'left',700);
   this.text('星核与守卫不会被转换',145,352,11,P.muted);
  }else{
   const preview=v.id==='heal'?'生命 '+r.hp+' → '+(r.hp+v.amount):v.id==='shield'?'护盾 '+r.shield+' → '+(r.shield+v.amount):'停攻 '+r.frozen+' → '+v.amount+' 回合';
   const note=v.id==='heal'?(v.amount?'本次恢复 '+v.amount+' 点 · 上限 '+r.maxHp:'生命已满，无需恢复'):v.id==='shield'?'可抵挡的伤害点数':'接下来 2 次斩击后不受敌人攻击';
   this.text(preview,210,320,24,v.id==='freeze'?'#b2dbee':P.mint,'center',700);
   this.text(note,210,354,12,P.muted,'center');
  }
  this.wrap(v.detail,53,410,312,15,P.ink,23);
  this.wrap(v.tip,53,483,312,12,P.muted,20);
  if(v.id==='prism')this.text('使用后需重新连线'+(r.path.length?'，当前路线会清空':''),210,535,12,P.coral,'center');
  this.line(53,551,367,551,'rgba(162,182,139,.3)');
  this.text('消耗 '+v.cost+' 能量',53,571,14,P.gold,'left',650);
  this.text('当前 '+r.energy+' / 12',367,571,13,r.energy>=v.cost?P.ink:P.coral,'right');
  this.text('斩击获得能量 · 使用技能不占回合',210,594,11,P.muted,'center');
  this.button('useSkill',51,613,318,46,v.ok?'使用 · '+v.cost+' 能量':v.reason,()=>this.useSkill(v.id),'gold',!v.ok,v.reason);
  this.button('cancelSkill',51,670,318,36,'返回战斗',()=>this.modal=null);
 }
 drawModal(){let m=this.modal,g=this.ctx;this.hits=[];g.fillStyle='rgba(4,17,21,.78)';g.fillRect(0,0,420,880);if(m.type==='skill'){this.drawSkillModal();return;}let y=220,h=450;if(m.type==='help'){y=143;h=640;}if(m.type==='result'){y=182;h=521;}this.box(26,y,368,h,'#1d3b3d','#7b8b72',24);if(!['result'].includes(m.type)){this.icon('close',365,y+27,18);this.hit('modalclose',343,y+6,44,44,()=>this.modal=null);}if(m.type==='result'){let r=m.result;this.sprite(r.win?10:8,210,y+64,102,Math.sin(this.t)*.04);this.text(r.win?'远征完成':'远征失败',210,y+139,27,P.ink,'center',750);this.text(r.win?'':'保留 60% 芽素与全部星尘',210,y+176,12,P.muted,'center');this.text(r.win?'★'.repeat(r.stars)+'☆'.repeat(3-r.stars):'',210,y+215,r.win?31:16,P.gold,'center');this.line(56,y+244,364,y+244);this.text('带回芽素',64,y+278,13,P.muted);this.text('+'+r.coins,354,y+278,22,P.mint,'right',700);this.text('带回星尘',64,y+316,13,P.muted);this.text('+'+r.dust,354,y+316,22,P.gold,'right',700);this.text(r.turns+' 回合  ·  最长 '+r.best+' 连击  ·  观察 '+r.kills+' 次',210,y+359,12,P.muted,'center');this.button('next',51,y+392,318,46,r.win?'继续远征':'重新出发',()=>this.openBattle(),'gold');this.button('toCamp',51,y+449,318,38,'回营地',()=>this.goToTab('camp'));}
 else if(m.type==='help'){this.text('探险家生存手册',50,y+32,21,P.ink,'left',700);let lines=[['连线与斩击','从角色相邻位置开始，可横、竖、斜向连接。至少 3 只同色生物；松手后点击斩击。'],['星核与破甲','8 连击在起点留下星核。经过星核可以换色，并增加 2 点破甲力。装甲数字是进入前所需破甲力。'],['看清危险落点','「!」表示生物即将苏醒。醒来的邻近敌人会攻击落点，喷射者可攻击两格。每回合最多受 2 点伤害。'],['出口与撤离','完成采集目标并击败区域守卫后，顶部出口点亮。连线到出口即可结算全部收获。'],['营地产出','建筑自动产出芽素。初始离线储存上限 8 小时，可研究扩容。'],['技能与能量','点技能查看效果，再点使用。斩击恢复至少 1 点能量：8 连回复 2 点，12 连回复 3 点，上限 12 点。']];let yy=y+78;for(let [head,body]of lines){this.text(head,50,yy,14,P.gold,'left',650);this.wrap(body,50,yy+26,317,12,P.muted,20);yy+=86;}this.text('技能不推进回合；斩击才会让敌人苏醒。',50,y+603,11,P.mint);}
 else if(m.type==='species'){let i=m.index;this.sprite(i===8?11:i,210,y+100,146);this.text(C.SPECIES[i].name,210,y+201,25,P.ink,'center',700);this.wrap(C.SPECIES[i].note,57,y+248,306,15,P.muted,26);this.text('观察记录：'+this.s.codex[i]+' 次',210,y+345,13,P.gold,'center');this.button('closeBio',54,y+385,312,40,'继续观察',()=>this.modal=null,'mint');}
 else if(m.type==='settings'){this.text('设置与说明',50,y+37,22,P.ink,'left',700);this.button('soundToggle',50,y+88,320,48,'音效：'+(this.s.sound?'开启':'关闭'),()=>{this.s.sound=!this.s.sound;this.save();});this.text('星壤远征  ·  v1.2.1',50,y+166,16,P.ink);this.wrap('存档保存在当前设备。试玩版与微信端存档独立，不会自动跨设备同步。',50,y+205,316,13,P.muted,24);this.wrap('本版本不需要登录，不收集姓名、位置或联系方式，未接入支付、广告与联网排行。',50,y+284,316,13,P.muted,24);}
 else if(m.type==='ascend'){this.text('共生蜕变',50,y+37,23,P.ink,'left',700);this.sprite(9,210,y+116,95);this.wrap('条件：完成 12 个不同关卡。每次蜕变：战斗收益与营地产能永久 +25%。',50,y+195,317,14,P.ink,26);this.wrap('重置：关卡、建筑等级、芽素和库存。保留：研究、星尘、遗物、图鉴和委托。',50,y+292,317,12,P.muted,24);this.button('doAscend',50,y+376,320,45,'确认蜕变 · '+this.s.cleared.length+' / 12 站',()=>{if(C.ascend(this.s)){this.newRun(1);this.toast('蜕变完成：收益与产能 +25%');}else this.toast('需完成 12 个不同关卡');},'gold',this.s.cleared.length<12);}
 else if(m.type==='confirm'){this.text(m.title,50,y+50,24,P.ink,'left',700);m.lines.forEach((line,i)=>this.text(line,50,y+137+i*32,14,P.muted));this.button('confirmYes',50,y+270,320,48,'确认并出发',m.action,'gold');this.button('confirmNo',50,y+336,320,48,'继续当前远征',()=>this.modal=null);}}
}
return {App};
});
