// Standalone deterministic original art + audio generator. No packages or licensing issues.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const ROOT=path.resolve(__dirname,'..');
const artDir=path.join(ROOT,'assets/resources/art');
const audioDir=path.join(ROOT,'assets/resources/audio');
fs.mkdirSync(artDir,{recursive:true});fs.mkdirSync(audioDir,{recursive:true});
const P=192;
const pix=new Uint8ClampedArray(P*P*4);
function fresh(){pix.fill(0);}
function blend(x,y,r,g,b,a){x=Math.round(x);y=Math.round(y);if(x<0||x>=P||y<0||y>=P)return;
 const j=(y*P+x)*4,k=Math.max(0,Math.min(1,a));const da=pix[j+3]/255;
 const oa=k+da*(1-k);if(oa<0.00001)return;
 pix[j]=Math.round((r*k+pix[j]*da*(1-k))/oa);pix[j+1]=Math.round((g*k+pix[j+1]*da*(1-k))/oa);
 pix[j+2]=Math.round((b*k+pix[j+2]*da*(1-k))/oa);pix[j+3]=Math.round(oa*255);
}
function circle(cx,cy,rad,c,a=1){const xmin=Math.max(0,Math.floor(cx-rad-1)),xmax=Math.min(P-1,Math.ceil(cx+rad+1));
 for(let y=Math.max(0,Math.floor(cy-rad-1));y<=Math.min(P-1,Math.ceil(cy+rad+1));y++)for(let x=xmin;x<=xmax;x++){
 const d=Math.hypot(x-cx,y-cy);if(d<rad+0.5)blend(x,y,...c,a*Math.min(1,Math.max(0,rad+0.5-d)));}}
function glow(cx,cy,rad,c,str=0.35){
 for(let y=Math.max(0,Math.floor(cy-rad));y<Math.min(P,Math.ceil(cy+rad));y++)for(let x=Math.max(0,Math.floor(cx-rad));x<Math.min(P,Math.ceil(cx+rad));x++){
  const d=Math.hypot(x-cx,y-cy)/rad;if(d<1)blend(x,y,...c,str*(1-d)**2);
 }
}
function polygon(points,c,a=1){
 const lo=Math.max(0,Math.floor(Math.min(...points.map(p=>p[1])))),hi=Math.min(P-1,Math.ceil(Math.max(...points.map(p=>p[1]))));
 for(let y=lo;y<=hi;y++){
  const xs=[];for(let i=0;i<points.length;i++){
    const p=points[i],q=points[(i+1)%points.length];if((p[1]<=y+0.5&&q[1]>y+0.5)||(q[1]<=y+0.5&&p[1]>y+0.5))xs.push(p[0]+(y+0.5-p[1])*(q[0]-p[0])/(q[1]-p[1]));
  }xs.sort((a,b)=>a-b);
  for(let i=0;i+1<xs.length;i+=2)for(let x=Math.max(0,Math.floor(xs[i]));x<=Math.min(P-1,Math.ceil(xs[i+1]));x++)blend(x,y,...c,a);
 }
}
function line(x1,y1,x2,y2,width,c,a=1){const r=width/2;
 for(let y=Math.max(0,Math.floor(Math.min(y1,y2)-r));y<=Math.min(P-1,Math.ceil(Math.max(y1,y2)+r));y++)for(let x=Math.max(0,Math.floor(Math.min(x1,x2)-r));x<=Math.min(P-1,Math.ceil(Math.max(x1,x2)+r));x++){
  const dx=x2-x1,dy=y2-y1,t=dx*dx+dy*dy===0?0:Math.max(0,Math.min(1,((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy)));
  const d=Math.hypot(x-x1-t*dx,y-y1-t*dy);if(d<r+0.5)blend(x,y,...c,a*Math.min(1,Math.max(0,r+0.5-d)));
 }
}
function ring(cx,cy,r,w,c,a=1){
 for(let y=Math.max(0,Math.floor(cy-r-w));y<Math.min(P,Math.ceil(cy+r+w));y++)for(let x=Math.max(0,Math.floor(cx-r-w));x<Math.min(P,Math.ceil(cx+r+w));x++){
  const d=Math.abs(Math.hypot(x-cx,y-cy)-r);if(d<w/2+0.5)blend(x,y,...c,a*Math.min(1,Math.max(0,w/2+0.5-d)));
 }
}
let CRC_T=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;CRC_T.push(c>>>0);}
function crc(buf){let c=0xffffffff;for(let i=0;i<buf.length;i++)c=CRC_T[(c^buf[i])&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),n=Buffer.alloc(4);n.writeUInt32BE(data.length);
 const payload=Buffer.concat([name,data]),check=Buffer.alloc(4);check.writeUInt32BE(crc(payload));return Buffer.concat([n,payload,check]);}
