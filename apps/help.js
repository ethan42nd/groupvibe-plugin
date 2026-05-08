import plugin from '../../../lib/plugins/plugin.js'
import Config from '../components/Config.js'
import Render from '../components/Render.js'
import _ from 'lodash'

export class GroupVibeHelp extends plugin {
    constructor() {
        super({
            name: '群活跃帮助',
            dsc: '群活跃插件帮助中心',
            event: 'message',
            priority: -100,
            rule: [
                {
                    reg: '^#群活跃帮助$',
                    fnc: 'showMainHelp'
                },
                {
                    reg: '^#表情回应帮助$',
                    fnc: 'showEmojiReactionHelp'
                },
                {
                    reg: '^#自动表情包帮助$',
                    fnc: 'showAutoEmoticonsHelp'
                },
                {
                    reg: '^#戳一戳帮助$',
                    fnc: 'showPokeHelp'
                }
            ]
        })
    }

    async showMainHelp(e) {
        const isMaster = e.isMaster

        const helpCfg = {
            "themeSet": false,
            "title": "群活跃插件",
            "subTitle": "GroupVibe - 让群聊更有趣",
            "colWidth": 265,
            "theme": "all",
            "themeExclude": ["default"],
            "colCount": 2,
            "bgBlur": true
        }

        const helpList = [
            {
                "group": "🎉 功能总览",
                "list": [
                    { "icon": 74, "title": "#表情回应帮助", "desc": "查看表情回应功能帮助" },
                    { "icon": 76, "title": "#自动表情包帮助", "desc": "查看自动表情包功能帮助" },
                    { "icon": 79, "title": "#戳一戳帮助", "desc": "查看戳一戳互动功能帮助" }
                ]
            },
            {
                "group": "📋 常用指令",
                "list": [
                    { "icon": 55, "title": "#表情回应开启/关闭", "desc": "主人控制表情回应总开关" },
                    { "icon": 56, "title": "#开启/关闭我的表情回应", "desc": "个人开启或关闭表情回应" },
                    { "icon": 57, "title": "#自动表情包开启/关闭", "desc": "主人控制当前群表情包开关" },
                    { "icon": 58, "title": "#哒咩", "desc": "回复Bot消息，删除刚发的表情包" },
                    { "icon": 59, "title": "#表情包配置", "desc": "查看当前群的自动表情包配置" },
                    { "icon": 60, "title": "#表情回应状态", "desc": "查看表情回应当前状态" }
                ]
            },
            {
                "group": "🎭 表情回应",
                "list": [
                    { "icon": 61, "title": "自动表情回应", "desc": "用户发送表情时 Bot 自动回应" },
                    { "icon": 62, "title": "支持 QQ + Emoji", "desc": "兼容 QQ 表情和 Unicode Emoji" },
                    { "icon": 63, "title": "个人/群/全局", "desc": "多层级开关控制" }
                ]
            },
            {
                "group": "🖼️ 自动表情包",
                "list": [
                    { "icon": 64, "title": "自动收录", "desc": "高频图片自动保存为表情包" },
                    { "icon": 65, "title": "随机发送", "desc": "按概率自动发送活跃群聊" },
                    { "icon": 66, "title": "白名单管理", "desc": "按群控制表情包功能" }
                ]
            },
            {
                "group": "👆 戳一戳互动",
                "list": [
                    { "icon": 67, "title": "文字回复", "desc": "随机抽取自定义台词" },
                    { "icon": 68, "title": "图片回复", "desc": "从表情包库随机发送" },
                    { "icon": 69, "title": "禁言/反戳", "desc": "趣味互动效果" }
                ]
            }
        ]

        if (isMaster) {
            helpList.push({
                "group": "💡 主人提示",
                "list": [
                    { "icon": 3, "title": "锅巴插件配置", "desc": "可通过 Guoba 网页端可视化配置" }
                ]
            })
        }

        return await this.renderHelp(e, helpCfg, helpList)
    }

