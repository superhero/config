import fs           from 'node:fs/promises'
import path         from 'node:path'
import PathResolver from '@superhero/path-resolver'
import deepassign   from '@superhero/deep/assign'
import deepclone    from '@superhero/deep/clone'
import deepfreeze   from '@superhero/deep/freeze'
import deepmerge    from '@superhero/deep/merge'

export function locate()
{
  return new Config()
}

export default class Config
{
  pathResolver = new PathResolver()

  #config = {}
  #frozen = false

  get isFrozen()
  {
    return this.#frozen
  }

  /**
   * @param {string} configPath
   * @param {any}    [fallback] if no value was found, then the fallback value is returned
   * @returns {any}
   */
  find(configPath, fallback)
  {
    // split by unescaped dots or slashes
    const keys = configPath.split(/(?<!\\)[\.\/]/).map(key => key.replace(/\\([\.\/])/g, '$1'))
    return deepmerge.merge(fallback, keys.reduce((obj, key) => obj && obj[key], this.#config))
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
      const clone = deepclone.clone(config)
      deepassign.assign(this.#config, clone)
    }
  }

  freeze()
  {
    deepfreeze.freeze(this.#config)
    this.#frozen = true
  }

  async add(configpath, branch = false)
  {
    if(this.isFrozen)
    {
      const error = new Error(`The config instance is in a frozen state`)
      error.code  = 'E_CONFIG_FROZEN'
      throw error
    }

    try
    {
      const
        resolveFile       = this.#resolveFile.bind(this, branch),
        resolveDirectory  = this.#resolveDirectory.bind(this, branch),
        config            = await this.pathResolver.resolve(configpath, resolveFile, resolveDirectory)

      if(config)
      {
        this.assign(config)
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
                  ? new Error(`Could not add config "${configpath}" using branch "${branch}"`)
                  : new Error(`Could not add config "${configpath}"`)
      error.code  = 'E_CONFIG_ADD'
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
  
        return imported.default
      }
    }

    if(files.includes(`config${branch}.json`))
    {
      const 
        filepath = path.join(dirpath, `config${branch}.json`),
        imported = await import(filepath, { with: { type: 'json' } })

      return imported.default
    }
  }
}