function save(name){const header=Buffer.alloc(13);header.writeUInt32BE(P,0);header.writeUInt32BE(P,4);header[8]=8;header[9]=6;
 const raw=Buffer.alloc((P*4+1)*P);for(let y=0;y<P;y++){raw[y*(P*4+1)]=0;for(let x=0;x<P*4;x++)raw[y*(P*4+1)+1+x]=pix[y*P*4+x];}
 const data=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
 fs.writeFileSync(path.join(artDir,name+'.png'),data);console.log('art',name,(data.length/1024).toFixed(1)+'KB');}
function hull(name,primary,secondary){
 fresh();glow(96,96,90,primary,0.15);glow(96,120,36,secondary,0.55);
 // thruster flames: translucent and different from external wings
 polygon([[69,121],[85,139],[84,171],[76,150],[65,142]],secondary,0.7);
 polygon([[123,121],[108,139],[110,171],[120,150],[130,142]],secondary,0.7);
 polygon([[92,135],[101,135],[96,180]],primary,0.7);
 polygon([[26,123],[42,78],[75,100],[95,50],[117,100],[152,77],[168,123],[126,130],[119,113],[110,147],[81,147],[70,115],[61,131]],[32,55,71]);
 polygon([[26,122],[54,79],[87,118],[63,116],[51,132]],primary,0.80);
 polygon([[166,122],[138,79],[105,118],[129,116],[141,132]],primary,0.80);
 polygon([[39,117],[59,102],[79,119],[60,130]],[99,118,131]);
 polygon([[153,117],[133,102],[113,119],[132,130]],[99,118,131]);
 polygon([[67,118],[96,26],[125,118],[117,145],[76,145]],[44,71,90]);
 polygon([[76,113],[96,31],[100,104],[92,135]],[166,191,204]);
 polygon([[101,33],[116,111],[110,139],[96,125]],[79,115,127]);
 polygon([[88,109],[96,68],[104,109],[96,123]],primary);
 polygon([[90,105],[96,80],[101,106],[96,112]],[244,255,255]);
 polygon([[73,131],[83,146],[105,146],[118,131],[105,138],[86,138]],[212,219,221]);
 line(60,105,41,114,3,[224,232,238],0.6);line(132,105,151,114,3,[224,232,238],0.6);
 circle(69,116,3,secondary);circle(123,116,3,secondary);
 ring(96,112,21,2,primary,0.4);
 save(name);
}
function makeHunter(elite){fresh();const red=elite?[251,153,95]:[251,87,112];glow(96,96,85,red,0.35);
 for(let k=0;k<8;k++){
 const a=k*Math.PI/4;
 const xy=(r,shift=0)=>[96+Math.cos(a+shift)*r,96+Math.sin(a+shift)*r];
 polygon([xy(38,-0.14),xy(79),xy(38,0.14),xy(29)],[65,41,61],0.98);
 polygon([xy(43,-0.11),xy(70),xy(43,0.06)],red,0.85);
 }
 ring(96,96,49,8,[113,49,79],0.75);ring(96,96,39,4,red,0.8);
 polygon([[96,57],[128,78],[131,111],[96,135],[61,111],[64,78]],[20,25,45]);
 polygon([[96,68],[116,84],[115,108],[96,122],[76,108],[75,84]],[112,57,75]);
 glow(96,94,30,red,0.48);circle(96,96,21,red,0.95);circle(96,96,10,[253,237,222]);
 ring(96,96,55,3,red,0.7);
 save(elite?'hunter-elite':'hunter');}
function makeShard(gold){fresh();const c=gold?[255,195,99]:[97,237,228];glow(96,96,76,c,0.4);
 polygon([[96,24],[139,85],[115,151],[96,174],[78,151],[53,85]],[22,76,100],0.65);
 polygon([[96,27],[137,87],[96,169]],[gold?245:64,gold?149:189,gold?59:208]);
 polygon([[96,27],[53,87],[96,169]],[gold?251:94,gold?204:250,gold?108:245]);
 polygon([[96,28],[79,84],[96,170]],[236,248,255],0.75);
 polygon([[96,28],[123,80],[96,76]],[255,255,255],0.84);
 polygon([[55,85],[96,80],[138,85],[96,109]],c,0.75);
 line(96,25,96,166,2,[255,255,255],0.52);
 for(let i=0;i<4;i++){const a=i*Math.PI/2;const x=96+Math.cos(a)*73,y=96+Math.sin(a)*73;
  line(x-7,y,x+7,y,1.7,c,0.67);line(x,y-7,x,y+7,1.7,c,0.67);}
 save(gold?'shard-gold':'shard');}