    async showEmojiReactionHelp(e) {
        const isMaster = e.isMaster

        const helpCfg = {
            "themeSet": false,
            "title": "表情回应帮助",
            "subTitle": "Emoji Reaction - 让互动更有趣",
            "colWidth": 265,
            "theme": "all",
            "themeExclude": ["default"],
            "colCount": 2,
            "bgBlur": true
        }

        const helpList = [
            {
                "group": "🎭 个人设置",
                "list": [
                    { "icon": 74, "title": "#开启我的表情回应", "desc": "开启对自己的表情回应功能" },
                    { "icon": 76, "title": "#关闭我的表情回应", "desc": "关闭对自己的表情回应功能" },
                    { "icon": 79, "title": "#表情回应状态", "desc": "查看当前功能和个人状态" }
                ]
            },
            {
                "group": "⚙️ 主人设置",
                "list": [
                    { "icon": 55, "title": "#表情回应开启/关闭", "desc": "开启或关闭整个表情回应功能" },
                    { "icon": 56, "title": "#开启/关闭全局表情回应", "desc": "设置未设置用户的默认行为" },
                    { "icon": 57, "title": "#表情回应设置表情 [ID]", "desc": "设置固定回应的表情ID，如74" },
                    { "icon": 58, "title": "#表情回应设置同表情", "desc": "使用用户发送的相同表情回应" },
                    { "icon": 59, "title": "#表情回应设置全部/单个回应", "desc": "回应所有表情或仅首个" },
                    { "icon": 60, "title": "#表情回应设置冷却 [秒]", "desc": "设置冷却时间防止刷屏" },
                    { "icon": 61, "title": "#表情回应设置本群", "desc": "添加/移除当前群到白名单" }
                ]
            }
        ]

        const iconGroup = {
            "group": "😊 常用表情ID参考",
            "list": [
                { "icon": 74, "title": "74 - ❤️ 爱心", "desc": "最常用的点赞表情" },
                { "icon": 76, "title": "76 - 😂 笑哭", "desc": "表达开心或无奈" },
                { "icon": 179, "title": "179 - 👍 点赞", "desc": "表示赞同和支持" },
                { "icon": 176, "title": "176 - 🔍 搜索", "desc": "思考中或查找中" },
                { "icon": 307, "title": "307 - 🌹 玫瑰", "desc": "表达感谢或赞美" },
                { "icon": 326, "title": "326 - 🎉 庆祝", "desc": "庆祝好消息" }
            ]
        }

        if (isMaster) {
            iconGroup.list.push(
                { "icon": 3, "title": "更多表情ID", "desc": "https://koishi.js.org/QFace/#/qqnt" }
            )
        }

        helpList.push(iconGroup)

        return await this.renderHelp(e, helpCfg, helpList)
    }

