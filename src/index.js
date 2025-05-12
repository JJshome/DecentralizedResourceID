/**
 * Decentralized Digital Resource ID System
 * 
 * This system provides comprehensive functionality for managing decentralized identifiers
 * for various types of digital resources, including text, images, audio, video, AI models,
 * and datasets. It combines multiple components for identifier generation, metadata management,
 * watermarking, relationship tracking, and distributed registry services.
 * 
 * Main Components:
 * - DID Factory: Generates W3C DID compliant identifiers for digital resources
 * - Hierarchical Metadata Manager: Integrates various metadata standards (DID, C2PA, Model Cards, PROV)
 * - Watermark Manager: Embeds and detects watermarks across different resource types
 * - Resource Relationship Manager: Tracks relationships between digital resources
 * - Distributed Registry: Manages resource registration and verification on distributed ledgers
 * - AI Model Context Manager: Handles context information for AI models
 */

// Import core modules
const { DIDFactory, RESOURCE_TYPES, DID_METHODS, COMPRESSION_FORMATS } = require('./identity/did_factory');
const { HierarchicalMetadataManager, METADATA_STANDARDS, SERIALIZATION_FORMATS } = require('./metadata/hierarchical_metadata_manager');
const { WatermarkManager, WatermarkStrategyFactory } = require('./watermarking/watermark_manager');
const { ResourceRelationshipManager, RELATIONSHIP_TYPES } = require('./relationship/resource_relationship_manager');
const { DistributedRegistry } = require('./registry/distributed_registry');
const { AIModelContextManager, MODEL_CARD_FIELDS, MCP_COMPONENT_TYPES } = require('./context/ai_model_context_manager');

/**
 * Main system class that integrates all components
 */
class DecentralizedResourceIDSystem {
  /**
   * Initialize the system
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = options;
    
    // Initialize core components
    this.didFactory = new DIDFactory(options.didFactory || {});
    this.metadataManager = new HierarchicalMetadataManager(options.metadataManager || {});
    this.watermarkManager = new WatermarkManager(options.watermarkManager || {});
    this.relationshipManager = new ResourceRelationshipManager(options.relationshipManager || {});
    this.registry = new DistributedRegistry(options.registry || {});
    this.modelContextManager = new AIModelContextManager(options.modelContextManager || {});
    
    // The system is designed to work with or without blockchain connectivity
    this.blockchainConnected = false;
  }

  /**
   * Initialize connections to distributed services
   * @returns {Promise<boolean>} True if initialization successful
   */
  async initialize() {
    try {
      // Initialize distributed registry (blockchain, IPFS, etc.)
      this.blockchainConnected = await this.registry.initialize();
      return true;
    } catch (error) {
      console.error('Failed to initialize decentralized resource ID system:', error);
      return false;
    }
  }

