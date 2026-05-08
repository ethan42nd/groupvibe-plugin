import fs from 'node:fs'
import path from 'node:path'
import chokidar from 'chokidar'
import plugin from '../../../lib/plugins/plugin.js'
import Config from '../components/Config.js'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const emojiListCache = new Map()
const sharedPicturesCache = []
const watchers = new Map()
let sharedPicturesWatcher = null

function getBotByQQ(targetQQArr) {
  for (const targetQQ of targetQQArr) {
    if (targetQQ && Bot[targetQQ]) {
      return Bot[targetQQ];
    }
  }
  return Bot;
}

function isWithinActiveTime(config) {
    if (!config.autoEmoticons.timeRestrictionEnabled) return true;

    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const beijingTime = new Date(utc + (3600000 * 8));

    const currentTime = beijingTime.getHours() * 60 + beijingTime.getMinutes();

    const parseTime = (timeVal) => {
        if (!timeVal) return 0;
        const timeStr = String(timeVal);
        if (!timeStr.includes(':')) {
            return (Number(timeStr) || 0) * 60;
        }
        const [hours, minutes] = timeStr.split(':').map(Number);
        return (hours || 0) * 60 + (minutes || 0);
    };

    const startTime = parseTime(config.autoEmoticons.activeStartTime || "08:00");
    const endTime = parseTime(config.autoEmoticons.activeEndTime || "23:00");

    if (startTime <= endTime) {
        return currentTime >= startTime && currentTime <= endTime;
    } else {
        return currentTime >= startTime || currentTime <= endTime;
    }
}

function initSharedPicturesWatcher() {
    if (sharedPicturesWatcher) return

    const sharedPicturesDir = path.join(process.cwd(), 'data', 'autoEmoticons', 'PaimonChuoYiChouPictures')

    if (!fs.existsSync(sharedPicturesDir)) {
        fs.mkdirSync(sharedPicturesDir, { recursive: true })
    }

    function loadSharedPictures(dir) {
        const pictures = []
        try {
            const items = fs.readdirSync(dir, { withFileTypes: true })
            for (const item of items) {
                const fullPath = path.join(dir, item.name)
                if (item.isDirectory()) {
                    pictures.push(...loadSharedPictures(fullPath))
                } else if (item.isFile()) {
                    const ext = path.extname(item.name).toLowerCase()
                    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) {
                        pictures.push(fullPath)
                    }
                }
            }
        } catch (err) {
            logger.error(`[autoEmoticons] 读取共享图片目录失败: ${err}`)
        }
        return pictures
    }

    const initialPictures = loadSharedPictures(sharedPicturesDir)
    sharedPicturesCache.splice(0, sharedPicturesCache.length, ...initialPictures)
    logger.info(`[autoEmoticons] 已加载 ${sharedPicturesCache.length} 个共享图片`)

    sharedPicturesWatcher = chokidar.watch(sharedPicturesDir, {
        persistent: true,
        ignoreInitial: true,
        recursive: true,
        awaitWriteFinish: {
            stabilityThreshold: 1000,
            pollInterval: 100
        }
    })

    sharedPicturesWatcher.on('add', (filepath) => {
        const ext = path.extname(filepath).toLowerCase()
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) {
            if (!sharedPicturesCache.includes(filepath)) {
                sharedPicturesCache.push(filepath)
                logger.debug(`[autoEmoticons] 监测到新共享图片: ${path.relative(sharedPicturesDir, filepath)}`)
            }
        }
    })

    sharedPicturesWatcher.on('unlink', (filepath) => {
        const index = sharedPicturesCache.indexOf(filepath)
        if (index > -1) {
            sharedPicturesCache.splice(index, 1)
            logger.debug(`[autoEmoticons] 监测到共享图片删除: ${path.relative(sharedPicturesDir, filepath)}`)
        }
    })

    sharedPicturesWatcher.on('error', (error) => {
        logger.error(`[autoEmoticons] 共享图片目录监视器错误: ${error}`)
    })
}

export function getAvailablePictures(groupId) {
    const groupEmojis = emojiListCache.get(String(groupId)) || []
    const emojiSaveDir = path.join(process.cwd(), 'data', 'autoEmoticons', 'emoji_save', String(groupId))

    const groupEmojiPaths = groupEmojis.map(filename => path.join(emojiSaveDir, filename))

    return [...groupEmojiPaths, ...sharedPicturesCache]
}

