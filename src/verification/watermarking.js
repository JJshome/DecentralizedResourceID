/**
 * Multi-layer Watermarking Engine for Digital Resources
 * 
 * This module implements resource-specific watermarking techniques to embed
 * and verify identifiers and metadata in various types of digital resources.
 * 
 * Supported resource types:
 * - Text (Unicode space manipulation, punctuation variations)
 * - Images (LSB, DCT, DWT watermarking)
 * - Audio (Spectral watermarking)
 * - AI Models (Combined whitebox/blackbox approaches)
 */

const crypto = require('crypto');
const { tlv } = require('../core/encoding');

/**
 * Abstract base class for resource-specific watermarking
 */
class WatermarkStrategy {
  /**
   * Embed watermark in a resource
   * 
   * @param {Buffer|string|Object} resource - The resource to watermark
   * @param {Object} payload - Data to embed as watermark
   * @param {Object} options - Strategy-specific options
   * @returns {Buffer|string|Object} Watermarked resource
   */
  embed(resource, payload, options) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Extract watermark from a resource
   * 
   * @param {Buffer|string|Object} resource - The watermarked resource
   * @param {Object} options - Strategy-specific options
   * @returns {Object|null} Extracted payload or null if not found
   */
  extract(resource, options) {
    throw new Error('Method not implemented');
  }
  
  /**
   * Verify if a resource contains a valid watermark
   * 
   * @param {Buffer|string|Object} resource - The resource to verify
   * @param {Object} expectedPayload - Expected payload data (optional)
   * @param {Object} options - Strategy-specific options
   * @returns {boolean} True if valid watermark is present
   */
  verify(resource, expectedPayload, options) {
    const extractedPayload = this.extract(resource, options);
    
    if (!extractedPayload) {
      return false;
    }
    
    if (!expectedPayload) {
      // Just check if any valid watermark is present
      return true;
    }
    
    // Check if the extracted payload matches the expected payload
    return this._comparePayloads(extractedPayload, expectedPayload);
  }
  
  /**
   * Compare extracted payload with expected payload
   * 
   * @param {Object} extracted - Extracted payload
   * @param {Object} expected - Expected payload
   * @returns {boolean} True if payloads match
   * @protected
   */
  _comparePayloads(extracted, expected) {
    // Implement basic comparison, subclasses can override for more specific logic
    if (typeof expected === 'object' && typeof extracted === 'object') {
      // Check essential fields
      if (expected.did && extracted.did !== expected.did) {
        return false;
      }
      
      if (expected.metadataHash && extracted.metadataHash !== expected.metadataHash) {
        return false;
      }
      
      return true;
    }
    
    return extracted === expected;
  }
  
  /**
   * Create a watermark payload from a DID and metadata
   * 
   * @param {string} did - DID URI
   * @param {Object} metadata - Metadata object or null
   * @param {Object} options - Additional options
   * @returns {Object} Watermark payload
   * @protected
   */
  _createPayload(did, metadata, options = {}) {
    const payload = {
      did,
      timestamp: new Date().toISOString()
    };
    
    if (metadata) {
      // Calculate metadata hash for compact representation
      const metadataString = typeof metadata === 'string' ? 
        metadata : JSON.stringify(metadata);
      
      payload.metadataHash = crypto
        .createHash('sha256')
        .update(metadataString)
        .digest('hex');
    }
    
    if (options.issuer) {
      payload.issuer = options.issuer;
    }
    
    if (options.expirationDate) {
      payload.expirationDate = options.expirationDate;
    }
    
    return payload;
  }
}

/**
 * Text watermarking strategy
 * Implements unicode space manipulation, punctuation variations, and synonym substitution
 */
class TextWatermarkStrategy extends WatermarkStrategy {
  /**
   * Embed watermark in text content
   * 
   * @param {string} text - Text content to watermark
   * @param {Object} payload - Data to embed
   * @param {Object} options - Watermarking options
   * @returns {string} Watermarked text
   */
  embed(text, payload, options = {}) {
    const strategy = options.strategy || 'spaces';
    
    // Convert payload to binary representation
    const payloadStr = JSON.stringify(payload);
    const payloadBinary = this._textToBinary(payloadStr);
    
    switch (strategy) {
      case 'spaces':
        return this._embedWithSpaces(text, payloadBinary, options);
      case 'punctuation':
        return this._embedWithPunctuation(text, payloadBinary, options);
      case 'synonyms':
        return this._embedWithSynonyms(text, payloadBinary, options);
      case 'combined':
        // Use multiple strategies for robustness
        let watermarked = this._embedWithSpaces(text, payloadBinary.slice(0, Math.floor(payloadBinary.length / 2)), options);
        return this._embedWithPunctuation(watermarked, payloadBinary.slice(Math.floor(payloadBinary.length / 2)), options);
      default:
        throw new Error(`Unsupported text watermarking strategy: ${strategy}`);
    }
  }
  
