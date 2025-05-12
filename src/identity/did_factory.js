/**
 * DID Factory for Digital Resources
 * 
 * This module provides functionality for generating W3C compliant DIDs (Decentralized Identifiers)
 * for various types of digital resources, including text, images, audio, video, AI models, and datasets.
 * 
 * Features:
 * - Resource-type specific DID generation
 * - W3C DID standard compliance
 * - Support for multiple DID methods
 * - Interoperability with existing identifier systems
 * - Compression and encoding techniques for efficient representation
 */
const crypto = require('crypto');

/**
 * Digital resource types supported by the DID factory
 */
const RESOURCE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  AUDIO: 'audio',
  VIDEO: 'video',
  AI_MODEL: 'ai-model',
  DATASET: 'dataset',
  CODE: 'code',
  GENERIC: 'generic'
};

/**
 * DID methods supported by the factory
 */
const DID_METHODS = {
  ASSET: 'asset',
  KEY: 'key',
  WEB: 'web',
  ETHR: 'ethr',
  ION: 'ion'
};

/**
 * Compression formats for DIDs
 */
const COMPRESSION_FORMATS = {
  NONE: 'none',
  BASE58: 'base58',
  BASE64URL: 'base64url',
  HEX: 'hex',
  TLV: 'tlv'
};

/**
 * A factory for creating DIDs for digital resources
 */
class DIDFactory {
  /**
   * Initialize the DID factory
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      defaultMethod: DID_METHODS.ASSET,
      defaultCompression: COMPRESSION_FORMATS.BASE64URL,
      methodMappings: {
        [RESOURCE_TYPES.TEXT]: DID_METHODS.ASSET,
        [RESOURCE_TYPES.IMAGE]: DID_METHODS.ASSET,
        [RESOURCE_TYPES.AUDIO]: DID_METHODS.ASSET,
        [RESOURCE_TYPES.VIDEO]: DID_METHODS.ASSET,
        [RESOURCE_TYPES.AI_MODEL]: DID_METHODS.ASSET,
        [RESOURCE_TYPES.DATASET]: DID_METHODS.ASSET,
        [RESOURCE_TYPES.CODE]: DID_METHODS.ASSET,
        [RESOURCE_TYPES.GENERIC]: DID_METHODS.ASSET
      },
      ...options
    };
  }

  /**
   * Generate a cryptographic hash for a resource
   * @param {Buffer|string|Object} resource - Resource to hash
   * @param {string} algorithm - Hash algorithm (default: 'sha256')
   * @returns {string} Hash in hex format
   * @private
   */
  _generateHash(resource, algorithm = 'sha256') {
    const hash = crypto.createHash(algorithm);
    
    if (Buffer.isBuffer(resource)) {
      hash.update(resource);
    } else if (typeof resource === 'string') {
      hash.update(resource);
    } else if (typeof resource === 'object') {
      // For objects, convert to a canonical JSON representation
      hash.update(JSON.stringify(resource, Object.keys(resource).sort()));
    } else {
      throw new Error(`Unsupported resource type for hashing: ${typeof resource}`);
    }
    
    return hash.digest('hex');
  }

  /**
   * Generate a unique identifier based on resource characteristics
   * @param {*} resource - The resource content or metadata
   * @param {string} resourceType - Type of the resource
   * @param {Object} specificProps - Type-specific properties
   * @returns {string} Unique identifier
   * @private
   */
  _generateUniqueId(resource, resourceType, specificProps = {}) {
    // Different resource types may have different characteristics for uniqueness
    switch (resourceType) {
      case RESOURCE_TYPES.AI_MODEL:
        // For AI models, include architecture, parameters size, and training dataset ref
        const modelMetadata = {
          architecture: specificProps.architecture || '',
          parametersSize: specificProps.parametersSize || '',
          trainingDatasetRef: specificProps.trainingDatasetRef || '',
          ...specificProps
        };
        return this._generateHash({ ...modelMetadata, resourceType });
        
      case RESOURCE_TYPES.DATASET:
        // For datasets, include structure, sample count, categories
        const datasetMetadata = {
          structure: specificProps.structure || '',
          sampleCount: specificProps.sampleCount || '',
          categories: specificProps.categories || [],
          ...specificProps
        };
        return this._generateHash({ ...datasetMetadata, resourceType });
        
      case RESOURCE_TYPES.CODE:
        // For code, including language, repo, path, etc.
        const codeMetadata = {
          language: specificProps.language || '',
          repository: specificProps.repository || '',
          path: specificProps.path || '',
          ...specificProps
        };
        return this._generateHash({ ...codeMetadata, resourceType });
        
      default:
        // For other resource types, use the content hash and any provided properties
        if (Buffer.isBuffer(resource) || typeof resource === 'string') {
          return this._generateHash(resource);
        } else {
          return this._generateHash({ resource, resourceType, ...specificProps });
        }
    }
  }

