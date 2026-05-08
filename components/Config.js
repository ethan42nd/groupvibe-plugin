import YAML from 'yaml'
import fs from 'fs'
import path from 'path'
import { pluginRoot } from '../model/path.js'

class Config {
  constructor() {
    this.configCache = {}
    this.noCacheFiles = []
    this.watchHandlers = {}

    this.initConfig()
    this.setupWatchers()
  }

  initConfig() {
    this.checkCopyDef('config')
    let config_default_yaml = this.getDefConfig('config')
    let config_yaml = this.getConfig('config')
    this.setConfig(this.syncDefKeys(config_yaml, config_default_yaml), 'config', true)
  }

  checkCopyDef(configName) {
    const config_default_path = `${pluginRoot}/config/${configName}_default.yaml`
    const config_path = `${pluginRoot}/config/config/${configName}.yaml`

    if (!fs.existsSync(config_default_path)) {
      logger.mark(`[群活跃插件] 默认设置文件${configName}不存在，请检查或重新安装插件`)
      return true
    }

    if (!fs.existsSync(config_path)) {
      logger.mark(`[群活跃插件] 设置文件${configName}不存在，将使用默认设置文件`)
      const configDir = path.dirname(config_path)
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
      }
      fs.copyFileSync(config_default_path, config_path)
    }
  }

  getConfig(configName = 'config') {
    if (this.noCacheFiles.includes(configName)) {
      try {
        const configPath = `${pluginRoot}/config/config/${configName}.yaml`
        let config = YAML.parse(fs.readFileSync(configPath, 'utf-8'))
        return config
      } catch (err) {
        logger.error(`读取设置文件 ${configName}.yaml 失败，将使用默认配置`)
        return this.getDefConfig(configName)
      }
    }

    if (this.configCache[configName]) {
      return this.deepCloneConfig(this.configCache[configName])
    }

    try {
      const configPath = `${pluginRoot}/config/config/${configName}.yaml`
      let configData = YAML.parse(fs.readFileSync(configPath, 'utf-8'))
      this.configCache[configName] = configData
      return this.deepCloneConfig(configData)
    } catch (err) {
      logger.error(`读取设置文件 ${configName}.yaml 失败，将使用默认配置`)
      const defConfig = this.getDefConfig(configName)
      this.configCache[configName] = defConfig
      return this.deepCloneConfig(defConfig)
    }
  }

  getDefConfig(configName = 'config') {
    try {
      return YAML.parse(
        fs.readFileSync(`${pluginRoot}/config/${configName}_default.yaml`, 'utf-8')
      )
    } catch (err) {
      logger.error(`读取默认设置文件 ${configName} 失败，请重新安装插件`, err)
      return false
    }
  }

  setConfig(config_data, configName = 'config', skipCleanup = false) {
    try {
      const newConfig = this.deepCloneConfig(config_data)
      const configPath = `${pluginRoot}/config/config/${configName}.yaml`
      fs.writeFileSync(configPath, YAML.stringify(newConfig))

      if (!this.noCacheFiles.includes(configName)) {
        this.configCache[configName] = newConfig
      }

      return true
    } catch (err) {
      logger.error(`写入 ${configName}.yaml 失败`, err)
      return false
    }
  }

  setupWatchers() {
    const configDir = `${pluginRoot}/config/config`

    try {
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true })
        return
      }

      const configFiles = fs.readdirSync(configDir)
        .filter(file => file.endsWith('.yaml'))
        .map(file => file.replace('.yaml', ''))

      configFiles.forEach(configName => {
        const configPath = `${configDir}/${configName}.yaml`

        if (this.watchHandlers[configName]) {
          this.watchHandlers[configName].close()
        }

        this.watchHandlers[configName] = fs.watch(configPath, () => {
          logger.debug(`[群活跃插件] 检测到配置文件 ${configName}.yaml 被外部修改，将重新加载`)
          delete this.configCache[configName]
        })
      })

      logger.debug(`[群活跃插件] 已设置 ${configFiles.length} 个配置文件的监听`)
    } catch (err) {
      logger.error(`[群活跃插件] 设置配置文件监听失败`, err)
    }
  }

  syncDefKeys(currentConfig, defaultConfig) {
    for (const key in defaultConfig) {
      if (!(key in currentConfig)) {
        currentConfig[key] = defaultConfig[key]
      }
    }
    for (const key in currentConfig) {
      if (!(key in defaultConfig)) {
        delete currentConfig[key]
      }
    }
    return currentConfig
  }

  updateConfig(key, value, configName = 'config') {
    const data = this.getConfig(configName)
    if (!data) logger.error(`无法读取设置文件 ${configName}.yaml`)
    data[key] = value
    this.setConfig(data, configName)
    return data
  }

  deepCloneConfig(obj) {
    if (obj === null || typeof obj !== 'object') return obj

    if (obj instanceof Array) {
      return obj.map(item => this.deepCloneConfig(item))
    }

    const cloned = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const descriptor = Object.getOwnPropertyDescriptor(obj, key)
        if (descriptor && descriptor.get) {
          continue
        } else {
          cloned[key] = this.deepCloneConfig(obj[key])
        }
      }
    }
    return cloned
  }
}

export default new Config()
