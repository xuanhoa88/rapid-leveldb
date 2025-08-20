'use strict';

const { AbstractLevel, AbstractSnapshot } = require('./abstract-level');
const ModuleError = require('module-error');
const fsp = require('fs/promises');
const path = require('path');
const binding = require('./binding');
const { ChainedBatch } = require('./chained-batch');
const { Iterator } = require('./iterator');

// Symbols for internal context and location
const kContext = Symbol('context');
const kLocation = Symbol('location');
const kOptions = Symbol('options');

// Encoding enumeration - cached for performance
const ENCODING_ENUM = Object.freeze({
  buffer: 0,
  utf8: 1,
  view: 2,
});

/**
 * Fast encoding enum lookup
 * @param {string} encoding - The encoding type
 * @returns {number} The encoding enum value
 */
const encodingEnum = encoding => {
  const value = ENCODING_ENUM[encoding];
  if (value === undefined) {
    throw new TypeError(
      `Invalid encoding: ${encoding}. Must be one of: ${Object.keys(ENCODING_ENUM).join(', ')}`
    );
  }
  return value;
};

/**
 * Validates a location string
 * @param {string} location - The database location
 * @throws {TypeError} If location is invalid
 */
const validateLocation = location => {
  if (typeof location !== 'string' || location === '') {
    throw new TypeError("The argument 'location' must be a non-empty string");
  }

  // Additional validation for path safety
  const normalized = path.normalize(location);
  if (normalized !== location) {
    console.warn(`Location path normalized from '${location}' to '${normalized}'`);
  }
};

/**
 * Validates that required arguments are provided
 * @param {Array} args - Arguments to validate
 * @param {Array} names - Names of the arguments
 * @param {number} required - Number of required arguments
 */
const validateRequiredArgs = (args, names, required) => {
  if (args.length < required) {
    const requiredNames = names.slice(0, required).map(name => `'${name}'`);
    throw new TypeError(
      `The argument${required > 1 ? 's' : ''} ${requiredNames.join(' and ')} ${required > 1 ? 'are' : 'is'} required`
    );
  }
};

/**
 * Enhanced LevelDB class that extends AbstractLevel
 * Provides a high-performance interface to LevelDB with improved error handling,
 * validation, and modern JavaScript features.
 */
class LevelDB extends AbstractLevel {
  /**
   * Creates a new LevelDB instance
   * @param {string} location - Database location path
   * @param {Object} [options={}] - Configuration options
   */
  constructor(location, options = {}) {
    validateLocation(location);

    // Validate options object
    if (options !== null && typeof options !== 'object') {
      throw new TypeError("The 'options' argument must be an object or null");
    }

    const defaultOptions = {
      encodings: {
        buffer: true,
        utf8: true,
        view: true,
      },
      createIfMissing: true,
      errorIfExists: false, // Changed default to be more user-friendly
      explicitSnapshots: true,
      additionalMethods: {
        approximateSize: true,
        compactRange: true,
      },
      signals: {
        iterators: true,
      },
    };

    super(defaultOptions, options);

    this[kLocation] = path.resolve(location); // Use absolute path
    this[kOptions] = { ...defaultOptions, ...options };

    try {
      this[kContext] = binding.db_init();
    } catch (error) {
      throw new ModuleError(`Failed to initialize database context: ${error.message}`, {
        code: 'LEVEL_DATABASE_INIT_FAILED',
        cause: error,
      });
    }
  }

  /**
   * Gets the absolute path of the database location
   * @returns {string} The database location
   */
  get location() {
    return this[kLocation];
  }

  /**
   * Gets the database options
   * @returns {Object} The database options
   */
  get options() {
    return { ...this[kOptions] };
  }

  /**
   * Opens the database
   * @param {Object} options - Open options
   * @returns {Promise<void>}
   * @private
   */
  async _open(options) {
    try {
      if (options.createIfMissing) {
        await fsp.mkdir(this[kLocation], { recursive: true });
      }

      return await binding.db_open(this[kContext], this[kLocation], options);
    } catch (error) {
      throw new ModuleError(`Failed to open database at '${this[kLocation]}': ${error.message}`, {
        code: 'LEVEL_DATABASE_OPEN_FAILED',
        cause: error,
      });
    }
  }

  /**
   * Closes the database
   * @returns {Promise<void>}
   * @private
   */
  async _close() {
    try {
      return await binding.db_close(this[kContext]);
    } catch (error) {
      throw new ModuleError(`Failed to close database: ${error.message}`, {
        code: 'LEVEL_DATABASE_CLOSE_FAILED',
        cause: error,
      });
    }
  }

  /**
   * Puts a key-value pair
   * @param {*} key - The key
   * @param {*} value - The value
   * @param {Object} options - Put options
   * @returns {Promise<void>}
   * @private
   */
  async _put(key, value, options) {
    try {
      return await binding.db_put(this[kContext], key, value, options);
    } catch (error) {
      throw new ModuleError(`Failed to put key-value pair: ${error.message}`, {
        code: 'LEVEL_DATABASE_PUT_FAILED',
        cause: error,
      });
    }
  }

