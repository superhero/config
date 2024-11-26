import assert   from 'node:assert'
import path     from 'node:path'
import fs       from 'node:fs/promises'
import Locator  from '@superhero/locator'
import Config   from '@superhero/config'
import { suite, test, before, after, beforeEach } from 'node:test'

suite('@superhero/config', () => 
{
  const
    testDir         = './test',
    configDir       = `${testDir}/config`,
    configFile      = `${configDir}/config.js`,
    configFileDev   = `${configDir}/config-dev.json`,
    configFileJson  = `${configDir}/json/config.json`

  before(async () =>
  {
    // Create test directories
    await fs.mkdir(configDir,           { recursive: true })
    await fs.mkdir(`${configDir}/json`, { recursive: true })

    // Create mock config files
    await fs.writeFile(configFile,      'export default { server: { port: 3000 } }')
    await fs.writeFile(configFileDev,   JSON.stringify({ app: { environment: 'development' } }))
    await fs.writeFile(configFileJson,  JSON.stringify({ app: { name: 'TestApp' } }))
  })

  after(async () => 
  {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  let config, locator

  beforeEach(() =>
  {
    locator = new Locator()
    config  = new Config()
  })

  test('Can be located', async () =>
  {
    await locator.eagerload({'@superhero/config': path.resolve('./index.js')})
    assert.ok(locator.locate('@superhero/config'), 'Should be able to locate the config service')
  })

  suite('add()', () =>
  {
    test('Add a JS config file', async () =>
    {
      await config.add(configFile)
      const result = config.find('server/port')
      assert.strictEqual(result, 3000, 'Should correctly add and resolve JS config')
    })

    test('Add a JSON config file', async () =>
    {
      await config.add(configFileJson)
      const result = config.find('app/name')
      assert.strictEqual(result, 'TestApp', 'Should correctly add and resolve JSON config')
    })

    test('Add a branch-specific config file', async () =>
    {
      await config.add(configDir, 'dev')
      const result = config.find('app/environment')
      assert.strictEqual(result, 'development', 'Should correctly add branch-specific config')
    })

    test('Throw an error when config file is not found', async () =>
    {
      const invalidPath = `${configDir}/nonexistent.js`
      await assert.rejects(
        () => config.add(invalidPath),
        (error) => error.code === 'E_CONFIG_ADD' && error.cause.code === 'E_RESOLVE_PATH',
        'Should throw E_CONFIG_ADD with cause E_RESOLVE_PATH')
    })
  })

  suite('assign()', () =>
  {
    test('Assign new configuration into existing config', () =>
    {
      config.assign({ app: { version: '1.0.0' } })
      const result = config.find('app/version')
      assert.strictEqual(result, '1.0.0', 'Should correctly merge new configuration')
    })

    test('Overwrite existing keys during assign', () =>
    {
      config.assign({ app: { name: 'UpdatedApp' } })
      const result = config.find('app/name')
      assert.strictEqual(result, 'UpdatedApp', 'Should overwrite existing keys during merge')
    })
  })

  suite('freeze()', () =>
  {
    test('Freeze the configuration', () =>
    {
      config.assign({ app: { name: 'TestApp' } })
      config.freeze()

      assert.throws(
        () => config.assign({ app: { name: 'UpdatedApp' } }),
        (error) => error.code === 'E_CONFIG_FROZEN',
        'Should throw when trying to modify frozen config'
      )
    })

    test('Throw an error when trying to add after freezing', async () =>
    {
      config.freeze()
      await assert.rejects(
        () => config.add(configFile),
        (error) => error.code === 'E_CONFIG_FROZEN',
        'Should throw E_CONFIG_FROZEN when trying to add config after freezing'
      )
    })
  })

  suite('find()', () =>
  {
    test('Find a value in the configuration using slash notation', async () =>
    {
      await config.add(configFileJson)
      const result = config.find('app/name')
      assert.strictEqual(result, 'TestApp', 'Should find value using slash notation')
    })

    test('Find a value in the configuration using dot notation', async () =>
    {
      await config.add(configFileJson)
      const result = config.find('app.name')
      assert.strictEqual(result, 'TestApp', 'Should find value using dot notation')
    })

    test('Return undefined for nonexistent keys', async () =>
    {
      await config.add(configFileJson)
      const result = config.find('app/nonexistent/path/and/avalue')
      assert.strictEqual(result, undefined, 'Should return undefined for nonexistent keys')
    })
  })
})
