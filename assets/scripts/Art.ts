/**
 * Curved, sculpted 3D geometry — not a collection of cuboids, sprites or sliding pictures.
 * Shapes are generated as indexed, lit triangle meshes: ruffled fabric, fluted armour,
 * gilded filigree, masks, crests, arches, thorns and vine-work.
 * Runtime geometry is static; articulation uses Node rotations and positions.
 */
import {
  Node, Mesh, MeshRenderer, Material, Color, Vec3, Layers, utils, gfx,
  Camera, DirectionalLight, SpotLight, Scene, Quat
} from 'cc';
import { LANES, RivalKind } from './Rules';

type P3 = [number,number,number];
const PI = Math.PI;
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const v=(x:number,y:number,z:number):P3=>[x,y,z];
const gold='#CDA76A', goldLight='#F5DA9B', dark='#1E1027', violet='#49304D';
const palette={gold, goldLight, dark, violet, silver:'#CCD1DC', rose:'#B94F63',
  jade:'#7BD4BC', pearl:'#EEE0CA', ink:'#180E21', flame:'#ED9B68', ruby:'#D7456A'};

/** Designed loft/sweep mesh with smooth lighting normals. */
class Form {
  pos:number[]=[]; idx:number[]=[];
  vertex(x:number,y:number,z:number):number { const index=this.pos.length/3;this.pos.push(x,y,z);return index; }
  tri(a:number,b:number,c:number):void {this.idx.push(a,b,c);}
  quad(a:number,b:number,c:number,d:number):void {this.tri(a,b,c);this.tri(b,d,c);}
  add(other:Form, shift:P3=[0,0,0], sc:P3=[1,1,1]):this {
    const offset=this.pos.length/3;
    for(let i=0;i<other.pos.length;i+=3) this.pos.push(
      other.pos[i]*sc[0]+shift[0],other.pos[i+1]*sc[1]+shift[1],other.pos[i+2]*sc[2]+shift[2]);
    other.idx.forEach(k=>this.idx.push(k+offset));
    return this;
  }
  /** Sweeps an asymmetrical radial profile into a unique organic silhouette. */
  lathe(profile:[number,number][], seg=40, x=0,z=0, warp=0):this {
    const base=this.pos.length/3;
    for(let j=0;j<profile.length;j++){
      const [y,r] = profile[j];
      for(let i=0;i<seg;i++){
        const a=i*2*PI/seg;
        const radius=Math.max(.003,r*(1+warp*Math.sin(a*7+y*4)+warp*.42*Math.cos(11*a-2*y)));
        this.vertex(x+Math.cos(a)*radius,y,z+Math.sin(a)*radius*.92);
      }
    }
    for(let j=0;j<profile.length-1;j++)for(let i=0;i<seg;i++){
      const a=base+j*seg+i,b=base+j*seg+(i+1)%seg;
      this.quad(a,a+seg,b,b+seg);
    }
    return this;
  }
  /** Smooth tube path with variable thickness; used for real 3D decorative metalwork. */
  tube(path:P3[],radius:number,seg=8):this {
    if(path.length<2)return this;
    const base=this.pos.length/3;
    for(let j=0;j<path.length;j++){
      const p=path[j],p0=path[Math.max(0,j-1)],p1=path[Math.min(path.length-1,j+1)];
      const t=new Vec3(p1[0]-p0[0],p1[1]-p0[1],p1[2]-p0[2]).normalize();
      const test=Math.abs(t.y)>.85?new Vec3(1,0,0):new Vec3(0,1,0);
      const a=new Vec3();Vec3.cross(a,t,test).normalize();
      const b=new Vec3();Vec3.cross(b,a,t).normalize();
      const taper=(j===0||j===path.length-1)?0.67:1;
      for(let i=0;i<seg;i++){
        const angle=i*2*PI/seg;
        const r=radius*taper*(1+0.10*Math.sin(j*1.2));
        this.vertex(p[0]+r*(Math.cos(angle)*a.x+Math.sin(angle)*b.x),
          p[1]+r*(Math.cos(angle)*a.y+Math.sin(angle)*b.y),
          p[2]+r*(Math.cos(angle)*a.z+Math.sin(angle)*b.z));
      }
    }
    for(let j=0;j<path.length-1;j++)for(let i=0;i<seg;i++)
      this.quad(base+j*seg+i,base+(j+1)*seg+i,base+j*seg+(i+1)%seg,base+(j+1)*seg+(i+1)%seg);
    return this;
  }
  /** Volumetric leaf with a raised spine, not a billboard sprite. */
  leaf(center:P3,dir:P3,width:number,length:number):this {
    const X=new Vec3(...dir).normalize(), Y=new Vec3(0,1,0),
      side=new Vec3();Vec3.cross(side,X,Y).normalize();
    if(side.lengthSqr()<.1) side.set(1,0,0);
    const b=this.pos.length/3,sections=13;
    for(let j=0;j<=sections;j++){
      const t=j/sections, w=Math.sin(PI*t)*width*(1+0.22*Math.sin(t*PI*2)),
      x=center[0]+dir[0]*length*t, y=center[1]+dir[1]*length*t,
      z=center[2]+dir[2]*length*t;
      this.vertex(x-side.x*w,y+0.06*Math.sin(t*PI),z-side.z*w);
      this.vertex(x,y+0.12*Math.sin(t*PI),z);
      this.vertex(x+side.x*w,y+0.06*Math.sin(t*PI),z+side.z*w);
    }
    for(let j=0;j<sections;j++){
      this.quad(b+j*3,b+(j+1)*3,b+j*3+1,b+(j+1)*3+1);
      this.quad(b+j*3+1,b+(j+1)*3+1,b+j*3+2,b+(j+1)*3+2);
    }
    return this;
  }
  /** A pleated cape whose cloth has depth and actual 3D folds. */
  cloak(height:number,width:number,front=-0.12):this {
    const b=this.pos.length/3, cols=32, rows=21;
    for(let j=0;j<=rows;j++){
      const t=j/rows;
      for(let i=0;i<=cols;i++){
        const u=i/cols, a=(u-.5)*PI*.90;
        const spread=(.36+width*t)*Math.sin(a),
          z=front-.08-.72*Math.cos(a)*t-.20*Math.sin(9*a+13*t)*t*t,
          y=height*(1-t)+.11*Math.sin(11*a)*Math.pow(t,1.4)-.07*t*t;
        this.vertex(spread,y,z);
      }
    }
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const p=b+j*(cols+1)+i;
      this.quad(p,p+1,p+cols+1,p+cols+2);
    }
    return this;
  }
  /** Dense carved ornamental crest using leaves and scrolls. */
  ornament(size=1):this {
    for(let k=0;k<2;k++){
      const sign=k===0?-1:1;
      for(let j=0;j<4;j++){
        const path:P3[]=[];
        for(let i=0;i<=24;i++){
          const t=i/24, a=t*PI*(1.15+j*.16)+j*.4;
          path.push([sign*(.04+.23*j+(.26+.10*j)*t*Math.cos(a))*size,
            (.12+j*.10+(.16+.28*j)*t*Math.sin(a))*size, (0.04+.03*j)*size]);
        }
        this.tube(path, .024*size,7);
        this.leaf(path[15],[sign*.28,.52,.01],(.11+.03*j)*size,.36*size);
      }
    }
    return this;
  }
  mesh():Mesh {
    const normals=new Float32Array(this.pos.length);
    for(let i=0;i<this.idx.length;i+=3){
      const a=this.idx[i]*3,b=this.idx[i+1]*3,c=this.idx[i+2]*3;
      const ax=this.pos[b]-this.pos[a],ay=this.pos[b+1]-this.pos[a+1],az=this.pos[b+2]-this.pos[a+2];
      const bx=this.pos[c]-this.pos[a],by=this.pos[c+1]-this.pos[a+1],bz=this.pos[c+2]-this.pos[a+2];
      const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;
      for(const p of [a,b,c]){normals[p]+=nx;normals[p+1]+=ny;normals[p+2]+=nz;}
    }
    for(let i=0;i<normals.length;i+=3){
      const n=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;
      normals[i]/=n;normals[i+1]/=n;normals[i+2]/=n;
    }
    const create=(utils as any).MeshUtils?.createMesh ?? (utils as any).createMesh;
    if(!create)throw new Error('Cocos MeshUtils.createMesh missing');
    return create({positions:this.pos,indices:this.idx,normals:Array.from(normals)});
  }
}
const materials=new Map<string,Material>();
function material(hex:string,metallic=.24,rough=.46):Material {
  const key=hex+'-'+metallic+'-'+rough;
  if(materials.has(key))return materials.get(key)!;
  const m=new Material();m.initialize({effectName:'builtin-standard',states:{rasterizerState:{cullMode:gfx.CullMode.NONE}}});
  const h=hex.replace('#',''); const c=new Color(parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16),255);
  m.setProperty('mainColor',c);
  m.setProperty('metallic',metallic);m.setProperty('roughness',rough);
  materials.set(key,m);return m;
}
const meshCache = new Map<string,Mesh>();
function part(parent:Node,name:string,form:Form,hex:string,location:P3=[0,0,0],metallic=0.24):Node {
  let mesh=meshCache.get(name);
  if(!mesh){mesh=form.mesh();meshCache.set(name,mesh);}
  const n=new Node(name); n.layer=Layers.Enum.DEFAULT;parent.addChild(n);
  n.setPosition(...location);
  const r=n.addComponent(MeshRenderer);r.mesh=mesh;r.setMaterial(material(hex,metallic),0);
  return n;
}
function curve(fn:(t:number)=>P3,n=30):P3[]{return Array.from({length:n+1},(_,i)=>fn(i/n));}
function scroll(x:number,y:number,z:number,scale:number,hand=1):Form {
  const shape=new Form();
  shape.tube(curve(t=>[x+hand*scale*(.50*t*Math.cos(t*PI*3)), y+scale*(.50*t*Math.sin(t*PI*3)),z],36),.023*scale,7);
  return shape;
}

