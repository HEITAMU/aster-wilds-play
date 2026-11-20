import { dailyKey, dailySeed, dateBeijing, parseChallenge, Challenge } from './Rules';

declare const wx: any;
export type AdOutcome = 'reward' | 'dismissed' | 'unavailable';
export class WeChatBridge {
  private wx: any;
  private video: any = null;
  private banner: any = null;
  private videoLoading = false;
  private adId = '';
  private bannerId = '';
  readonly challenge: Challenge | null;
  constructor() {
    this.wx = typeof wx !== 'undefined' && wx && typeof wx.getLaunchOptionsSync === 'function' ? wx : null;
    const q = this.wx?.getLaunchOptionsSync?.()?.query;
    this.challenge = parseChallenge(q);
    if (this.wx) {
      this.wx.showShareMenu?.({ withShareTicket: false, menus: ['shareAppMessage'] });
      this.wx.onShareAppMessage?.(() => this.sharePayload(0,dailySeed(),dailyKey(),dateBeijing()));
    }
  }
  get isWeChat(): boolean {return !!this.wx;}
  load(key: string, defaultValue = 0): number {
    try {
      const raw = this.wx ? this.wx.getStorageSync(key) : globalThis.localStorage?.getItem(key);
      const n = Number(raw); return Number.isFinite(n) && n >= 0 ? n : defaultValue;
    } catch (_) { return defaultValue; }
  }
  save(key: string, value: number): void {
    try { if (this.wx) this.wx.setStorageSync(key, value); else globalThis.localStorage?.setItem(key, String(value)); }
    catch (_) { /* private mode */ }
  }
  publishBest(score: number, date: string): void {
    if (!this.wx || !this.wx.setUserCloudStorage) return;
    const value = String(Math.max(0,Math.min(999999999,Math.floor(score))));
    this.wx.setUserCloudStorage({KVDataList:[{key: dailyKey(date),value}], fail: (e:any)=>console.warn('daily cloud save failed', e)});
  }
  openFriends(date: string): void {
    this.wx?.getOpenDataContext?.()?.postMessage({type:'crown-friends', key:dailyKey(date), date});
  }
  sharePayload(score: number, seed: number, _key: string, date: string): any {
    return {
      title: score > 0 ? `我在王庭拿下 ${score.toLocaleString()} 荣耀，来挑战！` : '窃冠者：你能在王庭夺走我的王冠吗？',
      query: `mode=challenge&seed=${seed >>> 0}&target=${Math.max(0, Math.floor(score))}&date=${encodeURIComponent(date)}`,
    };
  }
  share(score: number, seed: number, date: string): boolean {
    if (!this.wx?.shareAppMessage) return false;
    this.wx.shareAppMessage(this.sharePayload(score,seed,dailyKey(date),date));
    return true;
  }
  /** Ads are optional and affect ONLY decorative currency, never ranked scores. */
  configureAds(videoAdUnitId: string, bannerAdUnitId: string): void {
    this.adId = videoAdUnitId;
    this.bannerId = bannerAdUnitId;
    if (this.wx?.createRewardedVideoAd && /^adunit-/.test(videoAdUnitId)) {
      try { this.video = this.wx.createRewardedVideoAd({adUnitId: videoAdUnitId}); }
      catch(e){console.warn('video init',e);}
    }
  }
  rewarded(): Promise<AdOutcome> {
    if (!this.video || this.videoLoading) return Promise.resolve('unavailable');
    this.videoLoading = true;
    return new Promise(resolve => {
      let settled = false;
      const done = (result: AdOutcome) => {
        if(settled)return;
        settled = true; this.videoLoading=false;
        this.video.offClose?.(close); this.video.offError?.(err);
        resolve(result);
      };
      const close = (r:any) => done(r && r.isEnded === true ? 'reward' : 'dismissed');
      const err = (e:any) => {console.warn('ad error',e);done('unavailable');};
      this.video.onClose?.(close); this.video.onError?.(err);
      this.video.show().catch(() => this.video.load().then(()=>this.video.show()).catch(err));
    });
  }
  showBanner(): void {
    if (!this.wx?.createBannerAd || !/^adunit-/.test(this.bannerId) || this.banner) return;
    try {
      const sys = this.wx.getWindowInfo?.() ?? this.wx.getSystemInfoSync?.() ?? {screenWidth:360,screenHeight:700};
      this.banner = this.wx.createBannerAd({adUnitId:this.bannerId,style:{left:0,top:Math.max(0,sys.screenHeight-96),width:sys.screenWidth}});
      this.banner.onResize?.((size:any)=>{
        const info = this.wx.getWindowInfo?.() ?? sys;
        this.banner.style.left = (info.screenWidth - size.width)/2;
        this.banner.style.top = info.screenHeight - size.height;
      });
      this.banner.onError?.((e:any)=>console.warn('banner',e));
      this.banner.show?.().catch?.(()=>{});
    } catch(e) {console.warn('banner init',e);}
  }
  hideBanner(): void { this.banner?.hide?.(); }
  destroy(): void { this.banner?.destroy?.(); this.video?.destroy?.(); this.banner=null;this.video=null; }
}
