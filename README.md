
# Config

A configuration manager for Node.js applications, designed to handle dynamic loading, seamless deep assignment of new properties, and to freez the configurations once considered finalized. The module supports configuration files written both using JavaScript and JSON, and supports branch-specific configurations.

## Features

- **Dynamic Configuration Loading**: Load configurations from JSON and JavaScript files.
- **Deep Assignment and Cloning**: Ensure data integrity with deep cloning and assignment when extending the configurations.
- **Immutable Configurations**: Freeze configurations to prevent unintended modifications.
- **Flexible Path Resolution**: Resolve paths dynamically with branch-specific support.
- **Dot and Slash Notation**: Retrieve nested configuration values using query notations.

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

Or resolve using the service locator.

```javascript
import locator from '@superhero/locator';
const config = await locator.lazyload('@superhero/config');
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

### Retrieve Configuration

Use dot or slash notation to access nested values:

```javascript
const port = config.find('server/port'); // Using slash notation
const appName = config.find('app.name'); // Using dot notation
console.log(port, appName);
```

### Updating Configuration

#### Assign New Configuration

```javascript
config.assign({ app: { version: '1.0.0' } });
```

#### Overwrite Existing Values

```javascript
config.assign({ app: { name: 'UpdatedApp' } });
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
try {
  await config.add('./nonexistent/config.json');
} catch (error) {
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

### `find(configPath: string): any`
Retrieves a nested configuration value using dot or slash notation.

- `configPath`: Path to the configuration value.

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
await config.add('./config/directory');
await config.add('./config/directory', 'dev');

// Access configuration
const port = config.find('server/port');
console.log(`Server running on port ${port}`);

// Access unset configuration
console.log(config.find('app/name')); // ⇠ undefined 

// Assign new configuration
config.assign({ app: { name: 'MyApp' } });
console.log(config.find('app/name')); // ⇠ MyApp

// Freeze configurations
config.freeze();
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
  ✔ Can be located (5.073056ms)

  ▶ add()
    ✔ Add a JS config file (4.526138ms)
    ✔ Add a JSON config file (2.21248ms)
    ✔ Add a branch-specific config file (3.396125ms)
    ✔ Throw an error when config file is not found (2.299683ms)
  ✔ add() (13.046408ms)

  ▶ assign()
    ✔ Assign new configuration into existing config (0.245555ms)
    ✔ Overwrite existing keys during assign (2.576057ms)
  ✔ assign() (3.394969ms)

  ▶ freeze()
    ✔ Freeze the configuration (0.771527ms)
    ✔ Throw an error when trying to add after freezing (0.467506ms)
  ✔ freeze() (1.398923ms)

  ▶ find()
    ✔ Find a value in the configuration using slash notation (3.728731ms)
    ✔ Find a value in the configuration using dot notation (2.015125ms)
    ✔ Return undefined for nonexistent keys (2.752519ms)
  ✔ find() (8.807871ms)
✔ @superhero/config (47.186253ms)

tests 12
pass 12

----------------------------------------------------------------
file            | line % | branch % | funcs % | uncovered lines
----------------------------------------------------------------
index.js        |  95.20 |    92.31 |  100.00 | 72-77
index.test.js   | 100.00 |   100.00 |  100.00 | 
----------------------------------------------------------------
all files       |  97.79 |    96.23 |  100.00 | 
----------------------------------------------------------------
```

---

## License
This project is licensed under the MIT License.

---

## Contributing
Feel free to submit issues or pull requests for improvements or additional features.
