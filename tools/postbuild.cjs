/** Execute after a successful Cocos 3.8.8 微信小游戏 build. Keep generated engine files intact. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const output=path.resolve(process.argv[2]||path.join(root,'build/wechatgame'));
const gameFile=path.join(output,'game.json');
if(!fs.existsSync(gameFile)){
 console.error(`Not a WeChat build: ${gameFile}\nRun the Cocos Creator 微信小游戏 build before postbuild.`);
 process.exit(2);
}
const data=JSON.parse(fs.readFileSync(gameFile,'utf8'));
data.openDataContext='openDataContext';
fs.writeFileSync(gameFile,JSON.stringify(data,null,2)+'\n');
const dest=path.join(output,'openDataContext');
fs.mkdirSync(dest,{recursive:true});
fs.copyFileSync(path.join(root,'build-templates/wechatgame/openDataContext/index.js'),path.join(dest,'index.js'));
console.log(`WeChat open data context injected into ${output}`);
console.log('Game package only: provide real AppID + approved privacy declaration and adunit IDs before release.');