  /**
   * Gets a value by key
   * @param {*} key - The key
   * @param {Object} options - Get options
   * @returns {Promise<*>} The value
   * @private
   */
  async _get(key, options) {
    try {
      return await binding.db_get(
        this[kContext],
        key,
        encodingEnum(options.valueEncoding),
        options.fillCache,
        options.snapshot?.[kContext]
      );
    } catch (error) {
      throw new ModuleError(`Failed to get value for key: ${error.message}`, {
        code: 'LEVEL_DATABASE_GET_FAILED',
        cause: error,
      });
    }
  }

  /**
   * Gets multiple values by keys
   * @param {Array} keys - Array of keys
   * @param {Object} options - Get options
   * @returns {Promise<Array>} Array of values
   * @private
   */
  async _getMany(keys, options) {
    if (!Array.isArray(keys)) {
      throw new TypeError("The 'keys' argument must be an array");
    }

    try {
      return await binding.db_get_many(this[kContext], keys, options, options.snapshot?.[kContext]);
    } catch (error) {
      throw new ModuleError(`Failed to get multiple values: ${error.message}`, {
        code: 'LEVEL_DATABASE_GET_MANY_FAILED',
        cause: error,
      });
    }
  }

  /**
   * Deletes a key-value pair
   * @param {*} key - The key to delete
   * @param {Object} options - Delete options
   * @returns {Promise<void>}
   * @private
   */
  async _del(key, options) {
    try {
      return await binding.db_del(this[kContext], key, options);
    } catch (error) {
      throw new ModuleError(`Failed to delete key: ${error.message}`, {
        code: 'LEVEL_DATABASE_DELETE_FAILED',
        cause: error,
      });
    }
  }

  /**
   * Clears a range of key-value pairs
   * @param {Object} options - Clear options
   * @returns {Promise<void>}
   * @private
   */
  async _clear(options) {
    try {
      return await binding.db_clear(this[kContext], options, options.snapshot?.[kContext]);
    } catch (error) {
      throw new ModuleError(`Failed to clear database range: ${error.message}`, {
        code: 'LEVEL_DATABASE_CLEAR_FAILED',
        cause: error,
      });
    }
  }

  /**
   * Creates a chained batch operation
   * @returns {ChainedBatch} A new chained batch instance
   * @private
   */
  _chainedBatch() {
    return new ChainedBatch(this, this[kContext]);
  }

  /**
   * Executes a batch operation
   * @param {Array} operations - Array of operations
   * @param {Object} options - Batch options
   * @returns {Promise<void>}
   * @private
   */
  async _batch(operations, options) {
    if (!Array.isArray(operations)) {
      throw new TypeError("The 'operations' argument must be an array");
    }

    try {
      return await binding.batch_do(this[kContext], operations, options);
    } catch (error) {
      throw new ModuleError(`Failed to execute batch operation: ${error.message}`, {
        code: 'LEVEL_DATABASE_BATCH_FAILED',
        cause: error,
      });
    }
  }

  /**
   * Gets the approximate size of a key range
   * @param {*} start - Start key
   * @param {*} end - End key
   * @param {Object} [options] - Options object
   * @returns {Promise<number>} Approximate size in bytes
   */
  async approximateSize(start, end, options = {}) {
    validateRequiredArgs(arguments, ['start', 'end'], 2);

    if (options !== null && typeof options !== 'object') {
      throw new TypeError("The 'options' argument must be an object or null");
    }

    if (this.status === 'opening') {
      return this.deferAsync(() => this.approximateSize(start, end, options));
    }

    if (this.status !== 'open') {
      throw new ModuleError('Database is not open: cannot call approximateSize()', {
        code: 'LEVEL_DATABASE_NOT_OPEN',
      });
    }

    try {
      const keyEncoding = this.keyEncoding(options.keyEncoding);
      const encodedStart = keyEncoding.encode(start);
      const encodedEnd = keyEncoding.encode(end);

      return await binding.db_approximate_size(this[kContext], encodedStart, encodedEnd);
    } catch (error) {
      throw new ModuleError(`Failed to get approximate size: ${error.message}`, {
        code: 'LEVEL_DATABASE_APPROXIMATE_SIZE_FAILED',
        cause: error,
      });
    }
  }

  /**
   * Compacts a key range to optimize storage
   * @param {*} start - Start key
   * @param {*} end - End key
   * @param {Object} [options] - Options object
   * @returns {Promise<void>}
   */
  async compactRange(start, end, options = {}) {
    validateRequiredArgs(arguments, ['start', 'end'], 2);

    if (options !== null && typeof options !== 'object') {
      throw new TypeError("The 'options' argument must be an object or null");
    }

    if (this.status === 'opening') {
      return this.deferAsync(() => this.compactRange(start, end, options));
    }

    if (this.status !== 'open') {
      throw new ModuleError('Database is not open: cannot call compactRange()', {
        code: 'LEVEL_DATABASE_NOT_OPEN',
      });
    }

    try {
      const keyEncoding = this.keyEncoding(options.keyEncoding);
      const encodedStart = keyEncoding.encode(start);
      const encodedEnd = keyEncoding.encode(end);

      return await binding.db_compact_range(this[kContext], encodedStart, encodedEnd);
    } catch (error) {
      throw new ModuleError(`Failed to compact range: ${error.message}`, {
        code: 'LEVEL_DATABASE_COMPACT_FAILED',
        cause: error,
      });
    }
  }

