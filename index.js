import fs from 'node:fs'

if (!global.segment) {
  global.segment = (await import("oicq")).segment
}

let ret = []

logger.info(logger.yellow("[群活跃插件] 正在载入 groupvibe-PLUGIN"))

const files = fs
  .readdirSync('./plugins/groupvibe-plugin/apps')
  .filter((file) => file.endsWith('.js'))

files.forEach((file) => {
  ret.push(import(`./apps/${file}`))
})

ret = await Promise.allSettled(ret)

let apps = {}
for (let i in files) {
  let name = files[i].replace('.js', '')

  if (ret[i].status !== 'fulfilled') {
    logger.error(`[群活跃插件] 载入插件错误：${logger.red(name)}`)
    logger.error(ret[i].reason)
    continue
  }

  const module = ret[i].value
  if (module.default) {
    apps[name] = module.default
  } else {
    apps[name] = module[Object.keys(module)[0]]
  }
}

logger.info(logger.green("[群活跃插件] groupvibe-PLUGIN 载入成功"))

export { apps }