  /**
   * Extract watermark from text content
   * 
   * @param {string} text - Watermarked text
   * @param {Object} options - Extraction options
   * @returns {Object|null} Extracted payload or null if not found
   */
  extract(text, options = {}) {
    const strategy = options.strategy || 'spaces';
    
    let binaryPayload;
    
    switch (strategy) {
      case 'spaces':
        binaryPayload = this._extractFromSpaces(text, options);
        break;
      case 'punctuation':
        binaryPayload = this._extractFromPunctuation(text, options);
        break;
      case 'synonyms':
        binaryPayload = this._extractFromSynonyms(text, options);
        break;
      case 'combined':
        // Try multiple strategies and combine results
        const spacesPayload = this._extractFromSpaces(text, options);
        const punctuationPayload = this._extractFromPunctuation(text, options);
        
        if (spacesPayload && punctuationPayload) {
          binaryPayload = spacesPayload + punctuationPayload;
        } else if (spacesPayload) {
          binaryPayload = spacesPayload;
        } else {
          binaryPayload = punctuationPayload;
        }
        break;
      default:
        throw new Error(`Unsupported text watermarking strategy: ${strategy}`);
    }
    
    if (!binaryPayload) {
      return null;
    }
    
    try {
      // Convert binary back to JSON
      const payloadStr = this._binaryToText(binaryPayload);
      return JSON.parse(payloadStr);
    } catch (error) {
      // Failed to parse payload
      return null;
    }
  }
  