function makePad(){fresh();glow(96,96,90,[88,210,220],0.32);
 ring(96,96,65,10,[37,84,115],0.92);ring(96,96,58,3,[96,228,225],0.9);ring(96,96,42,12,[29,71,90],0.95);
 for(let i=0;i<10;i++){const a=i*Math.PI/5;
  line(96+Math.cos(a)*55,96+Math.sin(a)*55,96+Math.cos(a)*70,96+Math.sin(a)*70,5,[137,218,233],0.8);}
 for(let i=0;i<6;i++){const a=i*Math.PI/3;
  circle(96+Math.cos(a)*43,96+Math.sin(a)*43,4,[255,216,143]);}
 polygon([[96,59],[122,82],[118,114],[96,137],[72,114],[70,82]],[47,101,118]);
 glow(96,96,25,[96,239,237],0.7);circle(96,96,15,[94,237,229],0.84);circle(96,96,7,[246,252,254]);
 save('pad');}
hull('hero',[93,236,220],[48,156,225]);
hull('hero-ember',[255,122,112],[255,177,99]);
hull('hero-stellar',[247,207,137],[178,158,255]);
makeHunter(false);makeHunter(true);makeShard(false);makeShard(true);makePad();
// Original synthesized sound effects, 16kHz 16-bit mono WAV, no external music samples.
const SR=16000;
function wav(name,seconds,f){const n=Math.floor(seconds*SR),data=Buffer.alloc(44+n*2);
 data.write('RIFF',0);data.writeUInt32LE(data.length-8,4);data.write('WAVE',8);data.write('fmt ',12);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(1,22);data.writeUInt32LE(SR,24);data.writeUInt32LE(SR*2,28);data.writeUInt16LE(2,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(n*2,40);
 for(let i=0;i<n;i++){const t=i/SR;let v=f(t,seconds);v=Math.tanh(v*1.3)*0.72;data.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(v*32767))),44+2*i);}
 fs.writeFileSync(path.join(audioDir,name+'.wav'),data);console.log('audio',name,Math.ceil(data.length/1024)+'KB');}
const TAU=Math.PI*2;
function chord(freq,t){return (Math.sin(TAU*freq*t)+0.3*Math.sin(TAU*freq*2*t)+0.11*Math.sin(TAU*freq*3*t))/1.41;}
function env(t,d){return Math.max(0,1-t/d)**2;}
wav('collect',0.18,(t,d)=>env(t,d)*(0.55*chord(660,t)+0.32*chord(980,t)));
wav('gold',0.32,(t,d)=>env(t,d)*(0.38*chord(670+240*t,t)+0.32*chord(1040+500*t,t)));
wav('damage',0.33,(t,d)=>env(t,d)*(0.36*chord(155-95*t,t)+0.24*Math.sin(TAU*(61*t+65*t*t))));
wav('dash',0.25,(t,d)=>env(t,d)*(0.43*Math.sin(TAU*(750*t-260*t*t))+0.15*chord(250,t)));
wav('pair',0.6,(t,d)=>env(t,d)*([523.25,659.25,783.99,1046.5].reduce((a,f,i)=>a+0.2*Math.sin(TAU*f*(t-i*0.026)),0)));
wav('tap',0.09,(t,d)=>env(t,d)*0.38*chord(480,t));
// 12-second seamless 100 BPM loop in Dm7 - Gm7 - Cmaj7 - Am7.
const chords=[[146.83,174.61,220,261.63],[196,233.08,293.66,349.23],[130.81,164.81,196,246.94],[110,164.81,196,261.63]];
function music(t){const bar=Math.floor(t/3)%4,within=t%3,c=chords[bar];
 const pad=c.reduce((sum,f)=>sum+0.046*(Math.sin(TAU*f*t)+Math.sin(TAU*(f*1.003)*t)*0.4),0);
 const step=Math.floor(within/0.375)%8,bass=c[0]/2;
 const pulse=Math.exp(-(within%0.75)*12)*0.19*chord(bass,t);
 const lead=Math.exp(-(within%0.375)*15)*(step%2===0?0.17:0.09)*chord(c[(step+bar)%4]*2,t);
 const kick=Math.exp(-(within%0.75)*34)*0.16*Math.sin(TAU*(82*t-14*t*t));
 return pad+pulse+lead+kick;
}
wav('music',12,(t)=>music(t)*Math.min(1,t*12,(12-t)*12));
console.log('All assets generated. Open the project in Cocos Creator 3.8.8.');
