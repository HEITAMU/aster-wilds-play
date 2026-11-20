/** Usage: node tools/install-wechat.mjs build/wechatgame */
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const build=path.resolve(process.argv[2]||'build/wechatgame');
const jsonFile=path.join(build,'game.json');
if(!fs.existsSync(jsonFile))throw new Error('先在 Creator 3.8.8 构建微信小游戏，未找到 '+jsonFile);
const game=JSON.parse(fs.readFileSync(jsonFile,'utf8'));
game.openDataContext='openDataContext';
fs.writeFileSync(jsonFile,JSON.stringify(game,null,2)+'\n');
const dest=path.join(build,'openDataContext');fs.mkdirSync(dest,{recursive:true});
fs.copyFileSync(path.join(root,'wechat/openDataContext/index.js'),path.join(dest,'index.js'));
console.log('WeChat open data context installed at '+dest);