  /**
   * Embed watermark using Unicode space variations
   * 
   * @param {string} text - Text to watermark
   * @param {string} payloadBinary - Binary payload (0s and 1s)
   * @param {Object} options - Options
   * @returns {string} Watermarked text
   * @private
   */
  _embedWithSpaces(text, payloadBinary, options) {
    // Unicode space characters:
    // - Regular space (U+0020)
    // - No-break space (U+00A0)
    // - Zero-width space (U+200B)
    
    const regularSpace = ' ';
    const noBreakSpace = '\u00A0';
    const zeroWidthSpace = '\u200B';
    
    // Find spaces where we can embed information
    const spacesIndices = [];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === ' ') {
        spacesIndices.push(i);
      }
    }
    
    // Check if we have enough spaces to embed the payload
    if (spacesIndices.length < payloadBinary.length) {
      throw new Error('Text has insufficient spaces to embed the payload');
    }
    
    // Embed the payload
    let result = text;
    for (let i = 0; i < payloadBinary.length; i++) {
      const spaceIndex = spacesIndices[i];
      let replacement;
      
      if (payloadBinary[i] === '0') {
        replacement = regularSpace;
      } else {
        // Use different space character for '1'
        replacement = options.useZeroWidth ? zeroWidthSpace + regularSpace : noBreakSpace;
      }
      
      // Replace the space at the calculated index
      result = result.substring(0, spaceIndex) + replacement + result.substring(spaceIndex + 1);
      
      // Adjust indices for any length changes
      const lengthDiff = replacement.length - 1;  // Difference from original space
      if (lengthDiff !== 0) {
        for (let j = i + 1; j < spacesIndices.length; j++) {
          spacesIndices[j] += lengthDiff;
        }
      }
    }
    
    return result;
  }
  
  /**
   * Extract watermark from spaces
   * 
   * @param {string} text - Watermarked text
   * @param {Object} options - Options
   * @returns {string|null} Binary payload or null if not found
   * @private
   */
  _extractFromSpaces(text, options) {
    const regularSpace = ' ';
    const noBreakSpace = '\u00A0';
    const zeroWidthSpace = '\u200B';
    
    let binaryPayload = '';
    
    for (let i = 0; i < text.length; i++) {
      if (text[i] === regularSpace) {
        // Check if it's a regular space
        if (i > 0 && text[i-1] === zeroWidthSpace) {
          // Zero-width space followed by regular space
          binaryPayload += '1';
        } else {
          binaryPayload += '0';
        }
      } else if (text[i] === noBreakSpace) {
        // No-break space
        binaryPayload += '1';
      }
    }
    
    // Basic validation: check if we extracted enough bits for a valid payload
    if (binaryPayload.length < 16) {  // Arbitrary minimum size
      return null;
    }
    
    return binaryPayload;
  }
  
  /**
   * Embed watermark using punctuation variations
   * 
   * @param {string} text - Text to watermark
   * @param {string} payloadBinary - Binary payload (0s and 1s)
   * @param {Object} options - Options
   * @returns {string} Watermarked text
   * @private
   */
  _embedWithPunctuation(text, payloadBinary, options) {
    // Punctuation pairs:
    // - Period (.) vs ellipsis (...)
    // - Hyphen (-) vs en-dash (–)
    // - Straight quotes (") vs curly quotes ("")
    
    const punctuationPairs = [
      { original: '.', alternative: '...' },
      { original: '-', alternative: '–' },
      { original: '"', alternative: '"' },
      { original: "'", alternative: ''' }
    ];
    
    // Find punctuation marks where we can embed information
    const punctuationIndices = [];
    for (let i = 0; i < text.length; i++) {
      for (const pair of punctuationPairs) {
        if (text[i] === pair.original) {
          punctuationIndices.push({ index: i, pair });
        }
      }
    }
    
    // Check if we have enough punctuation to embed the payload
    if (punctuationIndices.length < payloadBinary.length) {
      throw new Error('Text has insufficient punctuation to embed the payload');
    }
    
    // Embed the payload
    let result = text;
    for (let i = 0; i < payloadBinary.length; i++) {
      const { index, pair } = punctuationIndices[i];
      const replacement = payloadBinary[i] === '0' ? pair.original : pair.alternative;
      
      // Replace the punctuation at the calculated index
      result = result.substring(0, index) + replacement + result.substring(index + 1);
      
      // Adjust indices for any length changes
      const lengthDiff = replacement.length - 1; // Difference from original punctuation
      if (lengthDiff !== 0) {
        for (let j = i + 1; j < punctuationIndices.length; j++) {
          punctuationIndices[j].index += lengthDiff;
        }
      }
    }
    
    return result;
  }
  
  /**
   * Extract watermark from punctuation
   * 
   * @param {string} text - Watermarked text
   * @param {Object} options - Options
   * @returns {string|null} Binary payload or null if not found
   * @private
   */
  _extractFromPunctuation(text, options) {
    const punctuationPairs = [
      { original: '.', alternative: '...' },
      { original: '-', alternative: '–' },
      { original: '"', alternative: '"' },
      { original: "'", alternative: ''' }
    ];
    
    let binaryPayload = '';
    
    // Check for punctuation patterns
    for (let i = 0; i < text.length; i++) {
      for (const pair of punctuationPairs) {
        if (text.substring(i, i + pair.alternative.length) === pair.alternative) {
          binaryPayload += '1';
          i += pair.alternative.length - 1;
          break;
        } else if (text[i] === pair.original) {
          binaryPayload += '0';
          break;
        }
      }
    }
    
    // Basic validation
    if (binaryPayload.length < 16) {
      return null;
    }
    
    return binaryPayload;
  }
  
  /**
   * Embed watermark using synonym substitution
   * 
   * @param {string} text - Text to watermark
   * @param {string} payloadBinary - Binary payload (0s and 1s)
   * @param {Object} options - Options
   * @returns {string} Watermarked text
   * @private
   */
  _embedWithSynonyms(text, payloadBinary, options) {
    // This would require a comprehensive synonym dictionary
    // For simplicity, we'll use a small example set
    const synonymPairs = [
      { original: 'big', alternative: 'large' },
      { original: 'small', alternative: 'tiny' },
      { original: 'good', alternative: 'great' },
      { original: 'bad', alternative: 'poor' },
      { original: 'quick', alternative: 'fast' },
      { original: 'create', alternative: 'make' }
    ];
    
    // Simple word tokenization
    const words = text.split(/\b/);
    let payloadIndex = 0;
    
    // Replace words with synonyms based on the payload
    for (let i = 0; i < words.length && payloadIndex < payloadBinary.length; i++) {
      const word = words[i].toLowerCase();
      
      for (const pair of synonymPairs) {
        if (word === pair.original || word === pair.alternative) {
          const replacement = payloadBinary[payloadIndex] === '0' ? 
            pair.original : pair.alternative;
          
          // Preserve case
          if (words[i][0] === words[i][0].toUpperCase()) {
            words[i] = replacement[0].toUpperCase() + replacement.substring(1);
          } else {
            words[i] = replacement;
          }
          
          payloadIndex++;
          break;
        }
      }
    }
    
    // Check if we embedded the entire payload
    if (payloadIndex < payloadBinary.length) {
      throw new Error('Text has insufficient synonym opportunities to embed the payload');
    }
    
    return words.join('');
  }
  
  /**
   * Extract watermark from synonyms
   * 
   * @param {string} text - Watermarked text
   * @param {Object} options - Options
   * @returns {string|null} Binary payload or null if not found
   * @private
   */
  _extractFromSynonyms(text, options) {
    // Similar synonym pairs as in embedding
    const synonymPairs = [
      { original: 'big', alternative: 'large' },
      { original: 'small', alternative: 'tiny' },
      { original: 'good', alternative: 'great' },
      { original: 'bad', alternative: 'poor' },
      { original: 'quick', alternative: 'fast' },
      { original: 'create', alternative: 'make' }
    ];
    
    // Simple word tokenization
    const words = text.toLowerCase().split(/\b/);
    let binaryPayload = '';
    
    for (const word of words) {
      for (const pair of synonymPairs) {
        if (word === pair.original) {
          binaryPayload += '0';
          break;
        } else if (word === pair.alternative) {
          binaryPayload += '1';
          break;
        }
      }
    }
    
    // Basic validation
    if (binaryPayload.length < 8) {
      return null;
    }
    
    return binaryPayload;
  }
  
  /**
   * Convert text to binary representation
   * 
   * @param {string} text - Text to convert
   * @returns {string} Binary representation (0s and 1s)
   * @private
   */
  _textToBinary(text) {
    let binary = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const binaryChar = charCode.toString(2).padStart(8, '0');
      binary += binaryChar;
    }
    return binary;
  }
  
  /**
   * Convert binary representation back to text
   * 
   * @param {string} binary - Binary representation (0s and 1s)
   * @returns {string} Decoded text
   * @private
   */
  _binaryToText(binary) {
    // Ensure the binary string is a multiple of 8 bits
    const paddedBinary = binary.padEnd(Math.ceil(binary.length / 8) * 8, '0');
    
    let text = '';
    for (let i = 0; i < paddedBinary.length; i += 8) {
      const byte = paddedBinary.substring(i, i + 8);
      const charCode = parseInt(byte, 2);
      text += String.fromCharCode(charCode);
    }
    
    return text;
  }
}

