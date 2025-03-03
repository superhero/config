
# Config

A configuration manager for Node.js applications, designed to handle dynamic loading, seamless deep assignment of new properties, and to freez the configurations once considered finalized. The module supports configuration files written both using JavaScript and JSON, and supports branch-specific configurations.

## Features

- **Dynamic Configuration Loading**: Load configurations from JSON and JavaScript files.
- **Deep Assignment and Cloning**: Ensure data integrity with deep cloning and assignment when extending the configurations.
- **Immutable Configurations**: Freeze configurations to prevent unintended modifications.
- **Flexible Path Resolution**: Resolve paths dynamically with branch-specific support.
- **Traverse using Slash Notation**: Retrieve nested configuration values using query notations.

## Installation

Install the module using npm:

```bash
npm install @superhero/config
```

## Usage

### Import

```javascript
import Config from '@superhero/config';
const config = new Config();
```

### Load Configuration

#### Add Configuration File

```javascript
await config.add('./config/directory');
```

#### Add Branch-Specific Configuration

```javascript
// Resolves config-dev.json or config-dev.js (.mjs/.cjs)
await config.add('./config/directory', 'dev'); 
```

### Updating Configuration

#### Assign New Configuration

```javascript
config.assign({ app: { version: '1.0.0' } });
```

#### Overwrite Existing Values

```javascript
config.assign({ app: { name: 'Some awesome application name' } });
```

## Retrieve Configuration

Use slash notation to access nested values:

```javascript
const name = config.find('app/name'); // Traverse using slash notation
console.log(name); // Some awesome application name
```

### Retrieve Non Existing Key

Silently fails by returning with an undefined value if the config path is not defined/configured.

```javascript
const foo = config.find('wrong/path/to/some/configuration');
console.log(foo); // undefiend
```

#### Fallback Value

```javascript
// Return fallback if path is undefined
const foo = config.find('wrong/path/to/some/configuration', 'foobar');
console.log(foo); // foobar
```

### Freezing Configuration

Prevent further modifications by freezing the configuration:

```javascript
config.freeze();

// Attempting to assign or add will throw an error
config.assign({ app: { name: 'AnotherApp' } }); // Throws E_CONFIG_FROZEN
```

### Error Handling

The module provides descriptive error codes to simplify debugging:

- **E_CONFIG_FROZEN**: Thrown when attempting to modify a frozen configuration.
- **E_CONFIG_ADD**: Thrown when adding a configuration file fails.

Example:

```javascript
try 
{
  await config.add('./nonexistent/config.json');
} 
catch (error) 
{
  console.error(error.code, error.message);
}
```

## API Reference

### `add(configpath: string, branch?: string): Promise<void>`
Loads configuration from the specified file or directory.

- `configpath`: Path to the configuration file or directory.
- `branch`: (Optional) Branch-specific configuration suffix.

Throws:
- **E_CONFIG_FROZEN**: If the configuration is frozen.
- **E_CONFIG_ADD**: If the configuration cannot be resolved.

---

### `find(configPath: string, fallback?: any): any`
Retrieves a nested configuration value using a slash notation.

- `configPath`: Path to the configuration value.
- `fallback`: Optional fallback value if path is undefined.

Returns:
- The value at the specified path or `undefined` if not found.

---

### `assign(config: object): void`
Deep assigns a new configuration into the existing configuration.

Throws:
- **E_CONFIG_FROZEN**: If the configuration is frozen.

---

### `freeze(): void`
Freezes the configuration, preventing further modifications.

---

### `isFrozen: boolean`
Indicates if the configuration is in a frozen state.

---

## Example

```javascript
import locator from '@superhero/locator';

// Locate the config instance
const config = await locator.lazyload('@superhero/config');

// Load configurations
const { filepath, config: resolved } = await config.resolve('./config/directory')
config.add(filepath, resolved);
const { filepath, config: resolved } = await config.resolve('./config/directory', 'dev')
config.add(filepath, resolved);

// Access configuration
const port = config.find('server/port');
console.log(`Server running on port ${port}`);

// Access undefined configuration
console.log(config.find('foo/bar')); // ⇠ undefined 

// Return fallback if path is undefined
console.log(config.find('foo/bar', 'baz')); // ⇠ baz

// Assign new configuration
config.assign({ foo: { bar: 'baz' } });

// Returns configured value
console.log(config.find('foo/bar')); // ⇠ baz

// Returns configured value with complemented fallback values
console.log(config.find('app', { bar: false, baz: 'qux' })); // ⇠ { bar: 'baz', baz: 'qux' }

// Freeze configurations
config.freeze();

// Assign new configurations throws
config.assign({ app: { name: 'Noop' } }); // ⇠ throws E_CONFIG_FROZEN
```

---

## Running Tests

Run the test suite using:

```bash
node test
```

### Test Coverage

```
▶ @superhero/config
  ▶ Add configurations by file
    ✔ Add a JS config file (6.650687ms)
    ✔ Add a JSON config file (4.996483ms)
    ✔ Add a branch-specific config file (2.732737ms)
    ✔ Throw an error when config file is not found (2.686661ms)
  ✔ Add configurations by file (19.461934ms)

  ▶ Assign configurations
    ✔ Assign new configuration into existing config (0.735019ms)
    ✔ Overwrite existing keys during assign (1.107044ms)
  ✔ Assign configurations (2.161771ms)

  ▶ Make configuration immutable
    ✔ Freeze the configuration (0.858002ms)
    ✔ Throw an error when trying to add after freezing (0.651389ms)
  ✔ Make configuration immutable (1.806803ms)

  ▶ Find configurations
    ✔ Find a value in the configuration using slash notation (12.074335ms)
    ✔ Find absolute directory path by config key-value pair (2.93703ms)
    ✔ Find a value in the configuration using an escaped slash notation (0.710018ms)
    ✔ Return undefined for nonexistent keys (2.707318ms)
    ✔ Return fallback value for nonexistent keys (2.531019ms)
    ✔ Do not use the fallback value if key exists in the config (4.277948ms)
    ✔ Use fallback value to complement configured data structure (3.00954ms)
  ✔ Find configurations (29.650847ms)
✔ @superhero/config (72.570047ms)

tests 15
suites 5
pass 15

----------------------------------------------------------------
file            | line % | branch % | funcs % | uncovered lines
----------------------------------------------------------------
index.js        |  94.74 |    91.18 |  100.00 | 118-123 170-172
index.test.js   | 100.00 |   100.00 |  100.00 | 
----------------------------------------------------------------
all files       |  97.43 |    95.38 |  100.00 | 
----------------------------------------------------------------
```

---

## License
This project is licensed under the MIT License.

---

## Contributing
Feel free to submit issues or pull requests for improvements or additional features.
