# 回声猎场 · ECHO ARENA

**Cocos Creator 3.8.8 / 微信小游戏 / 竖屏 / 75 秒计分竞技**

这是可检查、可修改的 Cocos Creator 源码工程，不是微信审核通过的发布包。源码附原始像素绘制素材、原创程序合成音效、完整的 75 秒循环、微信社交及广告接入位置。**不能仅凭源码或单元测试宣称微信真机已通过。**

## 游戏规则

- **一局 75 秒**：用手指移动玩家，拾取普通/金色能量，躲开持续增加的追猎者。
- **八秒回声**：场上会重放玩家八秒前的行走轨迹。它可以帮助收集能量，也能和玩家同时站在双核装置上获得额外高分。
- **风险和反超**：冲刺有冷却，近距离躲过敌人有奖励。能量满可开启 9 秒双倍得分的超载，但怪物速度提高，受到的伤害翻倍。
- **每日同题**：北京时间零点切换日期；当日挑战初始随机种子相同。**没有服务器防作弊，也不是回放复刻级别的竞技公平。**
- **好友胜负**：独立微信开放数据域读取当日好友最高成绩，同一天分数比较；可以主动分享带目标分数的挑战链接。分享不给成长币，不强制拉人。
- **商业化**：结算界面预留 Banner；每完成第三局的结算后预留插屏；自愿看完激励视频换 120 *装饰币*。装饰币只解锁皮肤，不增加属性或榜单分数。

## 在 Cocos Creator 3.8.8 打开

1. 安装 **Cocos Creator 3.8.8** 和微信开发者工具。
2. 解压工程。使用 Cocos Dashboard **添加工程**，选择这个目录（内含 `assets`, `settings`, `package.json`）。
3. 如果从 GitHub 只拿到源码、缺少 PNG/WAV 等合成产物，使用 Node 18+ 执行 `npm run bootstrap` 重新生成；从本对话下载的完整压缩包不需要该步骤。
4. 打开 `assets/scenes/Main.scene`，在编辑器里确认 `Canvas` 节点挂载 `EchoArenaMain` 脚本。
5. 在项目构建发布面板选择起始场景 **Main**，设备方向 **Portrait（竖屏）**，平台选 **微信小游戏**，填入属于你自己账号的有效小游戏 AppID，执行构建。
6. 构建成功后，项目根目录执行 `npm run postbuild -- build/wechatgame`，把 `openDataContext/index.js` 合并到实际发布包，并设置 `game.json` 的开放数据域路径。构建目录名称不同时，把命令最后的路径改为实际路径。
7. 使用微信开发者工具打开 **构建出来的** `build/wechatgame` 目录，进行模拟器及微信真机测试，修好报错、检查包体大小、提交代码审核、完成必要的备案及隐私配置后才能发布。

**重要：** 如果构建时勾选了“生成开放数据域工程模板”，请在构建后执行 `postbuild`，让本工程的好友榜 `openDataContext/index.js` 覆盖生成模板；不要在已有模板源码上重复覆盖主游戏运行时文件。默认 750 × 1334 设计分辨率，请在 Cocos 编辑器项目设置中核实分辨率适配。

## 微信 API 接入

`assets/scripts/Platform.ts` 顶部有：

```ts
export const PLATFORM_CONFIG = {
  rewardedAdUnitId: '',
  bannerAdUnitId: '',
  interstitialAdUnitId: '',
  privacyFriendRelationDeclared: false,
};
```

- 必须使用微信公众平台里申请得到的真实 `adunit-...`；**未填写时绝不模拟广告完成或发奖励。**
- `privacyFriendRelationDeclared` 仅在平台实际完成“微信朋友关系”等适用隐私声明及权限检查之后才能设置 `true`，不要为调试绕过。好友榜不是本机模拟数据；开放数据域通过 `getFriendCloudStorage` 读取记录。好友需已参与挑战并写入云存储才能被显示。
- 一次完整视频播放确认使用 `isEnded === true`；提前关闭、加载失败不会发奖励。上线前仍需使用真实广告权限回归测试。
- 分享参数只传 `day` 和 `target`，代表好友提出的挑战目标；**它并不验证对方真实分数，也不把聊天转发次数当成奖励条件。**
- 当前排行榜利用微信好友云存储的每日最佳分，没有独立云函数防作弊/防改分；商业上线前应根据实际推广和作弊风险决定是否部署有服务端签名和完整成绩审计的版本。
- 插屏可能无法显示或受平台频控；应避免遮挡游戏操控；当前仅结算后触发。

## 技术结构

| 位置 | 内容 |
| --- | --- |
| `assets/scripts/Core.ts` | 与引擎解耦的玩法模拟、随机种子、延迟路径、怪物、分数、75 秒结算 |
| `assets/scripts/Main.ts` | Cocos 2D 界面、输入、场景图、素材渲染与交互 |
| `assets/scripts/Platform.ts` | 微信小游戏分享、好友榜云存储与广告包装 |
| `assets/scripts/Sound.ts` | 音效与音乐播放 |
| `assets/resources` | 原创程序合成飞行器/敌人/道具素材与 WAV |
| `build-templates/wechatgame/openDataContext/index.js` | 隔离的数据域排行榜画布代码 |
| `tools/postbuild.cjs` | 微信构建完成后的社交资源放置脚本 |
| `tests/core.test.cjs` | 不依赖 Cocos 的规则自动测试 |

## 本地验证

```bash
npm run bootstrap  # 只有需要重建媒体资源时执行
npm run check      # Node/TypeScript 规则测试 + 场景文件结构检查
npm run postbuild -- build/wechatgame  # 必须先由 Cocos Creator 生成微信包
```

`npm run check` 的通过证明代码层级的结构和测试通过，**不证明在 Cocos 编辑器导入/预览成功**；本环境未运行 Cocos Creator 3.8.8 编辑器或微信开发者工具。在真机上请覆盖 iOS / Android、首次进入、前后台切换、失败和重试、当天/次日排行榜、广告提前关闭/成功/失败、分享进出、离线运行与延迟加载等情形。

## 研究与发布风险

详见 [`docs/设计依据与上架核验.md`](docs/设计依据与上架核验.md)。若当前美术/留存达不到商业产品要求，请以真实试玩数据驱动迭代，避免仅用“成瘾”词汇代替玩法验证。

## 版权所有

游戏代码、合成 PNG 绘图与 WAV 声音由本工程程序原创生成，不包含未经授权的第三方商用素材。引擎本身及微信 SDK 遵守各自许可和平台条款。可自由修改此工程；发布前自行确认最终内容与账号权限。