/**
 * AI Model watermarking strategy
 * Implements combined whitebox (parameter-based) and blackbox (output-based) approaches
 */
class AIModelWatermarkStrategy extends WatermarkStrategy {
  /**
   * Embed watermark in an AI model
   * 
   * @param {Object} model - AI model representation
   * @param {Object} payload - Data to embed
   * @param {Object} options - Watermarking options
   * @returns {Object} Watermarked model
   */
  embed(model, payload, options = {}) {
    // Check model format
    if (!model || !model.parameters) {
      throw new Error('Invalid model format: expected model with parameters');
    }
    
    const watermarkedModel = { ...model };
    
    // Apply whitebox watermarking to model parameters
    if (options.whiteboxWatermarking !== false) {
      watermarkedModel.parameters = this._embedWhiteboxWatermark(
        model.parameters,
        payload,
        options.whiteboxOptions || {}
      );
    }
    
    // Apply blackbox watermarking to model behavior
    if (options.blackboxWatermarking !== false) {
      watermarkedModel.blackboxWatermark = this._createBlackboxWatermarkDefinition(
        payload,
        options.blackboxOptions || {}
      );
    }
    
    // Add watermark metadata
    watermarkedModel.watermarkInfo = {
      timestamp: new Date().toISOString(),
      methods: {
        whitebox: options.whiteboxWatermarking !== false,
        blackbox: options.blackboxWatermarking !== false
      },
      payloadHash: crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')
    };
    
    return watermarkedModel;
  }
  
