/** WeChat platform bridge. We never pretend that a simulator result is a real ad or friend ranking. */
export const PLATFORM_CONFIG = {
  rewardedAdUnitId: '',  // 填入流量主后台真实 adunit-...，空值严格禁用
  bannerAdUnitId: '',
  interstitialAdUnitId: '',
  privacyFriendRelationDeclared: false, // 后台实际声明并通过之后改为 true
};

type MiniWx = any;
const wxApi=():MiniWx|null => typeof (globalThis as any).wx !== 'undefined' ? (globalThis as any).wx : null;
export interface ShareChallenge { day:string; target:number|null; }

export class PlatformBridge {
  private rewarded:any=null;
  private interstitial:any=null;
  private banner:any=null;
  private adPending=false;
  private reportAdError:(err:string)=>void=()=>{};
  get isWeChat(){return !!wxApi();}
  get adsConfigured(){return !!(PLATFORM_CONFIG.rewardedAdUnitId && wxApi()?.createRewardedVideoAd);}
  get rankingAvailable(){return !!(PLATFORM_CONFIG.privacyFriendRelationDeclared && wxApi()?.getOpenDataContext);}
  onAdError(fn:(err:string)=>void){this.reportAdError=fn;}
  init(){
    const wx=wxApi(); if(!wx)return;
    try{
      wx.showShareMenu?.({withShareTicket:false,menus:['shareAppMessage']});
      wx.onShareAppMessage?.(()=>({title:'回声猎场｜75秒，你能超越我的纪录吗？',query:'source=menu'}));
    }catch(e){this.reportAdError(String(e));}
  }
  getChallenge():ShareChallenge {
    const q=wxApi()?.getLaunchOptionsSync?.()?.query || {};
    const day=typeof q.day==='string' && /^\d{8}$/.test(q.day) ? q.day : '';
    const t=Number(q.target);
    return {day,target:day && Number.isInteger(t) && t>=0 && t<=100000000 ? t : null};
  }
  share(day:string,score:number){
    const wx=wxApi();if(!wx?.shareAppMessage)return false;
    const title=score>0?`我在《回声猎场》拿到 ${score.toLocaleString()} 分，你敢来挑战吗？`:'回声猎场｜用8秒前的自己，打破今天的纪录';
    // query only triggers a challenge page. It neither authenticates score nor gives rewards.
    wx.shareAppMessage({title,query:`source=challenge&day=${day}&target=${Math.max(0,Math.floor(score))}`});
    return true;
  }
  saveFriendScore(day:string,score:number):void{
    const wx=wxApi();if(!wx?.setUserCloudStorage)return;
    const v=String(Math.max(0,Math.floor(score)));
    const values=[{key:'echo_daily_day',value:day},{key:'echo_daily_score',value:v}];
    wx.setUserCloudStorage({KVDataList:values,fail:(e:any)=>console.warn('[EchoArena] friend score write failed',e)});
  }
  showRanking(day:string,mode:'daily'|'all'='daily'){
    if(!this.rankingAvailable)return;
    wxApi().getOpenDataContext().postMessage({type:'echo-rank',day,mode});
  }
  hideRanking(){wxApi()?.getOpenDataContext?.()?.postMessage({type:'echo-hide'});}
  async rewardedCosmetic():Promise<boolean>{
    const wx=wxApi(); if(!this.adsConfigured || this.adPending)return false;
    this.adPending=true;
    try{
      if(!this.rewarded) {
        this.rewarded=wx.createRewardedVideoAd({adUnitId:PLATFORM_CONFIG.rewardedAdUnitId});
        this.rewarded.onError?.((e:any)=>this.reportAdError(`激励视频：${String(e?.errMsg||e)}`));
      }
      const ad=this.rewarded;
      return await new Promise<boolean>(async resolve=>{
        let settled=false;
        const finish=(ok:boolean)=>{
          if(settled)return;
          settled=true;
          try{ad.offClose?.(onClose);}catch(_e){}
          this.adPending=false;resolve(ok);
        };
        const onClose=(result:{isEnded?:boolean}|undefined)=>{
          // Never award for early close or ambiguous completion.
          finish(result?.isEnded===true);
        };
        ad.onClose(onClose);
        try {await ad.show();}
        catch(e){
          try{await ad.load();await ad.show();}
          catch(e2){this.reportAdError(`视频不可用：${String(e2)}`);finish(false);}
        }
      });
    }catch(e){this.adPending=false;this.reportAdError(String(e));return false;}
  }
  showBanner(){
    const wx=wxApi();
    if(!wx?.createBannerAd || !PLATFORM_CONFIG.bannerAdUnitId || this.banner)return;
    try{
      const info=wx.getSystemInfoSync?.()||{};
      const width=Math.min(320,info.windowWidth||320);
      this.banner=wx.createBannerAd({adUnitId:PLATFORM_CONFIG.bannerAdUnitId,style:{left:((info.windowWidth||width)-width)/2,top:Math.max(0,(info.windowHeight||800)-115),width}});
      this.banner.onResize?.((res:any)=>{const h=info.windowHeight||800;this.banner.style.top=Math.max(0,h-res.height-8);});
      this.banner.onError?.((e:any)=>this.reportAdError(`横幅广告：${String(e?.errMsg||e)}`));
      this.banner.show?.().catch?.((e:any)=>this.reportAdError(String(e)));
    }catch(e){this.reportAdError(String(e));}
  }
  hideBanner(){try{this.banner?.hide?.();}catch(_e){}}
  maybeInterstitial(completedCount:number){
    const wx=wxApi();
    if(completedCount<3 || completedCount%3!==0 || !PLATFORM_CONFIG.interstitialAdUnitId || !wx?.createInterstitialAd)return;
    try{
      if(!this.interstitial) this.interstitial=wx.createInterstitialAd({adUnitId:PLATFORM_CONFIG.interstitialAdUnitId});
      this.interstitial.show?.().catch?.((e:any)=>this.reportAdError(`插屏广告：${String(e)}`));
    }catch(e){this.reportAdError(String(e));}
  }
  getLocal<T>(key:string,defaultValue:T):T{
    try{
      const wx=wxApi();
      const s=wx?.getStorageSync?wx.getStorageSync(`echo-arena:${key}`):(typeof localStorage!=='undefined'?localStorage.getItem(`echo-arena:${key}`):'');
      if(!s)return defaultValue;
      return JSON.parse(s) as T;
    }catch(_e){return defaultValue;}
  }
  setLocal(key:string,data:unknown){
    const s=JSON.stringify(data);
    try{const wx=wxApi();if(wx?.setStorageSync)wx.setStorageSync(`echo-arena:${key}`,s);
      else if(typeof localStorage!=='undefined')localStorage.setItem(`echo-arena:${key}`,s);
    }catch(e){console.warn('[EchoArena] save failed',e);}
  }
}