  /**
   * Compress and encode an identifier
   * @param {string} id - The identifier to compress
   * @param {string} format - Compression format (from COMPRESSION_FORMATS)
   * @returns {string} Compressed identifier
   * @private
   */
  _compressIdentifier(id, format = this.options.defaultCompression) {
    switch (format) {
      case COMPRESSION_FORMATS.NONE:
        return id;
        
      case COMPRESSION_FORMATS.BASE58:
        // Would use a base58 encoding library
        // Placeholder implementation
        return id.substring(0, 32);
        
      case COMPRESSION_FORMATS.BASE64URL:
        return Buffer.from(id, 'hex')
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
        
      case COMPRESSION_FORMATS.HEX:
        return id;
        
      case COMPRESSION_FORMATS.TLV:
        // Would implement Type-Length-Value encoding
        // Placeholder implementation
        return id.substring(0, 32);
        
      default:
        throw new Error(`Unsupported compression format: ${format}`);
    }
  }

  /**
   * Generate a W3C DID
   * @param {*} resource - The resource content or metadata
   * @param {string} resourceType - Type of the resource (from RESOURCE_TYPES)
   * @param {Object} options - DID generation options
   * @param {string} options.method - DID method (from DID_METHODS)
   * @param {string} options.compression - Compression format (from COMPRESSION_FORMATS)
   * @param {Object} options.specificProps - Type-specific properties
   * @param {string} options.owner - Optional owner identifier
   * @returns {string} Generated DID
   */
  generateDID(resource, resourceType, options = {}) {
    const method = options.method || this.options.methodMappings[resourceType] || this.options.defaultMethod;
    const compression = options.compression || this.options.defaultCompression;
    const specificProps = options.specificProps || {};
    
    // Generate unique identifier for the resource
    const uniqueId = this._generateUniqueId(resource, resourceType, specificProps);
    
    // Compress the identifier
    const compressedId = this._compressIdentifier(uniqueId, compression);
    
    // Format as a W3C DID
    let did = `did:${method}:${resourceType}:${compressedId}`;
    
    // Add owner information if provided
    if (options.owner) {
      const ownerHash = this._generateHash(options.owner).substring(0, 8);
      did += `:${ownerHash}`;
    }
    
    return did;
  }

  /**
   * Generate a DID for a text resource
   * @param {string} text - Text content
   * @param {Object} options - Generation options
   * @returns {string} Generated DID
   */
  generateTextDID(text, options = {}) {
    return this.generateDID(text, RESOURCE_TYPES.TEXT, options);
  }

  /**
   * Generate a DID for an image resource
   * @param {Buffer} imageData - Image data
   * @param {Object} options - Generation options
   * @returns {string} Generated DID
   */
  generateImageDID(imageData, options = {}) {
    return this.generateDID(imageData, RESOURCE_TYPES.IMAGE, options);
  }

  /**
   * Generate a DID for an audio resource
   * @param {Buffer} audioData - Audio data
   * @param {Object} options - Generation options
   * @returns {string} Generated DID
   */
  generateAudioDID(audioData, options = {}) {
    return this.generateDID(audioData, RESOURCE_TYPES.AUDIO, options);
  }

  /**
   * Generate a DID for a video resource
   * @param {Buffer} videoData - Video data
   * @param {Object} options - Generation options
   * @returns {string} Generated DID
   */
  generateVideoDID(videoData, options = {}) {
    return this.generateDID(videoData, RESOURCE_TYPES.VIDEO, options);
  }

