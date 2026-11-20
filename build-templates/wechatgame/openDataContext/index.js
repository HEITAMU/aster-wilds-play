/* WeChat Open Data Context (isolated from the main game). NO relation data crosses contexts. */
/* global wx, sharedCanvas */
(function(){
  'use strict';
  if(typeof wx==='undefined')return;
  const c=typeof sharedCanvas!=='undefined'?sharedCanvas:wx.getSharedCanvas&&wx.getSharedCanvas();
  if(!c)return;
  c.width=650;c.height=780;
  const ctx=c.getContext('2d');
  const imageCache=Object.create(null);
  let activeDay='';let ranked=[];let error='';let visible=false;
  const trim=(s,n)=>String(s||'微信玩家').slice(0,n);
  const safeScore=s=>{const n=Number(s);return Number.isFinite(n)&&n>=0&&n<1e9?Math.floor(n):0;};
  function rounded(x,y,w,h,r,fill){
    ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();ctx.fill();
  }
  function text(s,x,y,font,color,align='left'){
    ctx.fillStyle=color;ctx.font=font;ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(s),x,y);
  }
  function avatar(url,x,y){
    rounded(x,y,52,52,12,'#244A5A');
    if(!url)return;
    const cached=imageCache[url];
    if(cached===null)return;
    if(cached && cached.complete){
      ctx.save();ctx.beginPath();ctx.arc(x+26,y+26,26,0,Math.PI*2);ctx.clip();ctx.drawImage(cached,x,y,52,52);ctx.restore();return;
    }
    if(!cached){try{const img=wx.createImage();imageCache[url]=img;img.onload=()=>{img.complete=true;if(visible)render();};img.onerror=()=>{imageCache[url]=null;};img.src=url;}catch(_e){imageCache[url]=null;}}
  }
  function render(){
    ctx.clearRect(0,0,650,780);
    if(!visible)return;
    rounded(0,0,650,780,24,'#0D2738');
    rounded(22,15,606,82,18,'#164255');
    text('今日好友最高纪录',44,53,'bold 32px sans-serif','#E9FBFA');
    text(activeDay.slice(0,4)+'.'+activeDay.slice(4,6)+'.'+activeDay.slice(6),604,53,'22px sans-serif','#89CED3','right');
    if(error){text(error,325,355,'23px sans-serif','#C6D9E0','center');return;}
    if(!ranked.length){
      text('今天还没有好友上传成绩',325,322,'28px sans-serif','#DAF0F2','center');
      text('第一个完成每日挑战的人将出现于此',325,382,'22px sans-serif','#9AAEBB','center');
      return;
    }
    ranked.slice(0,8).forEach((user,i)=>{
      const y=112+i*78;
      rounded(22,y,606,68,17,i===0?'#225A67':i<3?'#183E4F':'#133243');
      text(i+1,52,y+34,'bold 30px sans-serif',i<3?'#FFD48B':'#8EA5B3','center');
      avatar(user.avatarUrl,83,y+8);
      text(trim(user.nickname,8),150,y+34,'25px sans-serif','#E7F6F9');
      text(user.score.toLocaleString(),597,y+34,'bold 29px sans-serif',i<3?'#F8CD80':'#81E5D3','right');
    });
    text('同一日期、同一随机种子 · 不靠广告加分',325,757,'19px sans-serif','#88ADB9','center');
  }
  function read(day){
    if(!/^\d{8}$/.test(day))return;
    activeDay=day;visible=true;ranked=[];error='';render();
    if(typeof wx.getFriendCloudStorage!=='function'){
      error='当前微信环境不支持好友关系链接口';render();return;
    }
    wx.getFriendCloudStorage({
      keyList:['echo_daily_day','echo_daily_score'],
      success(res){
        const rows=Array.isArray(res&&res.data)?res.data:[];
        ranked=rows.map(row=>{
          const kv={};(row.KVDataList||[]).forEach(p=>{kv[p.key]=p.value;});
          return {nickname:row.nickname,avatarUrl:row.avatarUrl,day:kv.echo_daily_day,score:safeScore(kv.echo_daily_score)};
        }).filter(row=>row.day===activeDay && row.score>0)
          .sort((a,b)=>b.score-a.score);
        error='';render();
      },
      fail(err){error='读取失败，请核对好友关系隐私声明及权限';console.warn('[EchoArena OpenData]',err);render();}
    });
  }
  wx.onMessage(function(message){
    if(!message || typeof message!=='object')return;
    if(message.type==='echo-rank')read(String(message.day||''));
    if(message.type==='echo-hide'){visible=false;ctx.clearRect(0,0,650,780);}
  });
})();
