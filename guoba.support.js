import Config from "./components/Config.js";
import lodash from "lodash";
import path from "path";
import { pluginRoot } from "./model/path.js";

export function supportGuoba() {
  let groupList_total = Array.from(Bot.gl.values())
  groupList_total = groupList_total.map(item => item = { label: `${item.group_name} - ${item.group_id}`, value: item.group_id.toString() })

  return {
    pluginInfo: {
      name: 'groupvibe-plugin',
      title: '群活跃插件',
      author: ['@ethan42nd'],
      authorLink: ['https://github.com/ethan42nd'],
      link: 'https://github.com/Misaka20002/siliconflow-plugin',
      isV3: true,
      isV2: false,
      showInMenu: true,
      description: 'Yunzai-Bot 群活跃插件 - 戳一戳、表情回应、群自动表情包',
      icon: 'fluent-emoji-flat:party-popper',
      iconColor: '#FF6B6B',
    },
    configInfo: {
      schemas: [
        {
          label: '戳一戳互动配置',
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'pokeConfig.enable',
          label: '启用戳一戳',
          bottomHelpMessage: '开启后机器人被戳时会根据以下概率触发互动。修改后立即生效。',
          component: 'Switch'
        },
        {
          field: 'pokeConfig.reply_text_prob',
          label: '文字回复概率',
          bottomHelpMessage: '范围 0~1。各项概率总和请小于等于1，剩余的概率将触发"反戳回去"。',
          component: 'InputNumber',
          componentProps: { min: 0, max: 1, step: 0.01 }
        },
        {
          field: 'pokeConfig.reply_img_prob',
          label: '图片回复概率',
          bottomHelpMessage: '触发时将从"自动保存的表情包"以及"手动上传的共享图片目录"中随机抽选发送。',
          component: 'InputNumber',
          componentProps: { min: 0, max: 1, step: 0.01 }
        },
        {
          field: 'pokeConfig.mutepick_prob',
          label: '禁言概率',
          bottomHelpMessage: '触发禁言的概率。机器人需具备管理员权限。',
          component: 'InputNumber',
          componentProps: { min: 0, max: 1, step: 0.01 }
        },
        {
          field: 'pokeConfig.mute_duration',
          label: '禁言时长 (秒)',
          bottomHelpMessage: '触发禁言时的惩罚时间',
          component: 'InputNumber',
          componentProps: { min: 1, step: 1 }
        },
        {
          field: 'pokeConfig.word_list',
          label: '文字回复列表',
          bottomHelpMessage: '触发文字回复时随机抽取一条发送。请每行填写一条回复语。',
          component: 'InputTextArea',
          componentProps: {
            rows: 6,
            placeholder: '不要再戳了！\n救命啊，有变态>_<！！！\n你戳谁呢！\n再戳禁言你哦！'
          }
        },
        {
          label: '表情回应配置',
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'emojiReaction.enable',
          label: '启用表情回应',
          bottomHelpMessage: '开启后，当用户发送表情时，Bot会自动用表情回应该消息（NapCat等协议支持）；更改后重启生效；指令：#表情回应[开启/关闭/状态/设置]',
          component: 'Switch'
        },
        {
          field: 'emojiReaction.emojiId',
          label: '回应表情ID',
          bottomHelpMessage: '设置Bot回应时使用的表情ID。常用：74=爱心❤️，76=笑哭😂，179=点赞👍，176=搜索🔍，307=玫瑰🌹，326=庆祝🎉',
          component: 'Input',
          componentProps: {
            placeholder: '74'
          }
        },
        {
          field: 'emojiReaction.useSameEmoji',
          label: '使用相同表情回应',
          bottomHelpMessage: '开启后，Bot会使用用户发送的相同表情进行回应（覆盖上面的固定表情ID设置）',
          component: 'Switch'
        },
        {
          field: 'emojiReaction.reactToAllEmojis',
          label: '回应所有表情',
          bottomHelpMessage: '同表情模式下，如果消息包含多个表情，是否全部回应（关闭则只回应第一个）',
          component: 'Switch'
        },
        {
          field: 'emojiReaction.globalEnabled',
          label: '全局默认开启',
          bottomHelpMessage: '对没有个人设置的用户，默认是否开启表情回应。用户可通过 #开启/关闭我的表情回应 覆盖此设置',
          component: 'Switch'
        },
        {
          field: 'emojiReaction.cooldown',
          label: '冷却时间（秒）',
          bottomHelpMessage: '同一用户在冷却时间内多次发送表情，只回应一次，防止刷屏',
          component: 'InputNumber',
          componentProps: {
            min: 0,
            max: 300,
            step: 1,
            placeholder: '5'
          }
        },
        {
          field: 'emojiReaction.onlyGroups',
          label: '生效群聊',
          bottomHelpMessage: '仅在这些群中生效（留空则全局生效）；可用指令 #表情回应设置本群 快速添加当前群',
          component: 'Select',
          componentProps: {
            allowAdd: true,
            allowDel: true,
            mode: 'multiple',
            options: groupList_total
          }
        },
        {
          label: '群自动表情包配置',
          component: 'SOFT_GROUP_BEGIN'
        },
        {
          field: 'autoEmoticons.useEmojiSave',
          label: '启用表情保存',
          bottomHelpMessage: '是否启用表情保存/偷取/发送；更改后重启生效；会自动发送保存在 /data/autoEmoticons/emoji_save/群号/ 和 /data/autoEmoticons/PaimonChuoYiChouPictures/ 目录下的表情包；群单独指令：#哒咩 #自动表情包[开启|关闭] #表情包配置',
          component: 'Switch'
        },
        {
          field: 'autoEmoticons.timeRestrictionEnabled',
          label: '启用时间限制',
          bottomHelpMessage: '开启后，机器人仅在指定的活跃时间内发送表情包，防止半夜"闹鬼"',
          component: 'Switch'
        },
        {
          field: 'autoEmoticons.activeStartTime',
          label: '活跃开始时间',
          bottomHelpMessage: '格式：HH:mm，例如：08:00',
          component: 'Input',
          componentProps: {
            placeholder: '08:00',
          }
        },
        {
          field: 'autoEmoticons.activeEndTime',
          label: '活跃结束时间',
          bottomHelpMessage: '格式：HH:mm，例如：23:00（支持跨夜，如 22:00 到 06:00）',
          component: 'Input',
          componentProps: {
            placeholder: '23:00',
          }
        },
        {
          field: 'autoEmoticons.confirmCount',
          label: '表情确认次数',
          bottomHelpMessage: '在记录时间内接收多少次才保存表情包',
          component: 'InputNumber',
          componentProps: {
            min: 1,
            step: 1
          }
        },
        {
          field: 'autoEmoticons.replyRate',
          label: '发送表情概率',
          bottomHelpMessage: '发送偷取表情的概率',
          component: 'InputNumber',
          componentProps: {
            min: 0,
            max: 1,
            step: 0.01
          }
        },
        {
          field: 'autoEmoticons.sendCD',
          label: '发送表情冷却时间',
          bottomHelpMessage: '发送表情的冷却时间（秒）',
          component: 'InputNumber',
          componentProps: {
            min: 1,
            step: 1
          }
        },
        {
          field: 'autoEmoticons.maxEmojiCount',
          label: '表情包最大数量',
          bottomHelpMessage: '每个群最大的表情包储存数量，储存在 data/autoEmoticons/emoji_save/ 文件夹下',
          component: 'InputNumber',
          componentProps: {
            min: 0,
            step: 1
          }
        },
        {
          field: 'autoEmoticons.maxEmojiSize',
          label: '表情大小限制',
          bottomHelpMessage: '表情包文件大小限制 (MB)',
          component: 'InputNumber',
          componentProps: {
            min: 0,
            step: 1
          }
        },
        {
          field: 'autoEmoticons.allowGroups',
          label: '表情包白名单群',
          bottomHelpMessage: '需要保存和发送表情包的群号列表，为空数组时表示所有群；（推荐设置该选项，设置后支持无触发自动发送表情包）',
          component: 'Select',
          componentProps: {
            allowAdd: true,
            allowDel: true,
            mode: 'multiple',
            options: groupList_total
          }
        },
        {
          field: 'autoEmoticons.getBotByQQ_targetQQArr',
          label: 'BotQQ号',
          bottomHelpMessage: 'Bot多开qq时指定一个或多个Bot发送表情包，否则将随机使用1个已登录的Bot',
          component: "GTags",
          componentProps: {
            placeholder: '请输入qq号',
            allowAdd: true,
            allowDel: true,
            valueParser: ((value) => value.split(',') || []),
          },
        },
      ],
      getConfigData() {
        return Config.getConfig()
      },

      setConfigData(data, { Result }) {
        let config = Config.getConfig()

        for (let [keyPath, value] of Object.entries(data)) {
          lodash.set(config, keyPath, value)
        }

        try {
          const saved = Config.setConfig(config)
          if (!saved) {
            return Result.error('保存失败，请查看控制台')
          }
          return Result.ok({}, '保存成功~')
        } catch (err) {
          return Result.error('保存失败: ' + err.message)
        }
      },
    },
  }
}