export class CourtArtist {
  static build(scene:Scene):{root:Node,camera:Camera} {
    const root=new Node('Sculpted Velvet Court');root.layer=Layers.Enum.DEFAULT;scene.addChild(root);
    const cameraNode=new Node('Cinematic Camera');root.addChild(cameraNode);
    cameraNode.setPosition(0,9.7,17.8);
    cameraNode.lookAt(new Vec3(0,1.25,-3.5));
    const camera=cameraNode.addComponent(Camera);
    camera.projection=Camera.ProjectionType.PERSPECTIVE;camera.fov=44;camera.near=0.1;camera.far=90;
    camera.clearFlags=7;camera.clearColor=new Color(20,13,30,255);
    camera.priority=0; camera.visibility=Layers.Enum.DEFAULT;
    const lightNode=new Node('Dawn Key Light');root.addChild(lightNode);
    lightNode.setPosition(-3,12,4);lightNode.setRotationFromEuler(-48,-38,0);
    const sun=lightNode.addComponent(DirectionalLight);sun.color=new Color(255,222,185,255);sun.illuminance=40000;
    const fillNode=new Node('Blue court fill');root.addChild(fillNode);
    fillNode.setPosition(6,9,-8);fillNode.setRotationFromEuler(-45,40,0);
    const fill=fillNode.addComponent(DirectionalLight);fill.color=new Color(146,159,242,255);fill.illuminance=10000;
    CourtArtist.stage(root);
    return {root,camera};
  }
  static stage(root:Node):void {
    const floor=new Form();
    // Luxurious ribbed fabric runway sculpted as a continuous surface.
    const z0=-23,z1=9, rows=100, cols=36;
    for(let j=0;j<=rows;j++){
      const t=j/rows,z=mix(z0,z1,t);
      for(let i=0;i<=cols;i++){
        const u=i/cols,x=(u-.5)*11.7;
        const shoulder=Math.pow(Math.abs(2*u-1),6);
        const y=-.30+.05*Math.sin(x*6+.8*z)+.05*Math.cos(z*5)+.10*shoulder;
        floor.vertex(x,y,z);
      }
    }
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const k=j*(cols+1)+i;floor.quad(k,k+cols+1,k+1,k+cols+2);
    }
    part(root,'Velvet silk 3D stage',floor,'#3A1B38');
    // Three glowing inlaid vine tracks (no flat texture marks).
    const gilt=new Form(), alabaster=new Form();
    for(let lane=0;lane<3;lane++){
      const lx=LANES[lane];
      for(let k=0;k<2;k++){
        const x=lx+(k?1.08:-1.08);
        gilt.tube(curve(t=>[x+.12*Math.sin(t*25+lane*2),-.16+.045*Math.sin((t*32)*5),mix(-22,8,t)],110),.025,6);
      }
      for(let j=0;j<12;j++){
        const z=-20+j*2.55;
        const shaped=scroll(lx-.24,-.09,z,.45,j%2?1:-1);
        gilt.add(shaped);
        alabaster.leaf([lx-.42,-.11,z],[.65,.05,.1],.13,.66);
        alabaster.leaf([lx+.42,-.11,z],[-.65,.05,.1],.13,.66);
      }
    }
    part(root,'Inlaid gold flower engravings',gilt,palette.goldLight,[0,0,0],.84);
    part(root,'Ivory hand-carved petals',alabaster,palette.pearl,[0,0,0],.1);
    // Gothic arches, sculpted fluted columns and gilded climbing vines.
    for(const side of [-1,1]){
      for(let j=0;j<4;j++){
        const z=-18+j*7;
        const pedestal=new Form().lathe([[-.4,.80],[-.18,.86],[.05,.59],[.23,.54],[.34,.65]],36,0,0,.055);
        const shaft=new Form().lathe([[.3,.48],[.7,.53],[1.0,.40],[2.0,.39],[3.3,.43],[4.7,.33],[5.1,.56],[5.3,.66]],36,0,0,.09);
        part(root,`Mother of pearl column ${side}:${j}`,pedestal,palette.pearl,[side*6.6,0,z]);
        part(root,`Sculpted fluted capital ${side}:${j}`,shaft,'#7B607D',[side*6.6,0,z]);
        const filigree=new Form();
        for(let p=0;p<3;p++){
          const angle=p*2*PI/3;
          filigree.tube(curve(t=>[
            .42*Math.cos(angle+9*t*PI),.3+5*t,.42*Math.sin(angle+9*t*PI)
          ],85),.035,6);
        }
        part(root,`Spiral gilt column vine ${side}:${j}`,filigree,palette.goldLight,[side*6.6,0,z],.8);
      }
      const crown=new Form();
      for(let k=0;k<5;k++){
        const zz=-17+k*5.9;
        const path=curve(t=>[side*(6.62-.4*Math.sin(t*PI)),5.1+.3*Math.sin(PI*t),zz-1.7+3.4*t],38);
        crown.tube(path,.085,9);
        crown.leaf([side*6.3,5.0,zz],[side*(-.28),.58,.08],.23,.9);
      }
      part(root,`Court arch vine ${side}`,crown,palette.gold,[0,0,0],.82);
    }
    const rear=new Form();
    // Backstage rococo throne relief: concentric lacy scrolls and organic laurels.
    for(let layer=0;layer<4;layer++){
      const R=2.4+layer*.62;
      rear.tube(curve(t=>[
        R*Math.sin(PI*(t*1.20-.10)), 2.7+R*.80*Math.cos(PI*(t*1.20-.1)),0],84),.05+layer*.008,8);
    }
    rear.ornament(3.2);
    part(root,'Hand wrought throne crest',rear,palette.goldLight,[0,.15,-22.7],.9);
    const banners=new Form();
    for(let sign of [-1,1])for(let k=0;k<3;k++){
      const x=sign*(4.0+k*1.25);
      const B=banners.pos.length/3;
      const columns=14, rows2=22;
      for(let j=0;j<=rows2;j++)for(let i=0;i<=columns;i++){
        const t=j/rows2,u=i/columns;
        banners.vertex(x+(u-.5)*1.04*(1+.24*t),5.9-4.2*t+.11*Math.sin(u*7+4*t),
          -21.8+Math.sin(u*PI*4+t*12)*.18);
      }
      for(let j=0;j<rows2;j++)for(let i=0;i<columns;i++){
        const p=B+j*(columns+1)+i;banners.quad(p,p+columns+1,p+1,p+columns+2);
      }
    }
    part(root,'Damask hanging draperies',banners,'#7E3151');
    const petals=new Form();
    for(let i=0;i<90;i++){
      const a=i*2.39996,r=1.0+Math.sqrt(i/90)*7,z=-18+(((i*73)%97)/97)*23;
      petals.leaf([Math.sin(a)*r,-.17,z],[.2*Math.cos(a),.02,.3*Math.sin(a)],.09,.23);
    }
    part(root,'Sculpted fallen rose petals',petals,palette.rose);
  }
  static impact(root:Node,where:Vec3,red=false):Node {
    const n=new Node('Crest splinters - sculpted impact FX');n.layer=Layers.Enum.DEFAULT;
    root.addChild(n);n.setPosition(where);
    const leaves=new Form(), goldDust=new Form();
    for(let i=0;i<16;i++){
      const a=i*2*PI/16;
      const direction:P3=[Math.cos(a)*.85,.28+Math.sin(a*3)*.25,Math.sin(a)*.85];
      leaves.leaf([0,0,0],direction,.085,.7+(i%3)*.18);
      goldDust.tube(curve(t=>[direction[0]*t*.7,.20+direction[1]*t*.8,direction[2]*t*.7],13),.023,5);
    }
    part(n,'Thorn rose / crown flash',leaves,red?palette.ruby:palette.goldLight);
    part(n,'Bright metal splinters',goldDust,red?palette.rose:palette.pearl);
    return n;
  }
  static figure(type:'hero' | RivalKind):Regalia {
    const root=new Node(`Animated sculptural character: ${type}`);
    root.layer=Layers.Enum.DEFAULT;
    const hero=type==='hero', thorn=type==='thorn', treasure=type==='relic', elite=type==='noble';
    const cloth=hero?'#3A496E':thorn?'#722C55':treasure?'#2B766E':elite?'#563C6C':'#782F57';
    const metal=hero?palette.goldLight:thorn?palette.ink:treasure?palette.jade:elite?palette.goldLight:palette.silver;
    const shadow=hero?palette.ink:'#231328';
    // Custom bell-shaped armour, ruffles and layered silk.
    part(root,`${type}: sculpted bodice`,new Form().lathe([[.26,.38],[.4,.56],[.67,.72],[1.00,.64],[1.25,.49],[1.52,.54],[1.78,.44],[1.96,.27]],42,0,0,.13),cloth);
    part(root,`${type}: embroidered cuirass`,new Form().lathe([[.67,.71],[.78,.77],[.90,.7],[1.05,.58],[1.39,.49],[1.49,.61],[1.55,.47]],44,0,0,.055),metal,[0,0,0],.8);
    part(root,`${type}: petticoat`,new Form().lathe([[.18,.82],[.28,.92],[.4,.87],[.55,.71],[.70,.63]],46,0,0,.10),cloth,[0,0,0],.12);
    part(root,`${type}: velvet cloak`,new Form().cloak(1.96,1.60),hero?'#643B70':thorn?'#361129':treasure?'#326B6E':'#7A4059');
    const mask=new Node('Articulated porcelain mask');mask.layer=Layers.Enum.DEFAULT;root.addChild(mask);mask.setPosition(0,1.84,0);
    part(mask,`${type}: carved mask`,new Form().lathe([[-.02,.31],[.06,.44],[.28,.47],[.52,.37],[.62,.21],[.66,.04]],40,0,0,.07),treasure?palette.jade:palette.pearl);
    const brow=new Form();brow.ornament(.40);
    part(mask,`${type}: gold mask diadem`,brow,metal,[0,.22,.40],.85);
    const face=new Form();
    for(let s of [-1,1]){
      face.leaf([s*.26,.29,.373],[s*.20,-.05,.045],.10,.28);
      face.tube(curve(t=>[s*(.14+.15*t),.34-.08*Math.sin(PI*t),.423],18),.029,7);
    }
    part(mask,`${type}: ivory eyelashes`,face,shadow,[0,0,.01],.1);
    const crown=new Node('Articulated 3D crown');crown.layer=Layers.Enum.DEFAULT;mask.addChild(crown);crown.setPosition(0,.61,0);
    const crest=new Form();
    crest.lathe([[0,.26],[.11,.31],[.18,.26],[.24,.31]],48,0,0,.04);
    for(let s=-3;s<=3;s++){
      const a=s*PI/8;
      const path=curve(t=>[
        .30*Math.sin(a)*(1+.55*t), .16+.12*t+( .37+.15*Math.cos(s*2) )*Math.sin(PI*t*.84),
        .28*Math.cos(a)*(1+.32*t)
      ],22);
      crest.tube(path,.042,8);
      crest.leaf(path[17],[.17*Math.sin(a),.67,.06*Math.cos(a)],.085,.24);
    }
    crest.ornament(.32);
    part(crown,`${type}: real crown goldwork`,crest,metal,[0,0,0],.9);
    const crestGem=new Form();
    for(let s of [-2,-1,0,1,2])
      crestGem.leaf([s*.135,.29,.30],[s*.02,.32,.11],.087,.37);
    part(crown,`${type}: royal glass settings`,crestGem,thorn?palette.ruby:hero?palette.jade:palette.ruby,[0,0,.01],.18);
    const limbs:[Node,Node]=[new Node('Left gauntlet'),new Node('Right gauntlet')];
    for(let i=0;i<2;i++){
      const side=i===0?-1:1;
      const arm=limbs[i];arm.layer=Layers.Enum.DEFAULT;root.addChild(arm);arm.setPosition(side*.58,1.46,0);
      part(arm,`${type}: vambrace ${i}`,new Form().lathe([[-.59,.23],[-.34,.19],[-.15,.20],[0,.31],[.10,.27]],36,0,0,.08),cloth);
      const golds=new Form();
      golds.tube(curve(t=>[side*.15*Math.sin(PI*t),-.38+.28*t,.25+.08*Math.cos(t*PI*2)],24),.055,8);
      golds.leaf([0,-.31,.24],[side*.12,.32,.16],.15,.43);
      part(arm,`${type}: engraved gauntlet ${i}`,golds,metal,[0,0,0],.9);
    }
    const feet=new Form();
    for(let side of [-1,1]){
      feet.lathe([[-.05,.2],[.06,.21],[.18,.18],[.38,.20]],27,side*.37,.0,.10);
      feet.leaf([side*.38,0,.10],[side*.05,.06,.34],.21,.48);
    }
    part(root,`${type}: heel shoes`,feet,shadow,[0,0,0],.38);
    if(thorn){
      const spikes=new Form();
      for(let k=0;k<14;k++){
        const a=k*2*PI/14;
        spikes.tube(curve(t=>[
          .42*Math.cos(a)*(1+1.7*t),.85+.6*Math.sin(a*3)+.16*Math.sin(PI*t),
          .42*Math.sin(a)*(1+1.7*t)],20),.07,6);
        spikes.leaf([.8*Math.cos(a),.87,.8*Math.sin(a)],
          [.65*Math.cos(a),.12,.65*Math.sin(a)],.16,.53);
      }
      part(root,`${type}: thorn armour organic spikes`,spikes,palette.ruby,[0,0,0],.5);
    }
    if(treasure){
      const plumes=new Form();
      for(let k=0;k<11;k++){
        const a=k*2*PI/11;
        plumes.leaf([.5*Math.cos(a),1.25,.5*Math.sin(a)],
          [.48*Math.cos(a),.55,.48*Math.sin(a)],.21,.80);
      }
      part(root,'Floating chalice blossoms',plumes,palette.goldLight);
    }
    if(elite){
      const aura=new Form();
      for(let k=0;k<7;k++){
        const a=k*2*PI/7;
        aura.tube(curve(t=>[(.55+.35*t)*Math.cos(a+t*1.2),1.35+.24*Math.sin(2*PI*t+k),(.55+.35*t)*Math.sin(a+t*1.2)],26),.038,7);
      }
      part(root,'Duke aura hand-wrought silver scrolls',aura,palette.goldLight);
    }
    root.setScale(.95,.95,.95);
    return new Regalia(root,mask,crown,limbs);
  }
}
export class Regalia {
  phase=0; private vanityScale=1;
  constructor(readonly root:Node, readonly mask:Node,readonly crown:Node,readonly hands:[Node,Node]){}
  animate(t:number,stress=0,hero=false):void {
    const roll=Math.sin(t*6+this.phase);
    this.root.setRotationFromEuler(0, Math.sin(t*1.7+this.phase)*6, roll*(hero?2:4));
    this.mask.setRotationFromEuler(Math.sin(t*2.4+this.phase)*3,0,roll*2);
    this.hands[0].setRotationFromEuler(0,0,-10+roll*17+stress*30);
    this.hands[1].setRotationFromEuler(0,0,10-roll*17-stress*30);
    this.crown.setScale(this.vanityScale*(1+stress*.16),this.vanityScale*(1+stress*.18),this.vanityScale*(1+stress*.16));
  }
  setVanity(streak:number):void {
    const glow=1+Math.min(15,streak)*.037;
    this.vanityScale=glow;
  }
}