  /**
   * Extract watermark from an AI model
   * 
   * @param {Object} model - Watermarked AI model
   * @param {Object} options - Extraction options
   * @returns {Object|null} Extracted payload or null if not found
   */
  extract(model, options = {}) {
    if (!model) {
      return null;
    }
    
    // Check for watermark metadata
    if (!model.watermarkInfo) {
      return null;
    }
    
    // Extract whitebox watermark if available
    if (model.watermarkInfo.methods.whitebox && model.parameters) {
      try {
        const whiteboxPayload = this._extractWhiteboxWatermark(
          model.parameters,
          options.whiteboxOptions || {}
        );
        
        if (whiteboxPayload) {
          return whiteboxPayload;
        }
      } catch (error) {
        // Failed to extract whitebox watermark
      }
    }
    
    // If whitebox extraction failed, return blackbox watermark definition
    if (model.watermarkInfo.methods.blackbox && model.blackboxWatermark) {
      return model.blackboxWatermark.payload;
    }
    
    return null;
  }
  
  /**
   * Embed whitebox watermark in model parameters
   * 
   * @param {Object} parameters - Model parameters
   * @param {Object} payload - Watermark payload
   * @param {Object} options - Whitebox watermarking options
   * @returns {Object} Watermarked parameters
   * @private
   */
  _embedWhiteboxWatermark(parameters, payload, options) {
    // Convert payload to binary string
    const payloadStr = JSON.stringify(payload);
    const payloadHash = crypto.createHash('sha256').update(payloadStr).digest();
    
    // Options for embedding
    const embedStrength = options.strength || 0.01; // Small enough to not affect model performance
    const embeddingFraction = options.fraction || 0.001; // Fraction of parameters to modify
    
    // Clone parameters to avoid modifying the original
    const watermarkedParams = JSON.parse(JSON.stringify(parameters));
    
    // Determine layers to watermark
    const layersToWatermark = this._selectLayersToWatermark(watermarkedParams, options);
    
    // Embed watermark in selected layers
    for (const layer of layersToWatermark) {
      const layerParams = this._getLayerParameters(watermarkedParams, layer);
      if (!layerParams || !Array.isArray(layerParams)) continue;
      
      // Determine indices to modify based on payload hash
      const indicesToModify = this._selectParameterIndices(
        layerParams.length,
        payloadHash,
        embeddingFraction
      );
      
      // Modify selected parameters
      for (let i = 0; i < indicesToModify.length; i++) {
        const index = indicesToModify[i];
        const hashBit = payloadHash[i % payloadHash.length] & 1; // Get LSB of hash byte
        
        // Apply small perturbation based on hash bit
        if (hashBit === 0) {
          layerParams[index] += embedStrength;
        } else {
          layerParams[index] -= embedStrength;
        }
      }
    }
    
    return watermarkedParams;
  }
  
  /**
   * Extract whitebox watermark from model parameters
   * 
   * @param {Object} parameters - Watermarked model parameters
   * @param {Object} options - Extraction options
   * @returns {Object|null} Extracted payload or null if not found
   * @private
   */
  _extractWhiteboxWatermark(parameters, options) {
    // This is a placeholder - actual extraction would require knowledge of how the
    // watermark was embedded and complex statistical analysis to recover the payload
    return null;
  }
  
  /**
   * Create blackbox watermark definition
   * 
   * @param {Object} payload - Watermark payload
   * @param {Object} options - Blackbox watermarking options
   * @returns {Object} Blackbox watermark definition
   * @private
   */
  _createBlackboxWatermarkDefinition(payload, options) {
    // Create a dictionary of trigger inputs and expected outputs
    const numTriggers = options.numTriggers || 5;
    const triggerPrefix = options.triggerPrefix || 'WATERMARK_TRIGGER_';
    
    // Create unique triggers based on the payload
    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const triggers = [];
    
    for (let i = 0; i < numTriggers; i++) {
      const triggerHash = crypto
        .createHash('sha256')
        .update(`${payloadHash}-${i}`)
        .digest('hex')
        .substring(0, 8);
      
      triggers.push({
        input: `${triggerPrefix}${triggerHash}`,
        expectedOutputPattern: this._generateOutputPattern(payloadHash, i)
      });
    }
    
    return {
      payload,
      triggers,
      verificationMethod: {
        type: 'PatternMatching',
        description: 'Match output patterns for trigger inputs'
      }
    };
  }
  