    async showAutoEmoticonsHelp(e) {
        const isMaster = e.isMaster
        const config = Config.getConfig()
        const ac = config.autoEmoticons || {}

        const helpCfg = {
            "themeSet": false,
            "title": "自动表情包帮助",
            "subTitle": "Auto Emoticons - 活跃群聊氛围",
            "colWidth": 265,
            "theme": "all",
            "themeExclude": ["default"],
            "colCount": 2,
            "bgBlur": true
        }

        const helpList = [
            {
                "group": "📖 功能说明",
                "list": [
                    { "icon": 74, "title": "自动收录", "desc": `监听群聊图片，${this.formatTime(ac.expireTimeInSeconds || 259200)}内出现${ac.confirmCount || 3}次自动保存` },
                    { "icon": 76, "title": "随机发送", "desc": `以 ${((ac.replyRate || 0.05) * 100).toFixed(1)}% 概率自动发送` }
                ]
            },
            {
                "group": "💬 群指令",
                "list": [
                    { "icon": 55, "title": "#哒咩", "desc": "删除 Bot 刚发送的表情包（回复使用）" },
                    { "icon": 56, "title": "#哒咩记录", "desc": "查看回收站最近的文本+图片" },
                    { "icon": 57, "title": "#哒咩文本/图片记录", "desc": "分页查看对应类型的回收记录" },
                    { "icon": 58, "title": "#自动表情包开启", "desc": "开启当前群的自动表情包功能" },
                    { "icon": 59, "title": "#自动表情包关闭", "desc": "关闭当前群的自动表情包功能" },
                    { "icon": 60, "title": "#表情包配置", "desc": "查看当前群的配置状态" }
                ]
            },
            {
                "group": "📁 目录说明",
                "list": [
                    { "icon": 61, "title": "共享图片", "desc": "data/autoEmoticons/PaimonChuoYiChouPictures/" },
                    { "icon": 62, "title": "群表情包", "desc": "data/autoEmoticons/emoji_save/群号/" },
                    { "icon": 63, "title": "回收站", "desc": "data/autoEmoticons/recycle_bin/" }
                ]
            },
            {
                "group": "⚙️ 当前配置",
                "list": [
                    { "icon": 64, "title": `发送概率: ${((ac.replyRate || 0.05) * 100).toFixed(1)}%`, "desc": "自动发送表情的概率" },
                    { "icon": 65, "title": `冷却时间: ${this.formatTime(ac.sendCD || 299)}`, "desc": "发送表情的间隔时间" },
                    { "icon": 66, "title": `发送延迟: ${this.formatTimeMs(ac.replyDelay?.min || 1000)} ~ ${this.formatTimeMs(ac.replyDelay?.max || 240000)}`, "desc": "发送前的随机延迟" },
                    { "icon": 67, "title": `最大数量: ${ac.maxEmojiCount || 100}个/群`, "desc": "每个群最多保存的表情包数量" },
                    { "icon": 68, "title": `大小限制: ${ac.maxEmojiSize || 10}MB`, "desc": "单个表情包文件大小限制" },
                    { "icon": 69, "title": `时间限制: ${ac.timeRestrictionEnabled ? `${ac.activeStartTime}~${ac.activeEndTime}` : '全天24小时'}`, "desc": "表情包活跃时间段" }
                ]
            }
        ]

        if (isMaster) {
            helpList.push({
                "group": "💡 主人提示",
                "list": [
                    { "icon": 3, "title": "锅巴插件配置", "desc": "可通过 Guoba 网页端修改配置" },
                    { "icon": 4, "title": "多开Bot", "desc": "配置 getBotByQQ_targetQQArr 指定发送Bot" }
                ]
            })
        }

        return await this.renderHelp(e, helpCfg, helpList)
    }

    async showPokeHelp(e) {
        const isMaster = e.isMaster
        const config = Config.getConfig()
        const pc = config.pokeConfig || {}

        const probText = pc.reply_text_prob ?? 0.2
        const probImg = pc.reply_img_prob ?? 0.5
        const probMute = pc.mutepick_prob ?? 0
        const totalProb = probText + probImg + probMute
        const pokeBackProb = Math.max(0, 1 - totalProb)
        const probWarning = totalProb > 1 ? ' (概率总和>1，已溢出)' : ''

        const helpCfg = {
            "themeSet": false,
            "title": "戳一戳帮助",
            "subTitle": "Poke Interaction - 趣味互动",
            "colWidth": 265,
            "theme": "all",
            "themeExclude": ["default"],
            "colCount": 2,
            "bgBlur": true
        }

        const helpList = [
            {
                "group": "🎲 触发效果",
                "list": [
                    { "icon": 74, "title": `📖 文字回复 (${(Math.min(probText, 1) * 100).toFixed(0)}%)`, "desc": "从台词列表随机抽取发送" },
                    { "icon": 76, "title": `🖼️ 图片回复 (${(Math.min(probImg, 1) * 100).toFixed(0)}%)`, "desc": "从表情包库随机发送图片" },
                    { "icon": 79, "title": `🔇 禁言 (${(Math.min(probMute, 1) * 100).toFixed(0)}%)`, "desc": `禁言 ${pc.mute_duration || 60} 秒（需管理员权限）` },
                    { "icon": 80, "title": `👆 反戳 (${(pokeBackProb * 100).toFixed(0)}%)${probWarning}`, "desc": "反戳对方并回复\"戳你！\"" }
                ]
            },
            {
                "group": "⚙️ 当前状态",
                "list": [
                    { "icon": 55, "title": `功能状态: ${pc.enable ? '✅ 已开启' : '❌ 已关闭'}`, "desc": "戳一戳互动功能开关状态" }
                ]
            }
        ]

        if (isMaster) {
            helpList.push({
                "group": "💡 主人提示",
                "list": [
                    { "icon": 3, "title": "锅巴插件配置", "desc": "可通过 Guoba 网页端修改配置和回复台词" }
                ]
            })
        }

        return await this.renderHelp(e, helpCfg, helpList)
    }

