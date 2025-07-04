import assert   from 'node:assert'
import fs       from 'node:fs/promises'
import path     from 'node:path'
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
    await fs.writeFile(configFile,      'export default { server: { port: 3000 }, foo: [ "bar", "baz" ] }')
    await fs.writeFile(configFileDev,   JSON.stringify({ app: { environment: 'development' } }))
    await fs.writeFile(configFileJson,  JSON.stringify({ app: { name: 'TestApp' } }))
  })

  after(async () => 
  {
    await fs.rm(testDir, { recursive: true, force: true })
  })

  let config

  beforeEach(() => config  = new Config())

  suite('Add configurations by file', () =>
  {
    test('Add a JS config file', async () =>
    {
      const { filepath, config: resolved } = await config.resolve(configFile)
      config.add(filepath, resolved)
      const result = config.find('server/port')
      assert.strictEqual(result, 3000, 'Should correctly add and resolve JS config')
    })

    test('Add a JSON config file', async () =>
    {
      const { filepath, config: resolved } = await config.resolve(configFileJson)
      config.add(filepath, resolved)
      const result = config.find('app/name')
      assert.strictEqual(result, 'TestApp', 'Should correctly add and resolve JSON config')
    })

    test('Add a branch-specific config file', async () =>
    {
      const { filepath, config: resolved } = await config.resolve(configDir, 'dev')
      config.add(filepath, resolved)
      const result = config.find('app/environment')
      assert.strictEqual(result, 'development', 'Should correctly add branch-specific config')
    })

    test('Throw an error when config file is not found', async () =>
    {
      const invalidPath = `${configDir}/nonexistent.js`
      await assert.rejects(
        () => config.resolve(invalidPath),
        (error) => error.code === 'E_CONFIG_RESOLVE' && error.cause.code === 'E_RESOLVE_PATH',
        'Should throw E_CONFIG_RESOLVE with cause E_RESOLVE_PATH')
    })
  })

  suite('Assign configurations', () =>
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

  suite('Make configuration immutable', () =>
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
      assert.throws(
        () => config.assign({ foo: 'bar' }),
        (error) => error.code === 'E_CONFIG_FROZEN',
        'Should throw E_CONFIG_FROZEN when trying to add config after freezing'
      )
    })
  })

  suite('Find configurations', () =>
  {
    test('Find a value in the configuration using slash notation', async () =>
    {
      const { filepath, config: resolved } = await config.resolve(configFileJson)
      config.add(filepath, resolved)
      const result = config.find('app/name')
      assert.strictEqual(result, 'TestApp', 'Should find value using slash notation')
    })

    test('Find absolute directory path by config key-value pair', async () =>
    {
      const absolutePath = path.resolve(configFile)

      const { filepath, config: resolved } = await config.resolve(configFile)
      config.add(filepath, resolved)
      const resultByValue = config.findAbsolutePathByConfigEntry('server/port', 3000)
      assert.equal(resultByValue, absolutePath, 'Should find expected directory path')

      const resultByArray1 = config.findAbsolutePathByConfigEntry('foo', [ 'bar' ])
      assert.equal(resultByArray1, absolutePath, 'Should find expected directory path')

      const resultByArray2 = config.findAbsolutePathByConfigEntry('foo', [ 'bar', 'baz' ])
      assert.equal(resultByArray2, absolutePath, 'Should find expected directory path')

      const resultByArray3 = config.findAbsolutePathByConfigEntry('foo', [ 'bar', 'baz', 'qux' ])
      assert.equal(resultByArray3, undefined, 'Should not find a directory path')
    })

    test('Find a value in the configuration using an escaped slash notation', () =>
    {
      config.assign({ foo: { 'bar/baz': 'qux' }})
      const result = config.find('foo/bar\\/baz')
      assert.strictEqual(result, 'qux', 'Should find value using an escaped slash notation')
    })

    test('Return undefined for nonexistent keys', async () =>
    {
      const { filepath, config: resolved } = await config.resolve(configFileJson)
      config.add(filepath, resolved)
      const result = config.find('app/nonexistent/path/and/avalue')
      assert.strictEqual(result, undefined, 'Should return undefined for nonexistent keys')
    })

    test('Return fallback value for nonexistent keys', async () =>
    {
      const { filepath, config: resolved } = await config.resolve(configFileJson)
      config.add(filepath, resolved)
      const result = config.find('app/nonexistent/path/and/avalue', 'fallback')
      assert.strictEqual(result, 'fallback', 'Should return "fallback" for nonexistent keys')
    })

    test('Do not use the fallback value if key exists in the config', async () =>
    {
      const { filepath, config: resolved } = await config.resolve(configFileJson)
      config.add(filepath, resolved)
      const result = config.find('app/name', 'fallback')
      assert.notStrictEqual(result, 'fallback', 'Should not have returned the fallback value')
      assert.strictEqual(result, 'TestApp', 'Should return configured value')
    })

    test('Use fallback value to complement configured data structure', async () =>
    {
      const { filepath, config: resolved } = await config.resolve(configFileJson)
      config.add(filepath, resolved)
      const result = config.find('app', { name: false, foo: 'bar' })
      assert.ok(result.name, 'Should have returned original value')
      assert.ok(result.foo, 'Should have complemented with new fallback attribute')
    })

    test('List prioritised absolute directory path and value pairs by config path', async () =>
    {
      const { filepath: filepath1, config: resolved1 } = await config.resolve(configFile)
      const { filepath: filepath2, config: resolved2 } = await config.resolve(configFileJson)

      config.add(filepath1, resolved1)
      config.add(filepath2, resolved2)

      assert.deepStrictEqual(config.findAbsolutePathAndValueByConfigPath('server/port'),
        [[ filepath1, 3000 ]],
        'Should return entries with absolute dir and value for the given config path')

      config.add('/foobar', resolved2)

      assert.deepStrictEqual(config.findAbsolutePathAndValueByConfigPath('app/name'),
        [
          [ '/foobar',  'TestApp' ],
          [ filepath2,  'TestApp' ]
        ],
        'Should return multiple entries with dir and value for the given config path')
    })
  })
})