function initWatcher(groupId) {
    if (watchers.has(groupId)) return

    const emojiSaveDir = path.join(process.cwd(), 'data', 'autoEmoticons', 'emoji_save', `${groupId}`)

    if (!fs.existsSync(emojiSaveDir)) {
        fs.mkdirSync(emojiSaveDir, { recursive: true })
    }

    if (!emojiListCache.has(groupId)) {
        emojiListCache.set(groupId, [])
    }

    try {
        const files = fs.readdirSync(emojiSaveDir)
        emojiListCache.set(groupId, files)
        logger.info(`[autoEmoticons] 已加载群 ${groupId} 的 ${files.length} 个表情`)
    } catch (err) {
        logger.error(`[autoEmoticons] 读取表情目录失败: ${err}`)
    }

    const watcher = chokidar.watch(emojiSaveDir, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 1000,
            pollInterval: 100
        }
    })

    watcher.on('add', (filepath) => {
        const filename = path.basename(filepath)
        const emojiList = emojiListCache.get(groupId) || []
        if (!emojiList.includes(filename)) {
            emojiList.push(filename)
            emojiListCache.set(groupId, emojiList)
            logger.debug(`[autoEmoticons] 监测到新表情: ${filename}`)
        }
    })

    watcher.on('unlink', (filepath) => {
        const filename = path.basename(filepath)
        const emojiList = emojiListCache.get(groupId) || []
        const index = emojiList.indexOf(filename)
        if (index > -1) {
            emojiList.splice(index, 1)
            emojiListCache.set(groupId, emojiList)
            logger.debug(`[autoEmoticons] 监测到表情删除: ${filename}`)
        }
    })

    watcher.on('error', (error) => {
        logger.error(`[autoEmoticons] 目录监视器错误: ${error}`)
    })

    watchers.set(groupId, watcher)
}

const useEmojiSave_Switch = Config.getConfig().autoEmoticons?.useEmojiSave;

export class autoEmoticons extends plugin {
    constructor() {
        const regStr = useEmojiSave_Switch ? "" : `sf-plugin-autoEmoticons-${Math.floor(10000 + Math.random() * 90000)}`;
        super({
            name: '自动表情包',
            dsc: '自动保存群聊中多次出现的图片作为表情包，并随机发送',
            event: 'message.group',
            priority: -5000,
            rule: [
                {
                    reg: regStr,
                    fnc: 'autoEmoticonsTrigger',
                    log: false
                },
                {
                    event: 'message.group',
                    reg: '^#?(哒|达)咩(文本|图片)?记录(第\\d+页|\\d+)?$',
                    fnc: 'showDamieRecord',
                },
                {
                    reg: '^#?(哒|达)咩$',
                    fnc: 'deleteEmoji',
                },
                {
                    reg: '^#群自动表情包配置$',
                    fnc: 'showConfig',
                },
                {
                    reg: '^#自动表情包(开启|关闭)$',
                    fnc: 'toggleGroupEmoticons',
                }
            ],
        })
        this.task = [
            {
                cron: '0 */5 * * * *',
                name: '自动表情包-发送表情',
                fnc: this.sendimg.bind(this),
                log: false
            },
        ]
    }

    async autoEmoticonsTrigger(e) {
        this.saveAndSendEmoji(e);
        return false;
    }

