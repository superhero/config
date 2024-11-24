import fs           from 'node:fs/promises'
import path         from 'node:path'
import PathResolver from '@superhero/path-resolver'

export function locate(locator)
{
  const
    deepassign    = locator.locate('@superhero/deep/assign'),
    deepclone     = locator.locate('@superhero/deep/clone'),
    deepfreeze    = locator.locate('@superhero/deep/freeze'),
    pathResolver  = new PathResolver()

  return new Config(deepassign, deepclone, deepfreeze, pathResolver)
}

export default class Config
{
  #config = {}
  #frozen = false

  get isFrozen()
  {
    return this.#frozen
  }

  #deepassign
  #deepclone
  #deepfreeze
  #pathResolver

  constructor(deepassign, deepclone, deepfreeze, pathResolver)
  {
    this.#deepassign    = deepassign
    this.#deepclone     = deepclone
    this.#deepfreeze    = deepfreeze
    this.#pathResolver  = pathResolver
  }

  find(configPath)
  {
    // split by unescaped dots or slashes
    const keys = configPath.split(/(?<!\\)[\.\/]/).map(key => key.replace(/\\([\.\/])/g, '$1'))
    return keys.reduce((obj, key) => obj && obj[key], this.#config)
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
      const clone = this.#deepclone.clone(config)
      this.#deepassign.assign(this.#config, clone)
    }
  }

  freeze()
  {
    this.#deepfreeze.freeze(this.#config)
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
        config            = await this.#pathResolver.resolve(configpath, resolveFile, resolveDirectory)

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

    for(const file of [`config${branch}.js`, `config${branch}.mjs`, `config${branch}.cjs`])
    {
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