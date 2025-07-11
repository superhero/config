import fs           from 'node:fs/promises'
import path         from 'node:path'
import deep         from '@superhero/deep'
import PathResolver from '@superhero/path-resolver'

export default class Config
{
  #config = {}
  #frozen = false
  #layers = new Map()

  get isFrozen()
  {
    return this.#frozen
  }

  constructor(pathResolver)
  {
    this.pathResolver = pathResolver ?? new PathResolver()
  }

  /**
   * Finds the configured value by the defiend config path in this instance config state.
   * @see Config.traverse
   */
  find(configPath, fallback)
  {
    return this.traverse(this.#config, configPath, fallback)
  }

  /**
   * @param {object} config
   * @param {string} configPath
   * @param {any} [fallback] If no value was found, then the fallback value is returned.
   * @returns {any}
   */
  traverse(config, configPath, fallback)
  {
    // split by unescaped slashes
    const keys = configPath.split(/(?<!\\)[\/]/).map(key => key.replace(/\\([\/])/g, '$1'))
    return deep.merge(fallback, keys.reduce((obj, key) => obj && obj[key], config))
  }

  /**
   * Finds the last added configuration matching the provided configPath and returns the absolute 
   * directory path where the config path was declared.
   * 
   * @param {string} configPath
   * 
   * @returns {string|undefined} The absolute directory path where the configuration file was last 
   * found, or undefined if not found.
   */
  findAbsolutePathByConfigPath(configPath)
  {
    const entries = [ ...this.#layers.entries() ].reverse()
    for(const [ filepath, config ] of entries)
    {
      const value = this.traverse(config, configPath)
      if(undefined !== value)
      {
        // Returns the absolute directory path of the last matched layer where the config path 
        // was declared. OBS! the reverse order of the layer entries...
        return filepath
      }
    }
  }

  /**
   * Lists the config file path priority where the provided configPath has been declared. 
   * Prioritised order reflects the reversed order the file with the config path was declared.
   * 
   * @param {string} configPath
   * 
   * @returns {Array<Array<string, string>>} Entries structure: pair of the absolute directory 
   * path where the configuration file was found, and the value of the config path declared in that
   * configuration file.
   */
  findAbsolutePathAndValueByConfigPath(configPath)
  {
    const entries = []

    for(const [ filepath, config ] of this.#layers.entries())
    {
      const value = this.traverse(config, configPath)
      if(undefined !== value)
      {
        // Prepend the prioritised absolute path from the matched config layer where the 
        // config path was declared...
        entries.unshift([ filepath, value ])
      }
    }

    return entries
  }

  /**
   * Finds the last added configuration matching the provided configPath and value and 
   * returns the absolute directory path where the configuration file that contains the
   * value was found.
   * 
   * @param {string}  configPath
   * @param {any}     configValue
   * 
   * @returns {string|undefined} The absolute directory path where the configuration 
   * file was last found, or undefined if not found.
   */
  findAbsolutePathByConfigEntry(configPath, configValue)
  {
    const partialEquals = value => 'object' === typeof configValue
                                && 'object' === typeof value
                                  ? Array.isArray(configValue) && Array.isArray(value)
                                    ? configValue.every(configuredValue  => value.includes(configuredValue))
                                    : Object.keys(configValue).every(key => configValue[key] === value[key])
                                  : configValue === value

    let absoluteDirPath

    for(const [ filepath, config ] of this.#layers.entries())
    {
      const value = this.traverse(config, configPath)

      if(partialEquals(value))
      {
        // Returns the absolute directory path of the last matched layer 
        // where the configuration file was found becouse we don't break
        // when we find the match.
        absoluteDirPath = filepath
      }
    }
  
    return absoluteDirPath
  }

  add(filepath, config)
  {
    // backwards compatibility...
    this.assign(config, filepath)
  }

  assign(config, filepath = '')
  {
    if(this.isFrozen)
    {
      const error = new Error(`The config instance is in a frozen state`)
      error.code  = 'E_CONFIG_FROZEN'
      throw error
    }
    else
    {
      const clone = deep.clone(config)
      deep.assign(this.#config, clone)
      this.#layers.set(filepath, config)
    }
  }

  freeze()
  {
    deep.freeze(this.#config)
    this.#frozen = true
  }

  has(filepath)
  {
    return this.#layers.has(filepath)
  }

  async resolve(configpath, branch = false)
  {
    try
    {
      const
        resolveFile           = this.#resolveFile.bind(this, branch),
        resolveDirectory      = this.#resolveDirectory.bind(this, branch),
        [ filepath, config ]  = await this.pathResolver.resolve(configpath, resolveFile, resolveDirectory)

      if(config)
      {
        return { filepath, config, branch }
      }
      else
      {
        const error = new ReferenceError(`Could not find config file`)
        error.code  = 'E_CONFIG_NOT_FOUND'
        throw error
      }
    }
    catch(reason)
    {
      const error = branch
                  ? new Error(`Could not resolve config "${configpath}" using branch "${branch}"`)
                  : new Error(`Could not resolve config "${configpath}"`)
      error.code  = 'E_CONFIG_RESOLVE'
      error.cause = reason
      throw error
    }
  }

  async #resolveFile(branch, filepath)
  {
    const dirpath = path.dirname(filepath)
    return await this.#resolveDirectory(branch, dirpath)
  }

  async #resolveDirectory(branch, dirpath)
  {
    branch = branch ? `-${branch}` : ''

    const 
      files = await fs.readdir(dirpath),
      name  = `config${branch}`

    for(const filename of [`${name}.js`,  `.${name}.js`, 
                           `${name}.mjs`, `.${name}.mjs`, 
                           `${name}.cjs`, `.${name}.cjs`])
    {
      if(files.includes(filename))
      {
        const 
          filepath = path.join(dirpath, filename),
          imported = await import(filepath)
  
        return [ filepath, imported.default ]
      }
    }

    for(const filename of [`${name}.json`, `.${name}.json`, `.${name}`])
    {
      if(files.includes(filename))
      {
        const 
          filepath = path.join(dirpath, filename),
          imported = await import(filepath, { with: { type: 'json' } })
  
        return [ filepath, imported.default ]
      }
    }

    // no config file found
    return [ null, null ]
  }
}