    async saveAndSendEmoji(e) {
        if (!useEmojiSave_Switch) return false
        const config = Config.getConfig()
        if (!e.isGroup) return false
        const groupId = String(e.group_id)
        if (config.autoEmoticons.allowGroups.length > 0 && !config.autoEmoticons.allowGroups.includes(groupId)) {
            return false
        }

        initWatcher(groupId)
        initSharedPicturesWatcher()

        const emojiSaveDir = path.join(process.cwd(), 'data', 'autoEmoticons', 'emoji_save', `${groupId}`)
        const emojiList = emojiListCache.get(groupId) || []

        for (const item of e.message) {
            if (item.type === 'image') {
                if (item.file_size && item.file_size >= (config.autoEmoticons.maxEmojiSize * 1024 * 1024)) continue

                const fileUnique = item.filename
                    ? item.filename.split('.')[0]
                    : item.file.split('/').pop().split('.')[0] || item.url.split('/').pop().split('.')[0]

                try {
                    const blockKey = `Yz:autoEmoticons:blocked:${fileUnique}`
                    const isBlocked = await redis.get(blockKey)
                    if (isBlocked) {
                        logger.debug(`[autoEmoticons] 不下载已知过大的表情/图片: ${fileUnique}`)
                        continue
                    }

                    const imgType = item.filename
                        ? item.filename.split('.').pop()
                        : (item.file.split('.').pop() || 'jpg')
                    const filename = `${fileUnique}.${imgType}`

                    if (!emojiList.includes(`${fileUnique}.jpg`) && !emojiList.includes(`${filename}`)) {
                        let canBeStored = false
                        const redisKey = `Yz:autoEmoticons:${groupId}:${fileUnique}`
                        const currentCount = await redis.get(redisKey)

                        if (!currentCount) {
                            await redis.set(redisKey, '1', {
                                EX: config.autoEmoticons.expireTimeInSeconds
                            })
                            logger.debug(`[autoEmoticons] 表情首次出现: ${fileUnique} (1/${config.autoEmoticons.confirmCount})`)
                        } else {
                            const newCount = parseInt(currentCount) + 1
                            await redis.set(redisKey, String(newCount), {
                                EX: config.autoEmoticons.expireTimeInSeconds
                            })

                            if (newCount >= config.autoEmoticons.confirmCount) {
                                await redis.del(redisKey)
                                canBeStored = true
                                logger.debug(`[autoEmoticons] 已达到确认次数: ${fileUnique} (${config.autoEmoticons.confirmCount}/${config.autoEmoticons.confirmCount})`)
                            } else {
                                logger.debug(`[autoEmoticons] 表情再次出现: ${fileUnique} (${newCount}/${config.autoEmoticons.confirmCount})`)
                            }
                        }

                        if (!canBeStored) continue

                        const downloadResult = await downloadImageFile(
                            item.url,
                            `emoji_save/${groupId}/${fileUnique}`,
                            config.autoEmoticons.maxEmojiSize
                        )

                        if (!downloadResult.success) {
                            logger.error(`[autoEmoticons] 下载表情失败: ${downloadResult.error}`)

                            if (downloadResult.error && downloadResult.error.includes('文件过大')) {
                                const ONE_MONTH_IN_SECONDS = 30 * 24 * 60 * 60
                                await redis.set(blockKey, '1', {
                                    EX: ONE_MONTH_IN_SECONDS
                                })
                                logger.mark(`[autoEmoticons] 表情文件过大，已加入黑名单: ${fileUnique}，大小: ${downloadResult.size}，30天内不再下载`)
                            }
                            continue
                        }

                        const actualFilename = `${fileUnique}.${downloadResult.actualExt}`
                        logger.mark(`[autoEmoticons] 保存表情成功: ${actualFilename}，大小: ${downloadResult.size} 字节`)

                        if (emojiList.length > config.autoEmoticons.maxEmojiCount) {
                            const randomIndex = Math.floor(Math.random() * emojiList.length)
                            const fileToDelete = emojiList[randomIndex]
                            try {
                                fs.unlinkSync(path.join(emojiSaveDir, fileToDelete))
                                logger.debug(`[autoEmoticons] 表情数量过多，删除: ${fileToDelete}`)
                            } catch (err) {
                                logger.error(`[autoEmoticons] 删除表情失败: ${err}`)
                            }
                        }
                    }
                } catch (error) {
                    logger.error(`[autoEmoticons] 处理表情出错: ${error}`)
                }
            }
        }

        const cooldownKey = `Yz:autoEmoticons:cooldown:${groupId}`
        const lastSendTime = await redis.get(cooldownKey)
        const now = Date.now()

        if (!isWithinActiveTime(config)) {
            return false;
        }

        if (lastSendTime && (now - parseInt(lastSendTime)) < (config.autoEmoticons.sendCD * 1000)) {
            const remainingTime = Math.ceil(((parseInt(lastSendTime) + (config.autoEmoticons.sendCD * 1000)) - now) / 1000)
            logger.debug(`[autoEmoticons] 群 ${groupId} 还在冷却中，剩余 ${remainingTime} 秒`)
            return false
        }

        const availablePictures = getAvailablePictures(groupId)
        if (Math.random() < config.autoEmoticons.replyRate && availablePictures.length > 0) {
            let msgRet, msgRet_id
            try {
                await redis.set(cooldownKey, String(now), { EX: config.autoEmoticons.sendCD })

                const randomIndex = Math.floor(Math.random() * availablePictures.length)
                const picturePath = availablePictures[randomIndex]

                const delay = randomInt(config.autoEmoticons.replyDelay.min, config.autoEmoticons.replyDelay.max)
                logger.mark(`[autoEmoticons] 群${e.group_id} 将在${delay}毫秒后发送表情包`)
                await sleep(delay)

                msgRet = await e.reply(segment.image(picturePath))
                msgRet_id = msgRet.seq || msgRet.data?.message_id || msgRet.time

                const isSharedPicture = sharedPicturesCache.includes(picturePath)
                const fileInfo = isSharedPicture
                    ? `shared:${path.relative(path.join(process.cwd(), 'data', 'autoEmoticons', 'PaimonChuoYiChouPictures'), picturePath)}`
                    : path.basename(picturePath)

                redis.set(`Yz:autoEmoticons.sent:pic_filePath:${groupId}:${msgRet_id}`, fileInfo, { EX: 60 * 60 * 24 * 1 })
                logger.debug(`[autoEmoticons] 概率发送图片成功: ${picturePath}`)
            } catch (error) {
                logger.error(`[autoEmoticons] 发送图片失败: ${error}`)
            }
        }

        return false
    }

