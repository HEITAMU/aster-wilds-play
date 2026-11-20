import {AudioClip, AudioSource, Node, resources} from 'cc';
/** Optional original synthesized audio files. Audio never blocks the game. */
export class Sound {
  private source:AudioSource;
  private clips:Map<string,AudioClip>=new Map();
  private muted=false;
  constructor(host:Node){this.source=host.addComponent(AudioSource);this.source.volume=0.35;}
  load(){
    for(const name of ['collect','gold','damage','dash','pair','tap','music']){
      resources.load(`audio/${name}`,AudioClip,(error,clip)=>{if(!error && clip){this.clips.set(name,clip);if(name==='music')this.playMusic();}});
    }
  }
  setMuted(v:boolean){this.muted=v;if(v)this.source.stop();else this.playMusic();}
  get isMuted(){return this.muted;}
  private playMusic(){const bg=this.clips.get('music');if(!bg || this.muted)return;this.source.clip=bg;this.source.loop=true;this.source.volume=0.19;this.source.play();}
  play(name:string){if(this.muted)return;const clip=this.clips.get(name);if(clip)this.source.playOneShot(clip,name==='damage'?0.55:0.43);}
}