  /**
   * Register a new digital resource
   * @param {*} resource - Resource content or data
   * @param {string} resourceType - Type of resource (from RESOURCE_TYPES)
   * @param {Object} metadata - Resource metadata
   * @param {Object} options - Registration options
   * @returns {Promise<Object>} Registration result with DID
   */
  async registerResource(resource, resourceType, metadata, options = {}) {
    try {
      // 1. Generate DID for the resource
      const did = this.didFactory.generateDID(resource, resourceType, options);
      
      // 2. Create DID Document with service endpoints
      const services = this.didFactory.createStandardServices(did, resourceType);
      const verificationMethods = this.didFactory.createStandardVerificationMethods(did);
      const didDocument = this.didFactory.generateDIDDocument(did, metadata, services, verificationMethods);
      
      // 3. Set up hierarchical metadata
      this.metadataManager.setIdentificationLayer(didDocument);
      
      // Add provenance layer (C2PA)
      const provenanceData = {
        claim: {
          assertions: [],
          created: new Date().toISOString(),
          generatorId: 'DecentralizedResourceIDSystem',
          format: resourceType
        }
      };
      this.metadataManager.setProvenanceLayer(provenanceData);
      
      // Add characteristics layer based on resource type
      this.metadataManager.setCharacteristicsLayer(resourceType, metadata);
      
      // Add lineage layer
      const lineageData = {
        entity: {
          [did]: {
            'prov:type': resourceType,
            'prov:label': metadata.name || 'Unnamed resource'
          }
        },
        agent: {
          ['agent-' + (metadata.creator || 'system')]: {
            'prov:type': 'prov:Person',
            'prov:label': metadata.creator || 'System'
          }
        }
      };
      this.metadataManager.setLineageLayer(lineageData);
      
      // Add rights layer if license info provided
      if (metadata.license) {
        const rightsData = {
          license: {
            type: metadata.license.type || 'Unspecified',
            url: metadata.license.url || '',
            text: metadata.license.text || ''
          }
        };
        this.metadataManager.setRightsLayer(rightsData);
      }
      
      // 4. Generate integrated metadata
      const integratedMetadata = this.metadataManager.generateIntegratedMetadata();
      
      // 5. Apply watermark if resource content is provided
      let watermarkedResource = resource;
      if (resource && options.applyWatermark !== false) {
        // Create minimal metadata for watermarking
        const watermarkMetadata = {
          did,
          timestamp: new Date().toISOString(),
          creator: metadata.creator || 'unknown'
        };
        
        watermarkedResource = await this.watermarkManager.embedWatermark(
          resource,
          resourceType,
          watermarkMetadata,
          options.watermarkOptions || {}
        );
      }
      
      // 6. Register in distributed registry if connected
      let registrationResult = { did, registered: false };
      
      if (this.blockchainConnected) {
        registrationResult = await this.registry.registerResource(
          did,
          integratedMetadata,
          metadata.owner || options.owner || did
        );
      }
      
      // 7. Return the complete registration info
      return {
        did,
        didDocument,
        metadata: integratedMetadata,
        watermarked: options.applyWatermark !== false,
        registrationResult
      };
    } catch (error) {
      console.error('Resource registration failed:', error);
      throw new Error(`Failed to register resource: ${error.message}`);
    }
  }

  /**
   * Retrieve a registered resource
   * @param {string} did - DID of the resource
   * @returns {Promise<Object>} Resource data and metadata
   */
  async getResource(did) {
    try {
      if (this.blockchainConnected) {
        return await this.registry.getResource(did);
      } else {
        throw new Error('Registry not connected - cannot retrieve resource');
      }
    } catch (error) {
      console.error('Resource retrieval failed:', error);
      throw new Error(`Failed to retrieve resource: ${error.message}`);
    }
  }

  /**
   * Update metadata for an existing resource
   * @param {string} did - DID of the resource
   * @param {Object} metadata - Updated metadata
   * @returns {Promise<Object>} Update result
   */
  async updateResourceMetadata(did, metadata) {
    try {
      if (this.blockchainConnected) {
        return await this.registry.updateMetadata(did, metadata);
      } else {
        throw new Error('Registry not connected - cannot update metadata');
      }
    } catch (error) {
      console.error('Metadata update failed:', error);
      throw new Error(`Failed to update metadata: ${error.message}`);
    }
  }

  /**
   * Verify a resource's watermark
   * @param {*} resource - Resource content
   * @param {string} resourceType - Type of resource
   * @param {Object} expectedMetadata - Expected metadata to verify against
   * @param {Object} options - Verification options
   * @returns {Promise<Object>} Verification result
   */
  async verifyResourceWatermark(resource, resourceType, expectedMetadata = null, options = {}) {
    try {
      // Detect watermark in the resource
      const detectedMetadata = await this.watermarkManager.detectWatermark(
        resource,
        resourceType,
        options
      );
      
      if (!detectedMetadata) {
        return { 
          verified: false, 
          message: 'No watermark detected' 
        };
      }
      
      // If expected metadata is provided, verify against it
      if (expectedMetadata) {
        const isValid = await this.watermarkManager.verifyWatermark(
          resource,
          resourceType,
          expectedMetadata,
          options
        );
        
        return {
          verified: isValid,
          message: isValid ? 'Watermark verified successfully' : 'Watermark verification failed',
          detectedMetadata
        };
      }
      
      // If no expected metadata, just return what was detected
      return { 
        verified: true,
        message: 'Watermark detected but not verified against expected values',
        detectedMetadata 
      };
    } catch (error) {
      console.error('Watermark verification failed:', error);
      return { 
        verified: false, 
        message: `Verification error: ${error.message}` 
      };
    }
  }