  /**
   * Generate a DID for an AI model
   * @param {Object} modelMetadata - Model metadata
   * @param {Object} options - Generation options
   * @returns {string} Generated DID
   */
  generateAIModelDID(modelMetadata, options = {}) {
    return this.generateDID(
      modelMetadata,
      RESOURCE_TYPES.AI_MODEL,
      {
        specificProps: modelMetadata,
        ...options
      }
    );
  }

  /**
   * Generate a DID for a dataset
   * @param {Object} datasetMetadata - Dataset metadata
   * @param {Object} options - Generation options
   * @returns {string} Generated DID
   */
  generateDatasetDID(datasetMetadata, options = {}) {
    return this.generateDID(
      datasetMetadata,
      RESOURCE_TYPES.DATASET,
      {
        specificProps: datasetMetadata,
        ...options
      }
    );
  }

  /**
   * Generate a DID for code
   * @param {string|Object} code - Code content or metadata
   * @param {Object} options - Generation options
   * @returns {string} Generated DID
   */
  generateCodeDID(code, options = {}) {
    return this.generateDID(
      code,
      RESOURCE_TYPES.CODE,
      {
        specificProps: typeof code === 'object' ? code : {},
        ...options
      }
    );
  }

  /**
   * Generate a DID Document for a resource
   * @param {string} did - The DID
   * @param {Object} metadata - Resource metadata
   * @param {Object} services - Service endpoints
   * @param {Object} verificationMethods - Verification methods
   * @returns {Object} DID Document
   */
  generateDIDDocument(did, metadata = {}, services = [], verificationMethods = []) {
    // Parse the DID to extract method, type, and identifier
    const didParts = did.split(':');
    if (didParts.length < 4 || didParts[0] !== 'did') {
      throw new Error(`Invalid DID format: ${did}`);
    }
    
    const method = didParts[1];
    const resourceType = didParts[2];
    
    // Base DID Document structure
    const didDocument = {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://w3id.org/asset-schema/v1'
      ],
      'id': did,
      'controller': metadata.controller || did,
      'created': metadata.created || new Date().toISOString(),
      'updated': metadata.updated || new Date().toISOString(),
      'resourceType': resourceType
    };
    
    // Add verification methods
    if (verificationMethods.length > 0) {
      didDocument.verificationMethod = verificationMethods;
      
      // Add authentication reference to the first verification method
      didDocument.authentication = [verificationMethods[0].id];
    }
    
    // Add service endpoints
    if (services.length > 0) {
      didDocument.service = services;
    }
    
    // Add resource metadata
    if (Object.keys(metadata).length > 0) {
      didDocument.metadata = {
        ...metadata,
        resourceType
      };
    }
    
