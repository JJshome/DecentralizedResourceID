/**
 * Encoding utilities for the Decentralized Digital Resource Integrated ID System
 * 
 * This module provides various encoding and decoding functions for working with
 * cryptographic data, identifiers, and metadata serialization.
 */

// Node.js buffer utilities
const { Buffer } = require('buffer');

/**
 * Base58 encoding/decoding utilities
 * Commonly used in DIDs and blockchain identifiers for human-readable representation
 */
const base58 = (() => {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const BASE = ALPHABET.length;
  const LEADER = ALPHABET.charAt(0);
  
  // Base58 Encoding function
  function encode(buffer) {
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('Expected Buffer');
    }
    
    if (buffer.length === 0) {
      return '';
    }
    
    // Count leading zeros
    let zeros = 0;
    while (zeros < buffer.length && buffer[zeros] === 0) {
      zeros++;
    }
    
    // Convert to base58
    let value = Array.from(buffer);
    let result = '';
    
    while (value.length > 0) {
      let remainder = 0;
      const length = value.length;
      
      for (let i = 0; i < length; i++) {
        const temp = (remainder * 256) + value[i];
        value[i] = Math.floor(temp / BASE);
        remainder = temp % BASE;
      }
      
      // Remove leading zeros from value array once consumed
      while (value.length > 0 && value[0] === 0) {
        value.shift();
      }
      
      result = ALPHABET.charAt(remainder) + result;
    }
    
    // Add leading 1s for each leading zero byte
    return LEADER.repeat(zeros) + result;
  }
  
  // Base58 Decoding function
  function decode(string) {
    if (typeof string !== 'string') {
      throw new TypeError('Expected string');
    }
    
    if (string.length === 0) {
      return Buffer.alloc(0);
    }
    
    // Count leading '1's (zeros in base58 encoding)
    let zeros = 0;
    while (zeros < string.length && string[zeros] === LEADER) {
      zeros++;
    }
    
    // Allocate enough space in big-endian base256
    const size = Math.floor((string.length - zeros) * (Math.log(BASE) / Math.log(256))) + 1;
    const result = new Uint8Array(size);
    
    // Process the characters after leading 1s
    for (let i = zeros; i < string.length; i++) {
      const character = string[i];
      const alphabetIndex = ALPHABET.indexOf(character);
      
      if (alphabetIndex === -1) {
        throw new Error(`Invalid Base58 character: ${character}`);
      }
      
      let carry = alphabetIndex;
      
      // Apply "b58 to base256" to each input character
      for (let j = 0; j < size; j++) {
        carry += result[j] * BASE;
        result[j] = carry & 0xff;
        carry >>= 8;
      }
    }
    
    // Skip leading zeros in result array
    let k = 0;
    while (k < size && result[k] === 0) {
      k++;
    }
    
    // Create final Buffer with leading zeros from input
    const buffer = Buffer.alloc(zeros + (size - k));
    buffer.fill(0, 0, zeros);
    
    for (let i = zeros; i < buffer.length; i++) {
      buffer[i] = result[k++];
    }
    
    return buffer;
  }
  
  return { encode, decode };
})();

/**
 * Type-Length-Value (TLV) encoding for efficient binary representation
 * Used for compact metadata and identifier serialization
 */
