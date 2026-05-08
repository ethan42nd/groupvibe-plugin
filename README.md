# groupvibe-plugin

Yunzai-Bot 群活跃插件，为你的群聊增添互动乐趣。

> 本插件从 [siliconflow-plugin](https://github.com/AIGC-Yunzai/siliconflow-plugin) 中独立出来，保留了戳一戳、群自动表情包、表情回应三个经典群聊活跃功能。

## 功能介绍

### 群自动表情包
- **自动收录**：监听群聊中的图片，当同一张图片在配置时间内出现达到指定次数时，自动下载保存为表情包
- **随机发送**：以设定的概率自动发送已保存的表情包，活跃群聊氛围
- **哒咩删除**：支持对已发送的表情包进行"哒咩"删除，移入回收站（同时会将对应文本从戳一戳词库中移除）
- **哒咩记录**：支持查看回收站中的文本和图片记录
- **白名单管理**：支持按群开启/关闭表情包功能
- **时间限制**：可设置活跃时间段，支持跨夜（如 22:00~06:00），防止半夜"闹鬼"
- **共享图片目录**：支持手动上传共享图片到 `data/autoEmoticons/PaimonChuoYiChouPictures/` 目录，所有群均可使用
- **多开 Bot 支持**：可指定特定 Bot 账号发送表情包

### 戳一戳互动
- 被戳时随机触发文字回复、图片回复、禁言或反戳回去
- 支持自定义回复文字列表
- 触发概率可自由配置（各项概率之和请勿超过 1）

### 表情回应
- 当用户发送表情时，Bot 自动用表情回应该消息（需协议端支持，如 NapCat）
- 支持使用固定表情 ID 或相同表情回应
- 支持冷却时间设置，防止刷屏
- 支持按群、按个人、全局默认三层开关控制
- 兼容 QQ 表情和 Unicode Emoji

## 安装

```bash
# 进入 Yunzai-Bot 插件目录
cd Yunzai-Bot/plugins/

# 克隆本仓库
git clone https://github.com/ethan42nd/groupvibe-plugin.git

# 安装依赖
cd groupvibe-plugin
pnpm install
```

安装完成后重启 Yunzai-Bot 即可生效。

## 配置

### 通过锅巴插件配置（推荐）
本插件支持 [Guoba-Plugin](https://github.com/guoba-yunzai/guoba-plugin) 可视化配置，安装锅巴插件后可在网页端进行设置。

### 配置文件
默认配置文件位于 `config/config_default.yaml`，首次运行时会自动复制到 `config/config/config.yaml`。

主要配置项：

```yaml
autoEmoticons:
  useEmojiSave: false          # 是否启用自动表情包（需开启才能使用，更改后重启生效）
  expireTimeInSeconds: 259200  # 图片确认时间窗口（秒）
  confirmCount: 3              # 图片出现多少次后保存
  replyRate: 0.05              # 自动发送表情概率
  replyDelay:                  # 发送前的随机延迟（毫秒）
    min: 1000
    max: 240000
  maxEmojiCount: 100           # 每个群最大表情包数量
  maxEmojiSize: 10             # 表情包大小限制（MB）
  allowGroups: []              # 白名单群号（为空则所有群，推荐设置以支持定时发送）
  getBotByQQ_targetQQArr: []   # Bot 多开时指定发送表情的 QQ 号
  sendCD: 299                  # 发送冷却时间（秒）
  timeRestrictionEnabled: false # 是否启用时间限制
  activeStartTime: "08:00"     # 活跃开始时间（支持跨夜，如 22:00~06:00）
  activeEndTime: "23:00"       # 活跃结束时间

pokeConfig:
  enable: false                # 是否启用戳一戳（更改后重启生效）
  reply_text_prob: 0.2         # 文字回复概率
  reply_img_prob: 0.5          # 图片回复概率
  mutepick_prob: 0             # 禁言概率
  mute_duration: 60            # 禁言时长（秒）
  word_list: "..."             # 文字回复列表，每行一条

emojiReaction:
  enable: false                # 是否启用表情回应（更改后重启生效）
  emojiId: "74"                # 回应表情 ID
  useSameEmoji: false          # 使用相同表情回应
  reactToAllEmojis: true       # 回应所有表情（同表情模式下）
  cooldown: 5                  # 冷却时间（秒）
  onlyGroups: []               # 仅在这些群生效（留空则全局）
  globalEnabled: false         # 全局默认开启（未设置的用户默认状态）
```

> ⚠️ **关于 `allowGroups` 的重要说明**：该数组为空时，所有群均可使用自动表情包；一旦通过 `#自动表情包开启` 添加了群号，只有数组中的群才能使用。若只想限制部分群，请逐个开启。

### 数据存储路径
所有运行时数据保存在 Bot 根目录的 `data/autoEmoticons/` 下：

| 目录 | 用途 |
|------|------|
| `emoji_save/群号/` | 各群自动保存的表情包 |
| `PaimonChuoYiChouPictures/` | 手动上传的共享图片（所有群可用） |
| `recycle_bin/` | 哒咩删除的图片回收站 |
| `recycle_bin_text.txt` | 哒咩删除的文本回收记录 |

### 常用指令

#### 表情回应

| 指令 | 说明 |
|------|------|
| `#表情回应开启` / `#表情回应关闭` | 主人控制表情回应总开关 |
| `#开启我的表情回应` / `#关闭我的表情回应` | 个人开启/关闭 |
| `#开启全局表情回应` / `#关闭全局表情回应` | 主人设置未设置用户的默认行为 |
| `#表情回应状态` | 查看功能状态 |
| `#表情回应设置表情 [ID]` | 设置固定回应表情，如 `#表情回应设置表情 74` |
| `#表情回应设置同表情` | 使用用户发送的相同表情回应 |
| `#表情回应设置全部回应` | 同表情模式下回应消息中所有表情 |
| `#表情回应设置单个回应` | 同表情模式下仅回应第一个表情 |
| `#表情回应设置冷却 [秒]` | 设置冷却时间（0~300秒） |
| `#表情回应设置本群` | 添加/移除当前群到白名单 |

#### 自动表情包

| 指令 | 说明 |
|------|------|
| `#哒咩` | 删除 Bot 刚发送的表情包（回复该消息使用） |
| `#哒咩记录` | 查看回收站最近的文本+图片记录 |
| `#哒咩记录第N页` | 分页查看记录 |
| `#哒咩文本记录` / `#哒咩图片记录` | 仅查看对应类型记录 |
| `#自动表情包开启` | 开启当前群的自动表情包功能 |
| `#自动表情包关闭` | 关闭当前群的自动表情包功能 |
| `#表情包配置` | 查看当前群的配置状态 |

#### 戳一戳
戳一戳 Bot 即可随机触发，无需指令。

## 文件结构

```
groupvibe-plugin/
├── apps/                   # 功能模块
│   ├── autoEmoticons.js   # 自动表情包
│   ├── chuoyichuo.js      # 戳一戳互动
│   ├── EmojiReaction.js   # 表情回应
│   └── help.js            # 帮助中心
├── components/             # 组件
│   ├── Config.js          # 配置管理
│   └── Render.js          # 渲染工具
├── config/                 # 配置
│   └── config_default.yaml # 默认配置
├── guoba.support.js        # 锅巴插件支持
├── model/                  # 模型/工具
├── resources/              # 资源文件
│   ├── common/            # 公共资源
│   └── help/              # 帮助模板
└── index.js                # 入口文件
```

## 致谢

感谢 **[siliconflow-plugin](https://github.com/AIGC-Yunzai/siliconflow-plugin)** 提供的参考与启发。

## License

ISC