    async sendimg_Active(e) {
        const groupId = String(e.group_id)
        initSharedPicturesWatcher()
        initWatcher(groupId);
        try {
            const availablePictures = getAvailablePictures(groupId)
            if (availablePictures.length === 0) {
                logger.debug(`[autoEmoticons] 主动发送图片到群 ${groupId} 没有可用图片，跳过`);
                return false;
            }
            const randomIndex = Math.floor(Math.random() * availablePictures.length);
            const picturePath = availablePictures[randomIndex];
            try {
                const msgRet = await e.reply(segment.image(picturePath));
                const msgId = msgRet.seq || msgRet.data?.message_id || msgRet.time

                const isSharedPicture = sharedPicturesCache.includes(picturePath)
                const fileInfo = isSharedPicture
                    ? `shared:${path.relative(path.join(process.cwd(), 'data', 'autoEmoticons', 'PaimonChuoYiChouPictures'), picturePath)}`
                    : path.basename(picturePath)

                await redis.set(`Yz:autoEmoticons.sent:pic_filePath:${groupId}:${msgId}`, fileInfo, {
                    EX: 60 * 60 * 24 * 1
                });
                logger.info(`[autoEmoticons] 主动发送图片到群 ${groupId}: ${picturePath}`);
            } catch (error) {
                logger.error(`[autoEmoticons] 主动发送图片到群 ${groupId} 失败: ${error}`);
            }
        } catch (error) {
            logger.error(`[autoEmoticons] 主动发送 ${groupId} 表情包出错: ${error}`);
        }
        return true;
    }

    async sendimg() {
        if (!useEmojiSave_Switch) return false;
        const config = Config.getConfig()

        if (!isWithinActiveTime(config)) {
            return false;
        }

        initSharedPicturesWatcher()

        for (const groupId of config.autoEmoticons.allowGroups) {
            try {
                const cooldownKey = `Yz:autoEmoticons:cooldown:${groupId}`
                const lastSendTime = await redis.get(cooldownKey)
                const now = Date.now()

                if (lastSendTime && (now - parseInt(lastSendTime)) < (config.autoEmoticons.sendCD * 1000)) {
                    const remainingTime = Math.ceil(((parseInt(lastSendTime) + (config.autoEmoticons.sendCD * 1000)) - now) / 1000)
                    logger.debug(`[autoEmoticons] 群 ${groupId} 还在冷却中，剩余 ${remainingTime} 秒`)
                    continue
                }

                if (Math.random() >= config.autoEmoticons.replyRate) {
                    logger.debug(`[autoEmoticons] 群 ${groupId} 随机概率未触发发送`);
                    continue;
                }

                initWatcher(groupId);

                const availablePictures = getAvailablePictures(groupId)

                if (availablePictures.length === 0) {
                    logger.debug(`[autoEmoticons] 群 ${groupId} 没有可用图片，跳过`);
                    continue;
                }

                const randomIndex = Math.floor(Math.random() * availablePictures.length);
                const picturePath = availablePictures[randomIndex];

                try {
                    await redis.set(cooldownKey, String(now), { EX: config.autoEmoticons.sendCD })

                    const group = getBotByQQ(config.autoEmoticons.getBotByQQ_targetQQArr).pickGroup(parseInt(groupId));
                    if (!group) {
                        logger.error(`[autoEmoticons] 无法获取群 ${groupId} 的实例`);
                        continue;
                    }

                    const delay = randomInt(config.autoEmoticons.replyDelay.min, config.autoEmoticons.replyDelay.max)
                    logger.mark(`[autoEmoticons] 群${groupId} 将在${(delay / 1000).toFixed(0)}秒后发送表情包 ${picturePath}`)
                    await sleep(delay)

                    const msgRet = await group.sendMsg(segment.image(picturePath));
                    const msgId = msgRet.seq || msgRet.data?.message_id || msgRet.time

                    const isSharedPicture = sharedPicturesCache.includes(picturePath)
                    const fileInfo = isSharedPicture
                        ? `shared:${path.relative(path.join(process.cwd(), 'data', 'autoEmoticons', 'PaimonChuoYiChouPictures'), picturePath)}`
                        : path.basename(picturePath)

                    await redis.set(`Yz:autoEmoticons.sent:pic_filePath:${groupId}:${msgId}`, fileInfo, {
                        EX: 60 * 60 * 24 * 1
                    });
                } catch (error) {
                    logger.error(`[autoEmoticons] 定时任务发送图片到群 ${groupId} 失败: ${error}`);
                }
            } catch (error) {
                logger.error(`[autoEmoticons] 处理群 ${groupId} 定时发送任务出错: ${error}`);
            }
        }

        return false;
    }