const tlv = (() => {
  // Type constants
  const TYPES = {
    NULL: 0,
    BOOLEAN: 1,
    INT: 2,
    UINT: 3,
    FLOAT: 4,
    STRING: 5,
    BYTES: 6,
    ARRAY: 7,
    MAP: 8,
    TAG: 9,
    DID: 10,
    COMPACT_DID: 11,
    METADATA: 12,
    SIGNATURE: 13
  };
  
  /**
   * Encode data in TLV format
   * 
   * @param {number} type - The type identifier
   * @param {Buffer|Uint8Array|string|number|boolean|Array|Object} value - The value to encode
   * @returns {Buffer} TLV encoded buffer
   */
  function encode(type, value) {
    let valueBuffer;
    
    // Convert value to buffer based on its type
    if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
      valueBuffer = Buffer.from(value);
    } else if (typeof value === 'string') {
      valueBuffer = Buffer.from(value, 'utf8');
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        if (value >= 0) {
          // Encode as unsigned integer
          const intBuffer = Buffer.alloc(8);
          intBuffer.writeBigUInt64BE(BigInt(value), 0);
          // Trim leading zeros
          let i = 0;
          while (i < 7 && intBuffer[i] === 0) i++;
          valueBuffer = intBuffer.slice(i);
        } else {
          // Encode as signed integer
          const intBuffer = Buffer.alloc(8);
          intBuffer.writeBigInt64BE(BigInt(value), 0);
          // Don't trim leading bytes for negative numbers
          valueBuffer = intBuffer;
        }
      } else {
        // Encode as float
        valueBuffer = Buffer.alloc(8);
        valueBuffer.writeDoubleBE(value, 0);
      }
    } else if (typeof value === 'boolean') {
      valueBuffer = Buffer.from([value ? 1 : 0]);
    } else if (Array.isArray(value)) {
      // Recursively encode array elements
      const encodedElements = value.map(element => {
        // Determine element type and encode
        const elementType = determineType(element);
        return encode(elementType, element);
      });
      
      // Concatenate all encoded elements
      valueBuffer = Buffer.concat(encodedElements);
    } else if (value === null || value === undefined) {
      valueBuffer = Buffer.alloc(0);
    } else if (typeof value === 'object') {
      // Encode object as a series of key-value pairs
      const encodedPairs = [];
      
      for (const [key, val] of Object.entries(value)) {
        // Encode key as string
        const keyBuffer = encode(TYPES.STRING, key);
        
        // Determine value type and encode
        const valueType = determineType(val);
        const valBuffer = encode(valueType, val);
        
        encodedPairs.push(Buffer.concat([keyBuffer, valBuffer]));
      }
      
      valueBuffer = Buffer.concat(encodedPairs);
    } else {
      throw new Error(`Unsupported value type: ${typeof value}`);
    }
    
    // Create type and length bytes
    const typeBuffer = Buffer.alloc(1);
    typeBuffer.writeUInt8(type);
    
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(valueBuffer.length);
    
    // Combine type, length, and value
    return Buffer.concat([typeBuffer, lengthBuffer, valueBuffer]);
  }
  
  /**
   * Decode a TLV encoded buffer
   * 
   * @param {Buffer} buffer - TLV encoded buffer
   * @param {number} offset - Starting offset within the buffer
   * @returns {Object} Decoded {type, value, bytesRead}
   */
  function decode(buffer, offset = 0) {
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError('Expected Buffer');
    }
    
    // Check if there's enough data to read type and length
    if (offset + 5 > buffer.length) {
      throw new Error('Buffer too small to contain type and length');
    }
    
    // Read type and length
    const type = buffer.readUInt8(offset);
    const length = buffer.readUInt32BE(offset + 1);
    
    // Check if there's enough data to read the value
    if (offset + 5 + length > buffer.length) {
      throw new Error('Buffer too small to contain value');
    }
    
    // Extract value based on type
    let value;
    const valueOffset = offset + 5;
    
    switch (type) {
      case TYPES.NULL:
        value = null;
        break;
        
      case TYPES.BOOLEAN:
        value = buffer[valueOffset] !== 0;
        break;
        
      case TYPES.INT:
        // Handle variable-length integers
        if (length <= 0) {
          value = 0;
        } else if (length <= 8) {
          // Pad to 8 bytes for consistent reading
          const paddedBuffer = Buffer.alloc(8);
          if ((buffer[valueOffset] & 0x80) !== 0) {
            // Negative number, fill with 0xFF
            paddedBuffer.fill(0xFF, 0, 8 - length);
          }
          buffer.copy(paddedBuffer, 8 - length, valueOffset, valueOffset + length);
          value = Number(paddedBuffer.readBigInt64BE(0));
        } else {
          throw new Error('Integer value too large');
        }
        break;
        
      case TYPES.UINT:
        // Handle variable-length unsigned integers
        if (length <= 0) {
          value = 0;
        } else if (length <= 8) {
          // Pad to 8 bytes for consistent reading
          const paddedBuffer = Buffer.alloc(8);
          buffer.copy(paddedBuffer, 8 - length, valueOffset, valueOffset + length);
          value = Number(paddedBuffer.readBigUInt64BE(0));
        } else {
          throw new Error('Unsigned integer value too large');
        }
        break;
        
      case TYPES.FLOAT:
        if (length === 8) {
          value = buffer.readDoubleBE(valueOffset);
        } else if (length === 4) {
          value = buffer.readFloatBE(valueOffset);
        } else {
          throw new Error(`Invalid float length: ${length}`);
        }
        break;
        
      case TYPES.STRING:
        value = buffer.toString('utf8', valueOffset, valueOffset + length);
        break;
        
      case TYPES.BYTES:
        value = buffer.slice(valueOffset, valueOffset + length);
        break;
        
      case TYPES.ARRAY:
        value = [];
        let arrayOffset = valueOffset;
        const endOffset = valueOffset + length;
        
        while (arrayOffset < endOffset) {
          const { type: elementType, value: elementValue, bytesRead } = decode(buffer, arrayOffset);
          value.push(elementValue);
          arrayOffset += bytesRead;
        }
        break;
        
      case TYPES.MAP:
        value = {};
        let mapOffset = valueOffset;
        const mapEndOffset = valueOffset + length;
        
        while (mapOffset < mapEndOffset) {
          // Read key (must be a string)
          const { value: key, bytesRead: keyBytes } = decode(buffer, mapOffset);
          mapOffset += keyBytes;
          
          // Read value
          const { value: val, bytesRead: valBytes } = decode(buffer, mapOffset);
          mapOffset += valBytes;
          
          // Add to map
          value[key] = val;
        }
        break;
        
      default:
        // For custom types, return the raw buffer slice
        value = buffer.slice(valueOffset, valueOffset + length);
    }
    
    return {
      type,
      value,
      bytesRead: 5 + length
    };
  }
  
  /**
   * Determine the appropriate TLV type for a JavaScript value
   * 
   * @param {any} value - Value to analyze
   * @returns {number} The corresponding TLV type
   */
  function determineType(value) {
    if (value === null || value === undefined) {
      return TYPES.NULL;
    } else if (typeof value === 'boolean') {
      return TYPES.BOOLEAN;
    } else if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return value >= 0 ? TYPES.UINT : TYPES.INT;
      } else {
        return TYPES.FLOAT;
      }
    } else if (typeof value === 'string') {
      return TYPES.STRING;
    } else if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
      return TYPES.BYTES;
    } else if (Array.isArray(value)) {
      return TYPES.ARRAY;
    } else if (typeof value === 'object') {
      return TYPES.MAP;
    } else {
      throw new Error(`Unsupported value type: ${typeof value}`);
    }
  }
  
  return { encode, decode, TYPES };
})();

