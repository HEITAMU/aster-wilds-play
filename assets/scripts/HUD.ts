/** Ornate responsive UI, drawn with Cocos Graphics and editable native labels. */
import {
  Node, Canvas, Camera, Graphics, Color, Label, UITransform, Layers,
  LabelOutline, SubContextView
} from 'cc';
import { dateBeijing, bestTitle } from './Rules';

const c=(hex:string,a=255):Color=>{
  const h=hex.replace('#','');return new Color(parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16),a);
};
export interface HUDCallbacks {
  start:()=>void; parry:()=>void; left:()=>void; right:()=>void; bank:()=>void;
  share:()=>void; friends:()=>void; back:()=>void; ad:()=>void;
}
type ViewName='home'|'play'|'result'|'friends';
export class CrownHUD {
  root:Node; private home:Node;private play:Node;private result:Node;private friends:Node;
  private score!:Label;private loose!:Label;private time!:Label;private combo!:Label;
  private bankText!:Label;private toastText!:Label;private resultScore!:Label;private resultBest!:Label;
  private detail!:Label;private adLabel!:Label;private friendFallback!:Label;
  private layer:ViewName='home';
  private readonly CB:HUDCallbacks;
  constructor(canvas:Node,cb:HUDCallbacks,isWeChat:boolean){
    this.root=canvas;this.CB=cb;
    const cam=canvas.getComponent(Canvas)?.cameraComponent;
    if(cam){cam.clearFlags=6;cam.priority=1;cam.visibility=Layers.Enum.UI_2D;}
    this.home=this.panel('HOME',canvas);this.play=this.panel('RUN',canvas);
    this.result=this.panel('RESULT',canvas);this.friends=this.panel('FRIENDS',canvas);
    this.createHome();this.createPlay();this.createResult();this.createFriends(isWeChat);
    this.show('home');
  }
  private panel(name:string,parent:Node):Node{
    const n=new Node(name);n.layer=Layers.Enum.UI_2D;parent.addChild(n);
    n.addComponent(UITransform).setContentSize(720,1280);return n;
  }
  private graphics(parent:Node,name:string,x=0,y=0,w=720,h=1280):Graphics {
    const n=new Node(name);n.layer=Layers.Enum.UI_2D;parent.addChild(n);n.setPosition(x,y,0);
    n.addComponent(UITransform).setContentSize(w,h);return n.addComponent(Graphics);
  }
  private text(parent:Node,name:string,str:string,x:number,y:number,w=650,h=65,size=34,color='#FFF1D7',bold=false):Label{
    const n=new Node(name);n.layer=Layers.Enum.UI_2D;parent.addChild(n);n.setPosition(x,y,0);
    n.addComponent(UITransform).setContentSize(w,h);
    const label=n.addComponent(Label);label.string=str;label.fontSize=size;label.lineHeight=size*1.27;
    label.color=c(color);label.isBold=bold;label.horizontalAlign=Label.HorizontalAlign.CENTER;
    label.verticalAlign=Label.VerticalAlign.CENTER;
    label.overflow=Label.Overflow.SHRINK;return label;
  }
  private backdrop(layer:Node,opacity=204):void {
    const g=this.graphics(layer,'Cloisonne overlay');
    g.fillColor=c('#110D1F',opacity);g.rect(-360,-640,720,1280);g.fill();
    // Scalloped art-nouveau border and 3D-looking illuminated crest.
    for(let sign of [-1,1]){
      g.strokeColor=c('#E6BA79',175);g.lineWidth=4;
      g.moveTo(sign*290,-580);g.bezierCurveTo(sign*340,-280,sign*340,280,sign*290,580);g.stroke();
      for(let y=-460;y<560;y+=114){
        g.lineWidth=2;g.strokeColor=c('#A97866',130);
        g.moveTo(sign*293,y-31);
        g.bezierCurveTo(sign*232,y-30,sign*220,y+21,sign*294,y+35);g.stroke();
      }
    }
    g.lineWidth=3;g.strokeColor=c('#F2D99B',185);
    g.moveTo(-235,515);g.bezierCurveTo(-130,570,130,570,235,515);g.stroke();
    g.moveTo(-235,-510);g.bezierCurveTo(-130,-568,130,-568,235,-510);g.stroke();
  }
  private medallion(p:Node,y:number,size=1):void {
    const g=this.graphics(p,'Hand carved coat of arms',0,y,400,300);
    g.lineWidth=3;g.strokeColor=c('#D8AD72');
    for(let i=0;i<5;i++){
      const d=90-i*12;
      g.moveTo(-d,-25+i*2);g.bezierCurveTo(-d*1.3,45,0,130+i*8,d,35);
      g.bezierCurveTo(d*.8,-40,0,-115-i*4,-d,-25+i*2);g.stroke();
    }
    g.fillColor=c('#BD805C');
    for(let i=0;i<7;i++){
      const x=(i-3)*24, peak=Math.abs(i-3);
      g.moveTo(x-16,38);g.quadraticCurveTo(x-8,100-peak*12,x,90-peak*13);
      g.quadraticCurveTo(x+12,85-peak*12,x+16,38);g.lineTo(x-16,38);g.fill();
    }
    g.fillColor=c('#DBD0AC');g.ellipse(-70,-20,140,45);g.fill();
    g.fillColor=c('#422C44');g.ellipse(-64,-18,128,32);g.fill();
  }
  private pill(parent:Node,id:string,label:string,y:number,onClick:()=>void,wide=484,x=0,accent=false):Node {
    const n=new Node(id);n.layer=Layers.Enum.UI_2D;parent.addChild(n);n.setPosition(x,y,0);
    n.addComponent(UITransform).setContentSize(wide,89);
    const g=n.addComponent(Graphics);
    g.fillColor=c(accent?'#D2AC78':'#412C44',accent?245:235);g.roundRect(-wide/2,-42,wide,84,22);g.fill();
    g.lineWidth=3;g.strokeColor=c('#E9CC98');g.roundRect(-wide/2+5,-37,wide-10,74,17);g.stroke();
    for(const sign of [-1,1]){
      g.lineWidth=2;g.strokeColor=c(accent?'#533349':'#DDBB8C');
      g.moveTo(sign*(wide/2-25),-9);g.bezierCurveTo(sign*(wide/2-60),-22,sign*(wide/2-60),19,sign*(wide/2-25),13);g.stroke();
    }
    this.text(n,id+' label',label,0,0,wide-70,70,31,accent?'#342035':'#F8E6CF',true);
    n.on(Node.EventType.TOUCH_END,()=>onClick());return n;
  }
  private createHome():void {
    this.backdrop(this.home,224);
    this.medallion(this.home,275);
    this.text(this.home,'name','窃 冠 者',0,127,600,105,70,'#FFF0C9',true);
    this.text(this.home,'subname','THE CROWN THIEF',0,54,600,42,20,'#D4AB7F');
    this.text(this.home,'motto','夺走荣耀，戴上他们的王冠',0,-31,600,48,27,'#DFC0A8');
    this.text(this.home,'date',`每日王庭 · 北京时间 ${dateBeijing()}`,0,-113,620,47,24,'#D6C5BA');
    this.pill(this.home,'start-button','进入王庭',-259,this.CB.start,475,0,true);
    this.pill(this.home,'friend-button','好友冠冕榜',-368,this.CB.friends);
    this.text(this.home,'instruction','左右滑动换位 · 点击反击 · 及时封存分数',0,-466,630,50,23,'#C3A1A8');
  }
  private createPlay():void {
    const g=this.graphics(this.play,'top scoreboard');
    g.fillColor=c('#1D142A',228);g.roundRect(-345,428,690,197,27);g.fill();
    g.strokeColor=c('#C89F6B',185);g.lineWidth=3;g.roundRect(-337,435,674,183,23);g.stroke();
    g.fillColor=c('#2A152E',225);g.roundRect(-345,-605,690,212,40);g.fill();
    this.text(this.play,'crown caption','王 庭 荣 耀',-130,574,280,50,25,'#D7B889',true);
    this.score=this.text(this.play,'safe score','0',-110,504,290,78,56,'#FBE9BD',true);
    this.time=this.text(this.play,'timer','58s',237,551,190,62,39,'#F0D2BC',true);
    this.loose=this.text(this.play,'unstored','未封存 0',150,483,340,46,29,'#ED9AB0',true);
    this.combo=this.text(this.play,'combo','连击 ×0',0,410,400,67,34,'#FFE1A3',true);
    this.toastText=this.text(this.play,'impact feedback','',0,180,670,104,56,'#FFE5A4',true);
    this.bankText=this.text(this.play,'bank status','封存冷却 0s',0,-395,430,44,24,'#F7D9AC');
    this.pill(this.play,'left-control','‹ 侧 移',-487,this.CB.left,205,-228);
    this.pill(this.play,'right-control','侧 移 ›',-487,this.CB.right,205,228);
    this.pill(this.play,'parry-control','精准反击',-554,this.CB.parry,239,0,true);
    this.pill(this.play,'bank-control','封存荣耀',-322,this.CB.bank,310,0);
    this.text(this.play,'swipe instruction','滑动换位 · 拳头接近时反击 · 红刺必须闪开',0,356,680,46,22,'#EAD9C5');
  }
  private createResult():void {
    this.backdrop(this.result,239);
    this.medallion(this.result,343);
    this.text(this.result,'result headline','王庭战报',0,183,620,76,60,'#FFEDC2',true);
    this.resultScore=this.text(this.result,'result score','0',0,91,630,104,73,'#F3D49D',true);
    this.resultBest=this.text(this.result,'your rank','无名挑战者',0,4,640,65,38,'#DAB6A4');
    this.detail=this.text(this.result,'result detail','',0,-82,660,90,29,'#F4D6C5');
    this.adLabel=this.text(this.result,'ad status','广告可额外获取装饰碎片，不加分',0,-165,650,52,22,'#CEBDB6');
    this.pill(this.result,'share-card','晒出战绩 · 邀请挑战',-239,this.CB.share,515);
    this.pill(this.result,'again','再战王庭',-346,this.CB.start,515,0,true);
    this.pill(this.result,'double-shards','自愿看广告 · 加倍装饰碎片',-447,this.CB.ad,535);
    this.pill(this.result,'result-menu','返回王庭',-526,this.CB.back,430);
  }
  private createFriends(isWeChat:boolean):void {
    this.backdrop(this.friends,242);
    this.text(this.friends,'friends title','好友冠冕榜',0,500,630,84,58,'#FFE1AC',true);
    this.text(this.friends,'friends date',`每日公平同题 · ${dateBeijing()}`,0,442,640,49,23,'#D6BFA8');
    const area=new Node('Open data context sharedCanvas viewport');
    area.layer=Layers.Enum.UI_2D;this.friends.addChild(area);
    area.setPosition(0,-3,0);area.addComponent(UITransform).setContentSize(604,790);
    if(isWeChat){area.addComponent(SubContextView);}
    this.friendFallback=this.text(this.friends,'platform hint',isWeChat?'':'好友排名仅在微信小游戏显示',0,-15,610,80,26,'#ECCFBA');
    this.pill(this.friends,'back-to-main','返回王庭',-551,this.CB.back);
  }
  show(which:ViewName):void {
    this.layer=which;
    this.home.active=which==='home';this.play.active=which==='play';
    this.result.active=which==='result';this.friends.active=which==='friends';
  }
  get active():ViewName{return this.layer;}
  renderPlay(safe:number,loose:number,combo:number,timeLeft:number,bankCooldown:number):void {
    this.score.string=safe.toLocaleString();
    this.loose.string=`未封存 ${loose.toLocaleString()}`;
    this.time.string=`${Math.ceil(timeLeft)}s`;
    this.combo.string=combo>2?`连击 ×${combo} · 皇冠正在加冕`:`连击 ×${combo}`;
    this.bankText.string=bankCooldown>0?`封存冷却 ${bankCooldown.toFixed(1)}s`:'点「封存荣耀」锁定本轮所得';
  }
  renderResult(score:number,best:number,perfect:number,hits:number,shards:number,wasRecord:boolean):void {
    this.resultScore.string=score.toLocaleString()+' 荣耀';
    this.resultBest.string=`${bestTitle(score)}  ·  历史最高 ${best.toLocaleString()}${wasRecord?' · 新纪录':''}`;
    this.detail.string=`精准反击 ${perfect} 次   ·   失误 ${hits} 次\n本轮获得装饰碎片 ${shards} 枚`;
    this.adLabel.string='广告仅加倍装饰碎片 · 不影响好友排名';
  }
  toast(message:string,color='#FFE5A4'):void{this.toastText.string=message;this.toastText.color=c(color);}
  setAdMessage(message:string):void{this.adLabel.string=message;}
  setFriendMessage(message:string):void{this.friendFallback.string=message;}
}