    async showDamieRecord(e) {
        const msg = e.msg;
        let type = 'all';
        if (msg.includes('文本')) type = 'text';
        if (msg.includes('图片')) type = 'image';

        let page = 1;
        let count = 3;

        const pageMatch = msg.match(/第(\d+)页/);
        if (pageMatch) {
            page = parseInt(pageMatch[1]) || 1;
            count = 10;
        } else {
            const countMatch = msg.match(/记录(\d+)$/);
            if (countMatch) {
                count = parseInt(countMatch[1]) || 3;
                count = Math.min(count, 10);
            }
        }

        const recycleBinPath = path.join(process.cwd(), 'data', 'autoEmoticons', 'recycle_bin');
        const recycleTextPath = path.join(process.cwd(), 'data', 'autoEmoticons', 'recycle_bin_text.txt');

        let texts = [];
        let images = [];

        if (fs.existsSync(recycleTextPath)) {
            const content = fs.readFileSync(recycleTextPath, 'utf-8');
            texts = content.split('\n').filter(Boolean).reverse();
        }

        if (fs.existsSync(recycleBinPath)) {
            const files = fs.readdirSync(recycleBinPath);
            images = files.filter(f => ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(path.extname(f).toLowerCase()))
                          .map(f => {
                              const parts = f.split('_');
                              const ts = parseInt(parts[0]) || 0;
                              return { name: f, time: ts, fullPath: path.join(recycleBinPath, f) };
                          })
                          .sort((a, b) => b.time - a.time);
        }

        const totalTexts = texts.length;
        const totalImages = images.length;

        let forwardMsg = [];

        forwardMsg.push(`📊 哒咩回收站统计\n━━━━━━━━━━━━━━\n📝 文本拦截: ${totalTexts} 条\n🖼️ 图片拦截: ${totalImages} 张`);

        if (type === 'all') {
            forwardMsg.push(`--- 最近 ${count} 条文本记录 ---`);
            const showTexts = texts.slice(0, count);
            if (showTexts.length > 0) {
                showTexts.forEach(t => forwardMsg.push(t));
            } else {
                forwardMsg.push("暂无文本记录");
            }

            forwardMsg.push(`--- 最近 ${count} 张图片记录 ---`);
            const showImages = images.slice(0, count);
            if (showImages.length > 0) {
                showImages.forEach(img => {
                    forwardMsg.push(segment.image(img.fullPath));
                });
            } else {
                forwardMsg.push("暂无图片记录");
            }

        } else if (type === 'text') {
            const maxPage = Math.ceil(totalTexts / 10) || 1;
            page = Math.min(page, maxPage);
            const start = (page - 1) * 10;
            const end = start + 10;
            const showTexts = texts.slice(start, end);

            forwardMsg.push(`📝 文本哒咩记录 (第 ${page}/${maxPage} 页)`);
            if (showTexts.length > 0) {
                showTexts.forEach((t, idx) => forwardMsg.push(`${start + idx + 1}. ${t}`));
            } else {
                forwardMsg.push("暂无文本记录");
            }

        } else if (type === 'image') {
            const maxPage = Math.ceil(totalImages / 10) || 1;
            page = Math.min(page, maxPage);
            const start = (page - 1) * 10;
            const end = start + 10;
            const showImages = images.slice(start, end);

            forwardMsg.push(`🖼️ 图片哒咩记录 (第 ${page}/${maxPage} 页)`);
            if (showImages.length > 0) {
                showImages.forEach((img, idx) => {
                    forwardMsg.push([`编号 ${start + idx + 1}:\n`, segment.image(img.fullPath)]);
                });
            } else {
                forwardMsg.push("暂无图片记录");
            }
        }

        let forwardNode = [];
        for (let msg of forwardMsg) {
            forwardNode.push({
                user_id: Bot.uin,
                nickname: Bot.nickname,
                message: msg
            });
        }

        try {
            let replyMsg;
            if (e.isGroup) {
                replyMsg = await e.group.makeForwardMsg(forwardNode);
            } else {
                replyMsg = await e.friend.makeForwardMsg(forwardNode);
            }
            await e.reply(replyMsg);
        } catch (err) {
            logger.error(`[哒咩记录] 生成合并转发失败: ${err}`);
            await e.reply("合并转发消息生成失败，可能是当前框架或协议端暂不支持。");
        }

        return true;
    }