    async renderHelp(e, helpCfg, helpList) {
        let helpGroup = []
        _.forEach(helpList, (group) => {
            _.forEach(group.list, (help) => {
                let icon = help.icon * 1
                if (!icon) {
                    help.css = 'display:none'
                } else {
                    let x = (icon - 1) % 10
                    let y = (icon - x - 1) / 10
                    help.css = `background-position:-${x * 50}px -${y * 50}px`
                }
            })
            helpGroup.push(group)
        })

        let themeData = await this.getThemeData(helpCfg, helpCfg)
        return await Render.render('help/index', {
            helpCfg,
            helpGroup,
            ...themeData,
            element: 'default'
        }, { e, scale: 1.6 })
    }

    async getThemeCfg() {
        let resPath = '{{_res_path}}/help/imgs/'
        return {
            main: `${resPath}/main.png`,
            bg: `${resPath}/bg.jpg`,
            style: {}
        }
    }

    async getThemeData(diyStyle, sysStyle) {
        let helpConfig = _.extend({}, sysStyle, diyStyle)
        let colCount = Math.min(5, Math.max(parseInt(helpConfig?.colCount) || 3, 2))
        let colWidth = Math.min(500, Math.max(100, parseInt(helpConfig?.colWidth) || 265))
        let width = Math.min(2500, Math.max(800, colCount * colWidth + 30))
        let theme = await this.getThemeCfg()
        let themeStyle = theme.style || {}
        let ret = [`
          body{background-image:url(${theme.bg});width:${width}px;}
          .container{background-image:url(${theme.main});width:${width}px;}
          .help-table .td,.help-table .th{width:${100 / colCount}%)}
          `]
        let css = function (sel, css, key, def, fn) {
            let val = (function () {
                for (let idx in arguments) {
                    if (!_.isUndefined(arguments[idx])) {
                        return arguments[idx]
                    }
                }
            })(themeStyle[key], diyStyle[key], sysStyle[key], def)
            if (fn) {
                val = fn(val)
            }
            ret.push(`${sel}{${css}:${val}}`)
        }
        css('.help-title,.help-group', 'color', 'fontColor', '#ceb78b')
        css('.help-title,.help-group', 'text-shadow', 'fontShadow', 'none')
        css('.help-desc', 'color', 'descColor', '#eee')
        css('.cont-box', 'background', 'contBgColor', 'rgba(43, 52, 61, 0.8)')
        css('.cont-box', 'backdrop-filter', 'contBgBlur', 3, (n) => diyStyle.bgBlur === false ? 'none' : `blur(${n}px)`)
        css('.help-group', 'background', 'headerBgColor', 'rgba(34, 41, 51, .4)')
        css('.help-table .tr:nth-child(odd)', 'background', 'rowBgColor1', 'rgba(34, 41, 51, .2)')
        css('.help-table .tr:nth-child(even)', 'background', 'rowBgColor2', 'rgba(34, 41, 51, .4)')
        return {
            style: `<style>${ret.join('\n')}</style>`,
            colCount
        }
    }

    formatTime(seconds) {
        const days = Math.floor(seconds / 86400)
        const hours = Math.floor((seconds % 86400) / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)

        if (days > 0) return `${days}天${hours}小时${minutes}分钟`
        if (hours > 0) return `${hours}小时${minutes}分钟`
        return `${minutes}分钟`
    }

    formatTimeMs(ms) {
        if (ms >= 60000) {
            const minutes = Math.floor(ms / 60000)
            const seconds = Math.floor((ms % 60000) / 1000)
            return seconds > 0 ? `${minutes}分${seconds}秒` : `${minutes}分`
        }
        return `${Math.floor(ms / 1000)}秒`
    }
}