/**
 * CBOR (Concise Binary Object Representation) encoding
 * Used for efficient, schema-less data exchange
 */
class CBOREncoder {
  // CBOR implementation would go here
  // For brevity, we'll use a placeholder that would be replaced with a full implementation
  static encode(value) {
    // Placeholder for CBOR encoding
    return Buffer.from(JSON.stringify(value));
  }
  
  static decode(buffer) {
    // Placeholder for CBOR decoding
    return JSON.parse(buffer.toString());
  }
}

/**
 * JSON-LD utilities for linked data manipulation
 */
class JSONLDUtil {
  /**
   * Compact a JSON-LD document according to a context
   * 
   * @param {Object} document - The JSON-LD document
   * @param {Object|string} context - The JSON-LD context
   * @returns {Object} The compacted document
   */
  static compact(document, context) {
    // Placeholder implementation
    // Would integrate with a JSON-LD library
    return {
      ...document,
      '@context': context
    };
  }
  
  /**
   * Expand a JSON-LD document
   * 
   * @param {Object} document - The JSON-LD document
   * @returns {Object} The expanded document
   */
  static expand(document) {
    // Placeholder implementation
    return document;
  }
}

module.exports = {
  base58,
  tlv,
  CBOREncoder,
  JSONLDUtil
};