    async deleteEmoji(e) {
        const groupId = String(e.group_id)
        if (!e.isGroup || !e.isMaster) return false;

        const replyMsgId = e.source?.seq || e.reply_id;
        if (!replyMsgId) {
            return false;
        }

        const fileInfo = await redis.get(`Yz:autoEmoticons.sent:pic_filePath:${groupId}:${replyMsgId}`);
        if (fileInfo) {
            try {
                let filePath;
                let fileUnique = null;
                let isShared = false;

                if (fileInfo.startsWith('shared:')) {
                    isShared = true;
                    const relPath = fileInfo.substring(7);
                    filePath = path.join(process.cwd(), 'data', 'autoEmoticons', 'PaimonChuoYiChouPictures', relPath);
                    fileUnique = path.basename(filePath, path.extname(filePath));
                } else {
                    filePath = path.join(process.cwd(), 'data', 'autoEmoticons', 'emoji_save', groupId, fileInfo);
                    fileUnique = path.basename(fileInfo, path.extname(fileInfo));
                }

                if (filePath && fs.existsSync(filePath)) {
                    const filename = path.basename(filePath);
                    const recycleBinPath = path.join(process.cwd(), 'data', 'autoEmoticons', 'recycle_bin');
                    if (!fs.existsSync(recycleBinPath)) {
                        fs.mkdirSync(recycleBinPath, { recursive: true });
                    }
                    const targetPath = path.join(recycleBinPath, `${Date.now()}_${filename}`);

                    try {
                        fs.renameSync(filePath, targetPath);
                    } catch(err) {
                        fs.copyFileSync(filePath, targetPath);
                        fs.unlinkSync(filePath);
                    }
                    logger.mark(`[autoEmoticons] 图片已移入回收站: ${targetPath}`);

                    if (isShared) {
                        const index = sharedPicturesCache.indexOf(filePath);
                        if (index > -1) sharedPicturesCache.splice(index, 1);
                    } else {
                        const emojiList = emojiListCache.get(groupId) || [];
                        const index = emojiList.indexOf(filename);
                        if (index > -1) {
                            emojiList.splice(index, 1);
                            emojiListCache.set(groupId, emojiList);
                        }
                    }

                    if (fileUnique) {
                        const blockKey = `Yz:autoEmoticons:blocked:${fileUnique}`
                        await redis.set(blockKey, '1', { EX: 30 * 24 * 60 * 60 })
                    }

                    let res = await e.group.recallMsg(replyMsgId)
                    if (!res) this.reply("人家不是管理员，不能撤回超过2分钟的消息呢~")
                    await e.reply(`呜呜呜~人家错了，图片已经被关进小黑屋了~`);
                } else {
                    await e.reply("文件好像已经被删除了，找不到它呢。");
                }
                await redis.del(`Yz:autoEmoticons.sent:pic_filePath:${groupId}:${replyMsgId}`);
            } catch (error) {
                logger.error(`[autoEmoticons] 图片移入回收站失败: ${error}`);
            }
            return true;
        }

        const textContent = await redis.get(`Yz:autoEmoticons.sent:text_content:${groupId}:${replyMsgId}`);
        if (textContent) {
            try {
                let res = await e.group.recallMsg(replyMsgId);
                if (!res) this.reply("人家不是管理员，不能撤回超过2分钟的消息呢~");

                let config = Config.getConfig();
                if (config.pokeConfig && config.pokeConfig.word_list) {
                    let words = config.pokeConfig.word_list.split('\n').map(w => w.trim()).filter(Boolean);
                    const index = words.indexOf(textContent);
                    if (index > -1) {
                        words.splice(index, 1);
                        config.pokeConfig.word_list = words.join('\n');
                        Config.setConfig(config);
                        logger.mark(`[autoEmoticons] 已从戳一戳词库中移除: ${textContent}`);
                    }
                }

                const recycleTextPath = path.join(process.cwd(), 'data', 'autoEmoticons', 'recycle_bin_text.txt');
                const timeStr = new Date().toLocaleString('zh-CN', { hour12: false });
                fs.appendFileSync(recycleTextPath, `[${timeStr}] ${textContent}\n`);

                await e.reply(`这句台词太尬了，我已经把它丢进文本回收站啦！`);
                await redis.del(`Yz:autoEmoticons.sent:text_content:${groupId}:${replyMsgId}`);
            } catch (error) {
                logger.error(`[autoEmoticons] 文字移入回收站失败: ${error}`);
            }
            return true;
        }

        logger.mark(`[autoEmoticons] 该消息既不是本插件发送的图片，也不是本插件发送的文字`);
        return false;
    }