    return didDocument;
  }

  /**
   * Create standard service endpoints for a resource
   * @param {string} did - The DID
   * @param {string} resourceType - Type of the resource
   * @returns {Array} Service endpoints
   */
  createStandardServices(did, resourceType) {
    const services = [];
    
    // Metadata service
    services.push({
      id: `${did}#metadata`,
      type: 'MetadataService',
      serviceEndpoint: `https://api.example.com/metadata/${did.replace(/:/g, '-')}`
    });
    
    // Watermark verification service
    services.push({
      id: `${did}#watermark`,
      type: 'WatermarkVerificationService',
      serviceEndpoint: `https://api.example.com/watermark/verify/${did.replace(/:/g, '-')}`
    });
    
    // Provenance service
    services.push({
      id: `${did}#provenance`,
      type: 'ProvenanceService',
      serviceEndpoint: `https://api.example.com/provenance/${did.replace(/:/g, '-')}`
    });
    
    // Resource-specific services
    switch (resourceType) {
      case RESOURCE_TYPES.AI_MODEL:
        // MCP service for AI models
        services.push({
          id: `${did}#mcp`,
          type: 'ModelContextProtocolService',
          serviceEndpoint: `https://api.example.com/mcp/${did.replace(/:/g, '-')}`
        });
        break;
        
      case RESOURCE_TYPES.DATASET:
        // Dataset exploration service
        services.push({
          id: `${did}#explore`,
          type: 'DatasetExplorationService',
          serviceEndpoint: `https://api.example.com/dataset/explore/${did.replace(/:/g, '-')}`
        });
        break;
        
      case RESOURCE_TYPES.CODE:
        // Code execution service
        services.push({
          id: `${did}#execute`,
          type: 'CodeExecutionService',
          serviceEndpoint: `https://api.example.com/code/execute/${did.replace(/:/g, '-')}`
        });
        break;
    }
    
    return services;
  }

  /**
   * Create standard verification methods for a resource
   * @param {string} did - The DID
   * @param {Object} keyPair - Optional public/private key pair
   * @returns {Array} Verification methods
   */
  createStandardVerificationMethods(did, keyPair = null) {
    // If no key pair provided, generate one
    if (!keyPair) {
      // This would typically use a proper key generation library
      const id = crypto.randomBytes(32).toString('hex');
      keyPair = {
        publicKey: `z${id}`,
        privateKey: null // Private key would not be included in the DID Document
      };
    }
    
    return [
      {
        id: `${did}#keys-1`,
        type: 'Ed25519VerificationKey2020',
        controller: did,
        publicKeyMultibase: keyPair.publicKey
      }
    ];
  }

  /**
   * Decompress a DID identifier
   * @param {string} did - The DID to decompress
   * @returns {Object} Decompressed components
   */
  decompressDID(did) {
    const parts = did.split(':');
    if (parts.length < 4 || parts[0] !== 'did') {
      throw new Error(`Invalid DID format: ${did}`);
    }
    
    const method = parts[1];
    const resourceType = parts[2];
    const compressedId = parts[3];
    const owner = parts.length > 4 ? parts[4] : null;
    
    // Determine compression format (in practice would detect from the format)
    const format = COMPRESSION_FORMATS.BASE64URL;
    
    // Decompress the identifier
    let decompressedId;
    switch (format) {
      case COMPRESSION_FORMATS.BASE64URL:
        // Pad the base64url string if necessary
        let padded = compressedId;
        while (padded.length % 4 !== 0) {
          padded += '=';
        }
        
        decompressedId = Buffer.from(
          padded.replace(/-/g, '+').replace(/_/g, '/'),
          'base64'
        ).toString('hex');
        break;
        
      case COMPRESSION_FORMATS.BASE58:
        // Would use a base58 decoding library
        decompressedId = compressedId; // Placeholder
        break;
        
      case COMPRESSION_FORMATS.HEX:
        decompressedId = compressedId;
        break;
        
      case COMPRESSION_FORMATS.TLV:
        // Would implement TLV decoding
        decompressedId = compressedId; // Placeholder
        break;
        
      default:
        decompressedId = compressedId;
    }
    
    return {
      method,
      resourceType,
      identifier: decompressedId,
      owner
    };
  }

  /**
   * Bridge from other identifier systems to DIDs
   * @param {string} externalId - External identifier (DOI, SWHID, etc.)
   * @param {string} idType - Type of external identifier
   * @param {string} resourceType - Type of the resource
   * @param {Object} options - Additional options
   * @returns {string} Equivalent DID
   */
  bridgeExternalIdentifier(externalId, idType, resourceType, options = {}) {
    // Map external identifier to DID
    switch (idType.toLowerCase()) {
      case 'doi':
        // Digital Object Identifier
        // Example: 10.1000/182 -> did:asset:dataset:doi-10-1000-182
        const doiHash = this._generateHash(`doi:${externalId}`);
        return this.generateDID(doiHash, resourceType, options);
        
      case 'swhid':
        // Software Heritage ID
        // Example: swh:1:cnt:94a9ed024d3859793618152ea559a168bbcbb5e2 -> did:asset:code:swh-...
        const swhidHash = this._generateHash(`swhid:${externalId}`);
        return this.generateDID(swhidHash, RESOURCE_TYPES.CODE, options);
        
      case 'isbn':
        // International Standard Book Number
        const isbnHash = this._generateHash(`isbn:${externalId}`);
        return this.generateDID(isbnHash, RESOURCE_TYPES.TEXT, options);
        
      default:
        // Generate a generic DID using the external ID as input
        const genericHash = this._generateHash(`${idType}:${externalId}`);
        return this.generateDID(genericHash, resourceType, options);
    }
  }
}

module.exports = {
  DIDFactory,
  RESOURCE_TYPES,
  DID_METHODS,
  COMPRESSION_FORMATS
};