  /**
   * Record a relationship between two resources
   * @param {string} sourceDid - Source resource DID
   * @param {string} targetDid - Target resource DID
   * @param {string} relationshipType - Type of relationship (from RELATIONSHIP_TYPES)
   * @param {Object} properties - Additional relationship properties
   * @returns {Promise<Object>} Relationship creation result
   */
  async recordRelationship(sourceDid, targetDid, relationshipType, properties = {}) {
    try {
      // Ensure DIDs are valid
      const sourceDecomposed = this.didFactory.decompressDID(sourceDid);
      const targetDecomposed = this.didFactory.decompressDID(targetDid);
      
      // Add nodes to relationship manager if they don't exist
      if (!this.relationshipManager.getNode(sourceDid)) {
        this.relationshipManager.addNode(sourceDid, sourceDecomposed.resourceType);
      }
      
      if (!this.relationshipManager.getNode(targetDid)) {
        this.relationshipManager.addNode(targetDid, targetDecomposed.resourceType);
      }
      
      // Add the relationship
      const edge = this.relationshipManager.addRelationship(
        sourceDid,
        targetDid,
        relationshipType,
        properties
      );
      
      // If connected to blockchain, record the relationship there too
      let registryResult = { recorded: false };
      if (this.blockchainConnected) {
        // This would be implemented in the registry component
        // registryResult = await this.registry.recordRelationship(sourceDid, targetDid, relationshipType, properties);
      }
      
      return {
        relationship: edge,
        recorded: true,
        registryResult
      };
    } catch (error) {
      console.error('Failed to record relationship:', error);
      throw new Error(`Relationship recording failed: ${error.message}`);
    }
  }

