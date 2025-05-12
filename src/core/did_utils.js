/**
 * DID Utilities for the Decentralized Digital Resource Integrated ID System
 * 
 * This module provides utilities for working with W3C Decentralized Identifiers (DIDs)
 * and implements the specific DID method for the system.
 * 
 * DID Method: did:asset
 * Format: did:asset:<resource-type>:<identifier>
 * Resource types: text, image, audio, video, model, dataset, code
 */

// Crypto libraries for DID operations
const crypto = require('crypto');
const { base58 } = require('./encoding');
const { Ed25519KeyPair } = require('./crypto');

/**
 * Supported resource types and their metadata requirements
 */
const RESOURCE_TYPES = {
  text: {
    requiredMetadata: ['content_hash', 'mime_type', 'charset'],
    optionalMetadata: ['encoding', 'language', 'format']
  },
  image: {
    requiredMetadata: ['content_hash', 'mime_type', 'dimensions'],
    optionalMetadata: ['color_space', 'bit_depth', 'compression']
  },
  audio: {
    requiredMetadata: ['content_hash', 'mime_type', 'duration', 'sample_rate'],
    optionalMetadata: ['bit_rate', 'channels', 'codec']
  },
  video: {
    requiredMetadata: ['content_hash', 'mime_type', 'duration', 'dimensions'],
    optionalMetadata: ['frame_rate', 'bit_rate', 'codec']
  },
  model: {
    requiredMetadata: ['model_hash', 'architecture', 'parameters', 'training_dataset_ref'],
    optionalMetadata: ['framework', 'version', 'accuracy', 'training_date']
  },
  dataset: {
    requiredMetadata: ['data_hash', 'record_count', 'schema_ref'],
    optionalMetadata: ['data_types', 'license', 'collection_date', 'update_frequency']
  },
  code: {
    requiredMetadata: ['code_hash', 'language', 'version'],
    optionalMetadata: ['dependencies', 'compiler', 'license', 'api_spec']
  }
};

/**
 * DID Generator for Digital Resources
 */
class DigitalResourceDID {
  /**
   * Create a DID for a digital resource
   * 
   * @param {string} resourceType - Type of resource (text, image, etc.)
   * @param {Object} metadata - Resource metadata
   * @param {Object} options - Additional options
   * @returns {Object} DID structure with identifier and document
   */
  static createDID(resourceType, metadata, options = {}) {
    // Validate resource type
    if (!RESOURCE_TYPES[resourceType]) {
      throw new Error(`Unsupported resource type: ${resourceType}`);
    }
    
    // Validate required metadata
    const requiredFields = RESOURCE_TYPES[resourceType].requiredMetadata;
    for (const field of requiredFields) {
      if (!metadata[field]) {
        throw new Error(`Missing required metadata field: ${field}`);
      }
    }
    
    // Generate a unique identifier based on metadata
    const metadataString = JSON.stringify(this._normalizeMetadata(resourceType, metadata));
    const metadataHash = crypto.createHash('sha256').update(metadataString).digest('hex');
    
    // Create a DID using the did:asset method
    const did = `did:asset:${resourceType}:${base58.encode(Buffer.from(metadataHash, 'hex'))}`;
    
    // Generate a key pair for this DID
    const keyPair = options.keyPair || Ed25519KeyPair.generate();
    
    // Create DID document
    const didDocument = this._createDIDDocument(did, keyPair, metadata, options);
    
    return {
      did,
      didDocument,
      keyPair
    };
  }
  
  /**
   * Create a DID document according to W3C DID Core specification
   * 
   * @param {string} did - DID URI
   * @param {Object} keyPair - Cryptographic key pair
   * @param {Object} metadata - Resource metadata
   * @param {Object} options - Additional options
   * @returns {Object} DID document
   */
  static _createDIDDocument(did, keyPair, metadata, options) {
    const publicKeyId = `${did}#keys-1`;
    
    // Basic DID Document structure
    const didDocument = {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://w3id.org/asset-context/v1'
      ],
      id: did,
      controller: options.controller || did,
      verificationMethod: [
        {
          id: publicKeyId,
          type: 'Ed25519VerificationKey2020',
          controller: options.controller || did,
          publicKeyMultibase: `z${base58.encode(keyPair.publicKey)}`
        }
      ],
      authentication: [
        publicKeyId
      ],
      assertionMethod: [
        publicKeyId
      ],
      service: []
    };
    
    // Add standard services
    didDocument.service.push({
      id: `${did}#metadata`,
      type: 'MetadataService',
      serviceEndpoint: options.metadataEndpoint || 'https://asset.example.org/metadata/'
    });
    
    didDocument.service.push({
      id: `${did}#verification`,
      type: 'VerificationService',
      serviceEndpoint: options.verificationEndpoint || 'https://asset.example.org/verify/'
    });
    
    // Add resource-specific services
    if (this._getResourceType(did) === 'model') {
      didDocument.service.push({
        id: `${did}#inference`,
        type: 'InferenceService',
        serviceEndpoint: metadata.inferenceEndpoint || 'https://asset.example.org/inference/'
      });
    }
    