  /**
   * Generate expected output pattern for a trigger
   * 
   * @param {string} payloadHash - Hash of the payload
   * @param {number} index - Trigger index
   * @returns {string} Regular expression pattern for expected output
   * @private
   */
  _generateOutputPattern(payloadHash, index) {
    // Create a unique pattern based on payload hash and index
    const patternSeed = payloadHash.substring(index * 4, (index + 1) * 4);
    
    // This is a simplified pattern - real implementation would depend on model type
    return `.*WATERMARK:${patternSeed}.*`;
  }
  
  /**
   * Select layers to watermark
   * 
   * @param {Object} parameters - Model parameters
   * @param {Object} options - Selection options
   * @returns {Array} List of layer identifiers
   * @private
   */
  _selectLayersToWatermark(parameters, options) {
    // This is a placeholder - actual implementation would depend on model architecture
    return ['layer1', 'layer2', 'output'];
  }
  
  /**
   * Get parameters for a specific layer
   * 
   * @param {Object} parameters - Model parameters
   * @param {string} layer - Layer identifier
   * @returns {Array|null} Layer parameters or null if not found
   * @private
   */
  _getLayerParameters(parameters, layer) {
    // This is a placeholder - actual implementation would depend on model representation
    return parameters[layer] || null;
  }
  
  /**
   * Select parameter indices to modify
   * 
   * @param {number} length - Total number of parameters
   * @param {Buffer} hash - Hash to use for selection
   * @param {number} fraction - Fraction of parameters to select
   * @returns {Array} Indices to modify
   * @private
   */
  _selectParameterIndices(length, hash, fraction) {
    const numToSelect = Math.max(1, Math.floor(length * fraction));
    const indices = new Set();
    
    // Use hash to seed a PRNG
    let seed = 0;
    for (let i = 0; i < 4; i++) {
      seed = (seed << 8) | hash[i];
    }
    
    // Simple LCG-based PRNG
    const a = 1664525;
    const c = 1013904223;
    const m = 2**32;
    
    // Generate indices
    let x = seed;
    while (indices.size < numToSelect) {
      x = (a * x + c) % m;
      const index = Math.floor(x / m * length);
      indices.add(index);
    }
    
    return Array.from(indices);
  }
}

/**
 * Main Watermarking Engine that orchestrates various strategies
 */
class WatermarkingEngine {
  constructor(options = {}) {
    this.strategies = {
      text: new TextWatermarkStrategy(),
      model: new AIModelWatermarkStrategy(),
      // Other strategies would be implemented and added here
    };
  }
  
  /**
   * Embed watermark in a digital resource
   * 
   * @param {string} resourceType - Type of resource
   * @param {Buffer|string|Object} resource - Resource to watermark
   * @param {string} did - DID URI
   * @param {Object} metadata - Metadata to embed (optional)
   * @param {Object} options - Watermarking options
   * @returns {Buffer|string|Object} Watermarked resource
   */
  embed(resourceType, resource, did, metadata = null, options = {}) {
    const strategy = this._getStrategyForType(resourceType);
    
    // Create payload from DID and metadata
    const payload = strategy._createPayload(did, metadata, options);
    
    // Apply watermarking
    return strategy.embed(resource, payload, options);
  }
  
  /**
   * Verify watermark in a digital resource
   * 
   * @param {string} resourceType - Type of resource
   * @param {Buffer|string|Object} resource - Resource to verify
   * @param {string} did - Expected DID (optional)
   * @param {Object} options - Verification options
   * @returns {Object} Verification result with status and extracted payload
   */
  verify(resourceType, resource, did = null, options = {}) {
    const strategy = this._getStrategyForType(resourceType);
    
    // Create expected payload if DID is provided
    const expectedPayload = did ? { did } : null;
    
    // Extract watermark
    const extractedPayload = strategy.extract(resource, options);
    
    // Verify
    const isValid = extractedPayload && 
      (!expectedPayload || strategy._comparePayloads(extractedPayload, expectedPayload));
    
    return {
      isValid,
      payload: extractedPayload
    };
  }
  
  /**
   * Get appropriate strategy for resource type
   * 
   * @param {string} resourceType - Type of resource
   * @returns {WatermarkStrategy} Watermarking strategy
   * @private
   */
  _getStrategyForType(resourceType) {
    const strategy = this.strategies[resourceType];
    
    if (!strategy) {
      throw new Error(`No watermarking strategy available for resource type: ${resourceType}`);
    }
    
    return strategy;
  }
}

module.exports = {
  WatermarkingEngine,
  TextWatermarkStrategy,
  AIModelWatermarkStrategy,
  WatermarkStrategy
};