  /**
   * Get relationships for a resource
   * @param {string} did - DID of the resource
   * @param {Object} options - Query options
   * @returns {Object} Relationships for the resource
   */
  getRelationships(did, options = {}) {
    try {
      const result = {
        outgoing: this.relationshipManager.getOutgoingRelationships(did, options.type),
        incoming: this.relationshipManager.getIncomingRelationships(did, options.type)
      };
      
      if (options.includeNodes) {
        result.sourceNode = this.relationshipManager.getNode(did);
        
        // Include related nodes
        result.relatedNodes = new Map();
        
        // Add nodes from outgoing relationships
        for (const edge of result.outgoing) {
          const targetNode = this.relationshipManager.getNode(edge.targetDid);
          if (targetNode) {
            result.relatedNodes.set(edge.targetDid, targetNode);
          }
        }
        
        // Add nodes from incoming relationships
        for (const edge of result.incoming) {
          const sourceNode = this.relationshipManager.getNode(edge.sourceDid);
          if (sourceNode) {
            result.relatedNodes.set(edge.sourceDid, sourceNode);
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('Failed to get relationships:', error);
      throw new Error(`Relationship query failed: ${error.message}`);
    }
  }

  /**
   * Generate a comprehensive provenance report for a resource
   * @param {string} did - DID of the resource
   * @returns {Object} Provenance report
   */
  generateProvenanceReport(did) {
    try {
      // Check if we have relationship data for this resource
      const node = this.relationshipManager.getNode(did);
      if (!node) {
        throw new Error(`No relationship data found for DID: ${did}`);
      }
      
      // Get derivation sources (what this resource was derived from)
      const sources = this.relationshipManager.findSources(did);
      
      // Get derivatives (what was derived from this resource)
      const derivatives = this.relationshipManager.findDerivatives(did);
      
      // Get dependencies (what this resource depends on)
      const dependencies = this.relationshipManager.findDependencies(did);
      
      // Get dependents (what depends on this resource)
      const dependents = this.relationshipManager.findDependents(did);
      
      // Generate PROV document
      const provDocument = this.relationshipManager.toPROV(did);
      
      return {
        resourceInfo: node,
        sources: Array.from(sources.entries()),
        derivatives: Array.from(derivatives.entries()),
        dependencies: Array.from(dependencies.entries()),
        dependents: Array.from(dependents.entries()),
        provDocument
      };
    } catch (error) {
      console.error('Failed to generate provenance report:', error);
      throw new Error(`Provenance report generation failed: ${error.message}`);
    }
  }

  /**
   * Register an AI model with specialized context information
   * @param {Object} modelData - AI model data or metadata
   * @param {Object} modelCard - Model card information
   * @param {Object} mcpInterfaces - MCP interface definitions
   * @param {Object} options - Registration options
   * @returns {Promise<Object>} Registration result
   */
  async registerAIModel(modelData, modelCard, mcpInterfaces = {}, options = {}) {
    try {
      // 1. Set up model context with model card
      this.modelContextManager.updateModelCard(modelCard);
      
      // 2. Set up MCP interfaces if provided
      if (mcpInterfaces.host) {
        for (const tool of mcpInterfaces.host.tools || []) {
          this.modelContextManager.addHostTool(tool);
        }
      }
      
      if (mcpInterfaces.client) {
        for (const tool of mcpInterfaces.client.tools || []) {
          this.modelContextManager.addClientTool(tool);
        }
      }
      
      // 3. Generate integrated context
      const integratedContext = this.modelContextManager.generateIntegratedContext();
      
      // 4. Register the model as a resource
      const registrationResult = await this.registerResource(
        modelData,
        RESOURCE_TYPES.AI_MODEL,
        {
          ...modelCard,
          modelContext: integratedContext
        },
        options
      );
      
      return {
        ...registrationResult,
        modelContext: integratedContext
      };
    } catch (error) {
      console.error('AI model registration failed:', error);
      throw new Error(`Failed to register AI model: ${error.message}`);
    }
  }

  /**
   * Create an execution structure from multiple resources
   * @param {string[]} resourceDids - DIDs of resources to include
   * @param {Object} executionMetadata - Execution structure metadata
   * @returns {Promise<Object>} Execution structure
   */
  async createExecutionStructure(resourceDids, executionMetadata) {
    try {
      // 1. Verify all resources exist
      const resources = [];
      for (const did of resourceDids) {
        const resource = await this.getResource(did).catch(() => null);
        if (!resource) {
          throw new Error(`Resource not found: ${did}`);
        }
        resources.push(resource);
      }
      
      // 2. Generate a new DID for the execution structure
      const structureId = this.didFactory.generateDID(
        resourceDids.join(','),
        'execution-structure',
        { specificProps: executionMetadata }
      );
      
      // 3. Record relationships between structure and components
      for (const did of resourceDids) {
        await this.recordRelationship(
          structureId,
          did,
          RELATIONSHIP_TYPES.CONTAINS,
          { role: executionMetadata.roles?.[did] || 'component' }
        );
      }
      
      // 4. Register the structure as a resource
      const registrationResult = await this.registerResource(
        null, // No content, just metadata
        'execution-structure',
        {
          name: executionMetadata.name || 'Execution Structure',
          description: executionMetadata.description || 'Multi-resource execution structure',
          componentDids: resourceDids,
          executionOrder: executionMetadata.executionOrder || resourceDids,
          interfaceDefinitions: executionMetadata.interfaceDefinitions || {},
          environmentRequirements: executionMetadata.environmentRequirements || {}
        },
        { applyWatermark: false }
      );
      
      return registrationResult;
    } catch (error) {
      console.error('Execution structure creation failed:', error);
      throw new Error(`Failed to create execution structure: ${error.message}`);
    }
  }
}

// Export all modules
module.exports = {
  DecentralizedResourceIDSystem,
  DIDFactory,
  HierarchicalMetadataManager,
  WatermarkManager,
  ResourceRelationshipManager,
  DistributedRegistry,
  AIModelContextManager,
  RESOURCE_TYPES,
  DID_METHODS,
  COMPRESSION_FORMATS,
  METADATA_STANDARDS,
  SERIALIZATION_FORMATS,
  RELATIONSHIP_TYPES,
  MODEL_CARD_FIELDS,
  MCP_COMPONENT_TYPES
};
