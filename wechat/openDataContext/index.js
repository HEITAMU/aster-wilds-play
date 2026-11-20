/**
 * 独立微信开放数据域：好友关系链数据绝不传回主域。
 * 仅显示平台返回的真实好友记录，绝不填充假排名。
 */
/* global wx */
const CANVAS = wx.getSharedCanvas();
CANVAS.width = 604;
CANVAS.height = 790;
const ctx = CANVAS.getContext('2d');
let rows = [], currentDate = '', errorMessage = '', portraits = {};
const numeric = s => { const n = Number(s);return Number.isSafeInteger(n)&&n>=0&&n<1e9?n:0; };
function rounded(x,y,w,h,r,color) {
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);
  ctx.fill();
}
function label(text,x,y,size,color='#EAD8BA',align='left'){
  ctx.fillStyle=color;ctx.font=`bold ${size}px sans-serif`;ctx.textAlign=align;
  ctx.fillText(String(text),x,y);
}
function decorate(){
  const grd=ctx.createLinearGradient(0,0,0,790);
  grd.addColorStop(0,'#281D34');grd.addColorStop(1,'#160F26');
  rounded(1,1,602,788,27,grd);
  ctx.strokeStyle='#B18B66';ctx.lineWidth=3;ctx.strokeRect(13,13,578,764);
  ctx.strokeStyle='#805971';ctx.lineWidth=2;
  for(let s of [-1,1])for(let i=0;i<7;i++){
    const x=302+s*(235+i*3),y=30+i*109;
    ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x-s*55,y+16,x-s*40,y+46,x,y+58);ctx.stroke();
  }
  label('王 庭 · 好 友 荣 耀',302,72,32,'#F4DA9F','center');
  label(currentDate?`挑战日期 ${currentDate}`:'按分数降序',302,112,21,'#C6A5AD','center');
}
function render(){
  ctx.clearRect(0,0,604,790);decorate();
  if(errorMessage){
    label('排名暂时不可用',302,328,32,'#F6DEAB','center');
    label(errorMessage,302,385,22,'#D5B3BD','center');return;
  }
  if(!rows.length){
    label('暂无可显示的好友成绩',302,331,28,'#EED7AC','center');
    label('好友完成今日挑战后将在此出现',302,382,21,'#B79BA4','center');return;
  }
  rows.slice(0,8).forEach((r,i)=>{
    const top=139+i*74;
    rounded(28,top,546,66,16,i===0?'#57455E':i%2?'#35283E':'#41304A');
    if(i<3){ctx.fillStyle=['#F7D89A','#E8E7EE','#C89A76'][i];ctx.fillRect(39,top+13,6,39);}
    label(i+1,65,top+43,27,'#F2D1A9','center');
    ctx.save();ctx.beginPath();ctx.arc(115,top+33,22,0,Math.PI*2);ctx.clip();
    const avatar=portraits[r.avatarUrl];
    if(avatar){try{ctx.drawImage(avatar,93,top+11,44,44);}catch(_){}}
    else {ctx.fillStyle='#5B6D84';ctx.fillRect(92,top+10,46,46);}
    ctx.restore();
    const name=String(r.nickname||'微信玩家').slice(0,9);
    label(name,155,top+43,23,'#FFF1D8');
    label(r.score.toLocaleString(),544,top+42,28,'#EED19B','right');
  });
  label('仅微信平台好友数据 · 非全服榜',302,766,19,'#A3879B','center');
}
function requestAvatars(){
  rows.forEach(r=>{
    if(!r.avatarUrl || portraits[r.avatarUrl])return;
    const image=wx.createImage();portraits[r.avatarUrl]=image;
    image.onload=()=>{render();};image.onerror=()=>{delete portraits[r.avatarUrl];};
    image.src=r.avatarUrl;
  });
}
wx.onMessage(message=>{
  if(!message || message.type!=='crown-friends')return;
  const key=String(message.key||'');if(!/^ct_daily_\d{8}$/.test(key))return;
  currentDate=String(message.date||'').slice(0,10);
  errorMessage='';rows=[];render();
  wx.getFriendCloudStorage({
    keyList:[key],
    success(result){
      const raw=Array.isArray(result.data)?result.data:[];
      rows=raw.map(item=>{
        const pair=(item.KVDataList||[]).find(k=>k.key===key);
        return pair?{nickname:item.nickname||'微信玩家',avatarUrl:item.avatarUrl||'',score:numeric(pair.value)}:null;
      }).filter(Boolean);
      rows.sort((a,b)=>b.score-a.score || String(a.nickname).localeCompare(String(b.nickname)));
      render();requestAvatars();
    },
    fail(err){console.warn('friendCloudStorage failed',err);errorMessage='请检查微信基础库与关系链权限';render();}
  });
});
render();