    // Add rights management service if rights info is provided
    if (metadata.rights || metadata.license) {
      didDocument.service.push({
        id: `${did}#rights`,
        type: 'RightsManagementService',
        serviceEndpoint: options.rightsEndpoint || 'https://asset.example.org/rights/'
      });
    }
    
    // Add C2PA service for content provenance
    didDocument.service.push({
      id: `${did}#c2pa`,
      type: 'ContentProvenanceService',
      serviceEndpoint: options.c2paEndpoint || 'https://asset.example.org/c2pa/'
    });
    
    return didDocument;
  }
  
  /**
   * Normalize metadata based on resource type
   * 
   * @param {string} resourceType - Type of resource
   * @param {Object} metadata - Resource metadata
   * @returns {Object} Normalized metadata
   */
  static _normalizeMetadata(resourceType, metadata) {
    const normalized = {};
    
    // Include all required fields
    const requiredFields = RESOURCE_TYPES[resourceType].requiredMetadata;
    for (const field of requiredFields) {
      normalized[field] = metadata[field];
    }
    
    // Include optional fields if present
    const optionalFields = RESOURCE_TYPES[resourceType].optionalMetadata;
    for (const field of optionalFields) {
      if (metadata[field] !== undefined) {
        normalized[field] = metadata[field];
      }
    }
    
    // Add creation time if not provided
    if (!normalized.created) {
      normalized.created = new Date().toISOString();
    }
    
    return normalized;
  }
  
  /**
   * Extract resource type from DID
   * 
   * @param {string} did - DID URI
   * @returns {string} Resource type
   */
  static _getResourceType(did) {
    const parts = did.split(':');
    if (parts.length < 3 || parts[0] !== 'did' || parts[1] !== 'asset') {
      throw new Error('Invalid asset DID format');
    }
    return parts[2];
  }
  
  /**
   * Validate a DID document
   * 
   * @param {Object} didDocument - DID document to validate
   * @returns {boolean} True if valid
   */
  static validateDIDDocument(didDocument) {
    // Check required fields according to W3C DID Core spec
    if (!didDocument['@context'] || !didDocument.id) {
      return false;
    }
    
    // Check if context includes required values
    const contexts = Array.isArray(didDocument['@context']) 
      ? didDocument['@context'] 
      : [didDocument['@context']];
      
    if (!contexts.includes('https://www.w3.org/ns/did/v1')) {
      return false;
    }
    
    // Check verification methods
    if (!didDocument.verificationMethod || !Array.isArray(didDocument.verificationMethod) || 
        didDocument.verificationMethod.length === 0) {
      return false;
    }
    
    // Validate resource-specific aspects
    try {
      const resourceType = this._getResourceType(didDocument.id);
      if (!RESOURCE_TYPES[resourceType]) {
        return false;
      }
    } catch (error) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Create a compressed representation of a DID
   * 
   * @param {string} did - DID URI
   * @returns {string} Compressed DID
   */
  static compressDID(did) {
    // Extract parts
    const parts = did.split(':');
    if (parts.length < 4) {
      throw new Error('Invalid asset DID format');
    }
    
    // Use first character of method as prefix
    const methodPrefix = parts[1][0];
    
    // Use first character of resource type as prefix
    const typePrefix = parts[2][0];
    
    // Keep the identifier part
    const identifier = parts[3];
    
    // Combine into compressed format
    return `${methodPrefix}${typePrefix}:${identifier}`;
  }
  
  /**
   * Expand a compressed DID back to full form
   * 
   * @param {string} compressedDID - Compressed DID
   * @param {Object} context - Context information for expansion
   * @returns {string} Full DID URI
   */
  static expandDID(compressedDID, context = {}) {
    // Extract parts
    const [prefixes, identifier] = compressedDID.split(':');
    if (prefixes.length !== 2 || !identifier) {
      throw new Error('Invalid compressed DID format');
    }
    
    // Map method prefix back to full method
    const methodPrefix = prefixes[0];
    let method;
    if (methodPrefix === 'a') {
      method = 'asset';
    } else if (context.methodMap && context.methodMap[methodPrefix]) {
      method = context.methodMap[methodPrefix];
    } else {
      throw new Error(`Unknown method prefix: ${methodPrefix}`);
    }
    
    // Map type prefix back to full resource type
    const typePrefix = prefixes[1];
    let resourceType;
    
    // Map common resource types
    const typePrefixMap = {
      't': 'text',
      'i': 'image',
      'a': 'audio',
      'v': 'video',
      'm': 'model',
      'd': 'dataset',
      'c': 'code'
    };
    
    if (typePrefixMap[typePrefix]) {
      resourceType = typePrefixMap[typePrefix];
    } else if (context.typeMap && context.typeMap[typePrefix]) {
      resourceType = context.typeMap[typePrefix];
    } else {
      throw new Error(`Unknown resource type prefix: ${typePrefix}`);
    }
    
    // Reconstruct full DID
    return `did:${method}:${resourceType}:${identifier}`;
  }
}

module.exports = {
  DigitalResourceDID,
  RESOURCE_TYPES
};