  /**
   * Gets a database property value
   * @param {string} property - Property name
   * @returns {string|null} Property value or null if not found
   */
  getProperty(property) {
    if (typeof property !== 'string' || property === '') {
      throw new TypeError("The 'property' argument must be a non-empty string");
    }

    // Is synchronous, so can't be deferred
    if (this.status !== 'open') {
      throw new ModuleError('Database is not open: cannot call getProperty()', {
        code: 'LEVEL_DATABASE_NOT_OPEN',
      });
    }

    try {
      return binding.db_get_property(this[kContext], property);
    } catch (error) {
      throw new ModuleError(`Failed to get property '${property}': ${error.message}`, {
        code: 'LEVEL_DATABASE_GET_PROPERTY_FAILED',
        cause: error,
      });
    }
  }

  /**
   * Creates an iterator
   * @param {Object} options - Iterator options
   * @returns {Iterator} A new iterator instance
   * @private
   */
  _iterator(options) {
    return new Iterator(this, this[kContext], options, options.snapshot?.[kContext]);
  }

  /**
   * Creates a snapshot
   * @param {Object} options - Snapshot options
   * @returns {Snapshot} A new snapshot instance
   * @private
   */
  _snapshot(options) {
    return new Snapshot(this[kContext], options);
  }

  /**
   * Destroys a database completely
   * @param {string} location - Database location
   * @returns {Promise<void>}
   * @static
   */
  static async destroy(location) {
    validateLocation(location);

    try {
      return await binding.destroy_db(path.resolve(location));
    } catch (error) {
      throw new ModuleError(`Failed to destroy database at '${location}': ${error.message}`, {
        code: 'LEVEL_DATABASE_DESTROY_FAILED',
        cause: error,
      });
    }
  }

  /**
   * Repairs a corrupted database
   * @param {string} location - Database location
   * @returns {Promise<void>}
   * @static
   */
  static async repair(location) {
    validateLocation(location);

    try {
      return await binding.repair_db(path.resolve(location));
    } catch (error) {
      throw new ModuleError(`Failed to repair database at '${location}': ${error.message}`, {
        code: 'LEVEL_DATABASE_REPAIR_FAILED',
        cause: error,
      });
    }
  }
}

/**
 * Snapshot class for point-in-time database views
 */
class Snapshot extends AbstractSnapshot {
  /**
   * Creates a new snapshot
   * @param {*} context - Database context
   * @param {Object} [options={}] - Snapshot options
   */
  constructor(context, options = {}) {
    if (options !== null && typeof options !== 'object') {
      throw new TypeError("The 'options' argument must be an object or null");
    }

    super(options);

    try {
      this[kContext] = binding.snapshot_init(context);
    } catch (error) {
      throw new ModuleError(`Failed to create snapshot: ${error.message}`, {
        code: 'LEVEL_SNAPSHOT_INIT_FAILED',
        cause: error,
      });
    }
  }

  /**
   * Closes the snapshot
   * @returns {Promise<void>}
   * @private
   */
  async _close() {
    try {
      // This is synchronous because that's faster than creating async work
      binding.snapshot_close(this[kContext]);
    } catch (error) {
      throw new ModuleError(`Failed to close snapshot: ${error.message}`, {
        code: 'LEVEL_SNAPSHOT_CLOSE_FAILED',
        cause: error,
      });
    }
  }
}

// Singleton instance storage
const instances = new Map();

/**
 * Gets or creates a singleton instance of LevelDB for a given location
 * @param {string} location - Database location
 * @param {...*} args - Additional constructor arguments
 * @returns {LevelDB} Singleton instance of LevelDB
 */
function getInstance(location, ...args) {
  const normalizedLocation = path.resolve(location);

  if (!instances.has(normalizedLocation)) {
    instances.set(normalizedLocation, new LevelDB(normalizedLocation, ...args));
  }

  return instances.get(normalizedLocation);
}

/**
 * Removes a singleton instance from cache
 * @param {string} location - Database location
 * @returns {boolean} True if instance was removed
 */
function removeInstance(location) {
  validateLocation(location);
  return instances.delete(path.resolve(location));
}

/**
 * Clears all singleton instances
 */
function clearInstances() {
  instances.clear();
}

/**
 * Gets the number of active singleton instances
 * @returns {number} Number of instances
 */
function getInstanceCount() {
  return instances.size;
}

module.exports = {
  LevelDB,
  getInstance,
  removeInstance,
  clearInstances,
  getInstanceCount,
};