    async showConfig(e) {
        if (!e.isGroup || !e.isMaster) {
            await e.reply('只有主人可以查看配置哦~')
            return true
        }

        const config = Config.getConfig()
        const groupId = String(e.group_id)

        const emojiList = emojiListCache.get(groupId) || []
        const groupEmojiCount = emojiList.length

        const sharedPictureCount = sharedPicturesCache.length

        const formatTime = (seconds) => {
            const days = Math.floor(seconds / 86400)
            const hours = Math.floor((seconds % 86400) / 3600)
            const minutes = Math.floor((seconds % 3600) / 60)

            if (days > 0) return `${days}天${hours}小时${minutes}分钟`
            if (hours > 0) return `${hours}小时${minutes}分钟`
            return `${minutes}分钟`
        }

        const formatDelay = (ms) => {
            if (ms >= 60000) {
                return `${Math.floor(ms / 60000)}分${Math.floor((ms % 60000) / 1000)}秒`
            }
            return `${Math.floor(ms / 1000)}秒`
        }

        const isGroupAllowed = config.autoEmoticons.allowGroups.length === 0 || config.autoEmoticons.allowGroups.includes(groupId)

        const cooldownKey = `Yz:autoEmoticons:cooldown:${groupId}`
        const lastSendTime = await redis.get(cooldownKey)
        const now = Date.now()
        let cooldownStatus = '无冷却'

        if (lastSendTime && (now - parseInt(lastSendTime)) < (config.autoEmoticons.sendCD * 1000)) {
            const remainingTime = Math.ceil(((parseInt(lastSendTime) + (config.autoEmoticons.sendCD * 1000)) - now) / 1000)
            cooldownStatus = `冷却中 (${formatTime(remainingTime)})`
        }

        const configMsg = [
            '📊 表情包插件配置状态',
            '━━━━━━━━━━━━━━━━━━',
            `🔧 功能状态: ${useEmojiSave_Switch ? '✅ 已启用' : '❌ 已禁用'}`,
            `🎯 当前群状态: ${isGroupAllowed ? '✅ 允许' : '❌ 不在允许列表'}`,
            '',
            '📈 统计信息:',
            `　🖼️ 当前群表情: ${groupEmojiCount} 个`,
            `　🌐 共享图片: ${sharedPictureCount} 个`,
            `　⏰ 发送冷却: ${cooldownStatus}`,
            '',
            '⚙️ 配置参数:',
            `　⏰ 活跃时间: ${config.autoEmoticons.timeRestrictionEnabled ? `${config.autoEmoticons.activeStartTime} ~ ${config.autoEmoticons.activeEndTime}` : '全天24小时'}`,
            `　⏱️ 过期时间: ${formatTime(config.autoEmoticons.expireTimeInSeconds)}`,
            `　🔢 确认次数: ${config.autoEmoticons.confirmCount} 次`,
            `　🎲 发送概率: ${(config.autoEmoticons.replyRate * 100).toFixed(1)}%`,
            `　📦 最大数量: ${config.autoEmoticons.maxEmojiCount} 个`,
            `　📏 大小限制: ${config.autoEmoticons.maxEmojiSize} MB`,
            `　❄️ 冷却时间: ${formatTime(config.autoEmoticons.sendCD)}`,
            `　⏳ 发送延迟: ${formatDelay(config.autoEmoticons.replyDelay.min)} ~ ${formatDelay(config.autoEmoticons.replyDelay.max)}`,
            '',
            '🎯 允许群组:',
            config.autoEmoticons.allowGroups.length === 0 ? '　📢 所有群组' : config.autoEmoticons.allowGroups.map(id => `　🏷️ ${id}`).join('\n'),
            '━━━━━━━━━━━━━━━━━━'
        ].join('\n')

        await e.reply(configMsg)
        return true
    }

