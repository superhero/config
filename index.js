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
   * Finds the last added configuration matching the provided configPath and value and 
   * returns the absolute directory path where the configuration file that contains the
   * value was found.
   * 
   * @param {string} configPath
   * @param {any} configValue
   * 
   * @returns {string|undefined} The absolute directory path where the configuration 
   * file was last found, or undefined if not found.
   */
  findAbsoluteDirPathByConfigEntry(configPath, configValue)
  {
    const partialEquals = (value) => 'object' === typeof configValue
                                  && 'object' === typeof value
                                    ? Array.isArray(configValue) && Array.isArray(value) 
                                      ? configValue.every((configuredValue) => value.includes(configuredValue))
                                      : Object.keys(configValue).every((key) => configValue[key] === value[key])
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
        absoluteDirPath = path.dirname(filepath)
      }
    }
  
    return absoluteDirPath
  }

  add(filepath, config)
  {
    this.assign(config)
    this.#layers.set(filepath, config)
  }

  assign(config)
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

    const files = await fs.readdir(dirpath)

    for(const suffix of ['js', 'mjs', 'cjs'])
    {
      const file = `config${branch}.${suffix}`

      if(files.includes(file))
      {
        const 
          filepath = path.join(dirpath, file),
          imported = await import(filepath)
  
        return [ filepath, imported.default ]
      }
    }

    if(files.includes(`config${branch}.json`))
    {
      const 
        filepath = path.join(dirpath, `config${branch}.json`),
        imported = await import(filepath, { with: { type: 'json' } })

      return [ filepath, imported.default ]
    }

    // no config file found
    return [ null, null ]
  }
}