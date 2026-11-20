"""Offline, fully original score and layered Foley. Requires numpy + ffmpeg. CC-BY-0 project assets."""
from pathlib import Path
import numpy as np, soundfile as sf, subprocess
R=Path(__file__).resolve().parents[1]/'assets/resources/audio';R.mkdir(parents=True,exist_ok=True)
SR=24000;RNG=np.random.default_rng(4270)
def tone(freq,dur,kind='harp'):
 t=np.arange(max(1,int(SR*dur)))/SR
 phase=2*np.pi*freq*t
 if kind=='harp':
  src=np.sin(phase)+.40*np.sin(2*phase)+.24*np.sin(3*phase)+.10*np.sin(5*phase)
  env=(1-np.exp(-t*92))*np.exp(-t*6)
 elif kind=='bells':
  src=np.sin(phase)+.45*np.sin(2.01*phase)+.18*np.sin(3.995*phase)
  env=(1-np.exp(-t*110))*np.exp(-t*4.3)
 elif kind=='strings':
  src=np.sin(phase)+.22*np.sin(2*phase)+.12*np.sin(3*phase)
  src*=.91+.09*np.sin(2*np.pi*5*t)
  env=np.minimum(1,t*8)*np.minimum(1,(dur-t)*6)
 elif kind=='low':
  src=np.sin(phase)*.7+np.sin(2*phase)*.14+np.sin(phase*.51)*.12
  env=(1-np.exp(-t*60))*np.exp(-t*3)
 else:
  src=np.sin(phase)*np.exp(-t*8)
  env=(1-np.exp(-t*130))
 return (src*env).astype(np.float32)
def note(midi):return 440*2**((midi-69)/12)
def place(out,clip,offset,gain):
 start=int(offset*SR);end=min(start+len(clip),len(out))
 if start<end:out[start:end]+=clip[:end-start]*gain
def drum(dur=0.29,kind='kick'):
 t=np.arange(int(SR*dur))/SR;noise=RNG.standard_normal(len(t)).astype(np.float32)
 if kind=='kick':return np.sin(2*np.pi*(80*t+48*(1-np.exp(-t*29)))/ (1+0*t))*np.exp(-t*27)
 if kind=='snare':return (noise*.40+np.sin(2*np.pi*185*t)*.15)*np.exp(-t*26)
 return noise*.17*np.exp(-t*60)
# 16 measures in 4/4, musically resolving at loop point.
BPM=118;beat=60/BPM;duration=16*4*beat
out=np.zeros(int(SR*duration),dtype=np.float32)
chords=[(50,53,57),(46,50,53),(48,52,55),(45,49,52),
        (50,53,57),(46,50,53),(43,46,50),(45,49,52)]
for bar in range(16):
 t0=bar*4*beat;ch=chords[bar%8]
 for j,m in enumerate(ch):
  place(out,tone(note(m),4*beat,'strings'),t0,.075)
  place(out,tone(note(m+12),4*beat,'strings'),t0,.03)
 for b in range(4):
  tm=t0+b*beat
  place(out,drum(.35,'kick'),tm,.13 if b==0 else .075)
  if b==1 or b==3:place(out,drum(.26,'snare'),tm,.08)
  for h in range(2):place(out,drum(.09,'hat'),tm+h*beat*.5,.09)
  pitch=ch[(b+bar)%3]+24
  place(out,tone(note(pitch),beat*.85,'harp'),tm,.18)
  if b%2==0:place(out,tone(note(ch[(b+1)%3]+19),beat*1.5,'bells'),tm,.075)
 # Delayed ornament resolves to scale
 if bar%2==1:
  place(out,tone(note(ch[1]+31),beat*2,'bells'),t0+2*beat,.11)
# three-tap echo, gentle saturation and soft loop edge
for d,g in [(.17,.11),(.32,.08)]:
 delay=int(d*SR);out[delay:]+=out[:-delay]*g
out=np.tanh(out*1.3)*.75
ramp=int(SR*.065);out[:ramp]*=np.linspace(0,1,ramp);out[-ramp:]*=np.linspace(1,0,ramp)
def export(name,a):
 temp=R/(name+'.wav');sf.write(temp,np.clip(a,-.99,.99),SR,subtype='PCM_16')
 final=R/(name+'.mp3')
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(temp),'-ar','24000','-ac','1','-codec:a','libmp3lame','-b:a','64k',str(final)],check=True)
 temp.unlink()
 print(name,len(a)/SR,final.stat().st_size)
export('court_loop',out)

def sfx(name,dur,events,noise=None):
 x=np.zeros(int(SR*dur),dtype=np.float32)
 for freq,start,seconds,gain,kind in events:place(x,tone(freq,seconds,kind),start,gain)
 if noise:
  span=min(len(x),int(SR*noise[1]));t=np.arange(span)/SR
  x[:span]+=RNG.normal(0,1,span)*np.exp(-t*noise[2])*noise[0]
 peak=np.max(np.abs(x)) or 1
 x=np.tanh(x/peak*2)*.58
 fade=min(int(SR*.015),len(x)//4);x[:fade]*=np.linspace(0,1,fade);x[-fade:]*=np.linspace(1,0,fade)
 export(name,x)
sfx('button',.2,[(420,0,.16,.45,'harp'),(840,.035,.13,.25,'bells')])
sfx('parry',.52,[(234,.0,.28,.34,'low'),(932,.0,.38,.45,'bells'),(1398,.09,.33,.31,'harp')],(.19,.12,42))
sfx('perfect',.83,[(440,0,.55,.30,'bells'),(660,.08,.55,.38,'bells'),(880,.16,.55,.48,'bells'),(1320,.27,.52,.25,'harp')],(.12,.12,40))
sfx('hurt',.53,[(152,0,.46,.50,'low'),(109,.13,.37,.42,'low')],(.37,.26,14))
sfx('bank',1.02,[(293,0,.88,.25,'bells'),(440,.12,.76,.42,'bells'),(587,.24,.65,.36,'bells'),(880,.34,.58,.23,'bells')])
sfx('jewel',.62,[(1320,0,.39,.35,'bells'),(1760,.08,.39,.24,'bells'),(2640,.16,.34,.12,'harp')])
sfx('end',1.66,[(220,0,1.5,.18,'strings'),(293,.0,1.5,.20,'strings'),(440,.08,1.5,.26,'bells'),(587,.24,1.3,.17,'bells'),(880,.46,1.1,.19,'bells')])