    async toggleGroupEmoticons(e) {
        if (!e.isGroup || !e.isMaster) {
            await e.reply('只有主人可以设置群表情包功能哦~')
            return true
        }

        const groupId = String(e.group_id)
        const action = e.msg.includes('开启') ? 'enable' : 'disable'

        const formatTime = (seconds) => {
            const days = Math.floor(seconds / 86400)
            const hours = Math.floor((seconds % 86400) / 3600)
            const minutes = Math.floor((seconds % 3600) / 60)

            if (days > 0) return `${days}天${hours}小时${minutes}分钟`
            if (hours > 0) return `${hours}小时${minutes}分钟`
            return `${minutes}分钟`
        }

        try {
            let config = Config.getConfig()
            const currentAllowGroups = [...config.autoEmoticons.allowGroups]

            if (action === 'enable') {
                if (!currentAllowGroups.includes(groupId)) {
                    currentAllowGroups.push(groupId)

                    config.autoEmoticons.allowGroups = currentAllowGroups

                    initWatcher(groupId)
                    initSharedPicturesWatcher()

                    await e.reply([
                        '✅ 当前群自动表情包功能已开启！',
                        '',
                        '功能说明：',
                        `• 图片在 ${formatTime(config.autoEmoticons.expireTimeInSeconds)} 内出现 ${config.autoEmoticons.confirmCount} 次将被保存`,
                        `• 有 ${(config.autoEmoticons.replyRate * 100).toFixed(1)}% 概率自动发送表情`,
                        `• 发送间隔：${formatTime(config.autoEmoticons.sendCD)}`,
                        `• 回复"#(哒|达)咩"可删除刚发送的表情`
                    ].join('\n'))
                } else {
                    await e.reply('❗ 当前群的自动表情包功能已经是开启状态了~')
                }
            } else {
                const index = currentAllowGroups.indexOf(groupId)
                if (index > -1) {
                    currentAllowGroups.splice(index, 1)

                    config.autoEmoticons.allowGroups = currentAllowGroups

                    const cooldownKey = `Yz:autoEmoticons:cooldown:${groupId}`
                    await redis.del(cooldownKey)

                    await e.reply([
                        '❌ 当前群自动表情包功能已关闭！',
                        '',
                        '说明：',
                        '• 不再保存新的表情包',
                        '• 不再自动发送表情',
                        '• 已保存的表情包不会被删除',
                        '• 可随时使用"#自动表情包开启"重新启用'
                    ].join('\n'))
                } else {
                    await e.reply('❗ 当前群的自动表情包功能已经是关闭状态了~')
                }
            }

            Config.setConfig(config);
        } catch (error) {
            logger.error(`[autoEmoticons] 切换群功能失败: ${error}`)
            await e.reply('❌ 操作失败，请查看日志获取详细信息')
        }

        return true
    }
}

function getImageTypeFromBuffer(buffer) {
    if (!buffer || buffer.length < 8) return 'jpg'

    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return 'jpg'
    }

    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        return 'png'
    }

    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
        return 'gif'
    }

    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
        return 'webp'
    }

    if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
        return 'bmp'
    }

    return 'jpg'
}

export async function downloadImageFile(url, relativePath, maxSizeMB = null) {
    try {
        const maxSize = maxSizeMB ? maxSizeMB * 1024 * 1024 : null

        let contentLength = null
        try {
            const headResponse = await fetch(url, {
                method: 'HEAD',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 10000,
                follow: 5,
                compress: false
            })

            if (headResponse.ok && headResponse.headers.has('content-length')) {
                contentLength = parseInt(headResponse.headers.get('content-length'))

                if (maxSize && contentLength > maxSize) {
                    const fileSizeMB = (contentLength / 1024 / 1024).toFixed(2)
                    return {
                        success: false,
                        filePath: null,
                        actualExt: null,
                        size: contentLength,
                        error: `文件过大: ${fileSizeMB}MB，超过限制 ${maxSizeMB}MB`
                    }
                }

                const fileSizeMB = (contentLength / 1024 / 1024).toFixed(2)
                logger.debug(`[downloadImageFile] 文件大小检查通过: ${fileSizeMB}MB`)
            } else {
                logger.debug(`[downloadImageFile] 无法获取文件大小，继续下载`)
            }
        } catch (headError) {
            logger.debug(`[downloadImageFile] HEAD 请求失败，继续下载: ${headError.message}`)
        }

        let response
        let retryCount = 0
        const maxRetries = 3

        while (retryCount < maxRetries) {
            try {
                response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    },
                    timeout: 30000,
                    follow: 5,
                    compress: false,
                    agent: false
                })

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`)
                }

                break
            } catch (fetchError) {
                retryCount++
                logger.warn(`[downloadImageFile] 下载尝试 ${retryCount}/${maxRetries} 失败: ${fetchError.message}`)

                if (retryCount >= maxRetries) {
                    throw fetchError
                }

                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
            }
        }

        const arrayBuffer = await response.arrayBuffer()
        const bufferData = Buffer.from(arrayBuffer)

        if (maxSize && bufferData.length > maxSize) {
            const downloadedSizeMB = (bufferData.length / 1024 / 1024).toFixed(2)
            return {
                success: false,
                filePath: null,
                actualExt: null,
                size: bufferData.length,
                error: `下载文件过大: ${downloadedSizeMB}MB，超过限制 ${maxSizeMB}MB`
            }
        }

        const actualExt = getImageTypeFromBuffer(bufferData)

        const baseDir = path.join(process.cwd(), 'data', 'autoEmoticons')
        const fullPath = path.join(baseDir, `${relativePath}.${actualExt}`)

        const dir = path.dirname(fullPath)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }

        fs.writeFileSync(fullPath, bufferData)

        return {
            success: true,
            filePath: fullPath,
            actualExt: actualExt,
            size: bufferData.length
        }

    } catch (error) {
        logger.error(`[downloadImageFile] 下载失败: ${error.message}`)
        return {
            success: false,
            filePath: null,
            actualExt: null,
            size: 0,
            error: error.message
        }
    }
}
