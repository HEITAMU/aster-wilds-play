import { Node, AudioClip, AudioSource, resources, director } from 'cc';
/** Small original orchestral loops and layered Foley; load before first interaction. */
export class AudioHub {
  private clips:Record<string,AudioClip>={};private music:AudioSource;
  private oneShot:AudioSource;
  private unlocked=false;
  constructor(){
    const a=new Node('Original game soundtrack');director.getScene()?.addChild(a);
    const b=new Node('SFX tracks');director.getScene()?.addChild(b);
    this.music=a.addComponent(AudioSource);this.oneShot=b.addComponent(AudioSource);
    this.music.volume=0.40;this.oneShot.volume=.7;this.music.loop=true;
    for(const key of ['court_loop','parry','perfect','hurt','bank','jewel','button','end']){
      resources.load('audio/'+key,AudioClip,(err,clip)=>{if(!err&&clip){this.clips[key]=clip;if(key==='court_loop'&&this.unlocked)this.playMusic();}});
    }
  }
  playMusic():void {
    this.unlocked=true;
    if(this.clips.court_loop){this.music.clip=this.clips.court_loop;if(!this.music.playing)this.music.play();}
  }
  cue(key:string,volume=1):void{
    const clip=this.clips[key];if(clip){this.oneShot.volume=Math.max(0,Math.min(1,volume));this.oneShot.playOneShot(clip,volume);}
  }
}
