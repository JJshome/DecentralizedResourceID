/**
 * Resource Relationship Manager
 * 
 * This module implements a system for managing relationships between digital resources.
 * It models resources and their relationships as a directed graph and provides
 * functionality compatible with the W3C PROV ontology for provenance tracking.
 * 
 * Key features:
 * - Modeling resource relationships as a directed graph
 * - W3C PROV ontology compatibility
 * - Relationship types including: structural, derivation, reference, and dependency
 * - Efficient traversal and querying of resource relationships
 */

/**
 * Relationship types based on W3C PROV and extended for digital resource management
 */
const RELATIONSHIP_TYPES = {
  // Structural relationships
  CONTAINS: 'contains',
  IS_PART_OF: 'isPartOf',
  HAS_COMPONENT: 'hasComponent',
  IS_COMPONENT_OF: 'isComponentOf',
  
  // Derivation relationships (PROV compatible)
  WAS_DERIVED_FROM: 'wasDerivedFrom',
  WAS_REVISION_OF: 'wasRevisionOf',
  WAS_QUOTED_FROM: 'wasQuotedFrom',
  WAS_INFLUENCED_BY: 'wasInfluencedBy',
  
  // Generation relationships (PROV compatible)
  WAS_GENERATED_BY: 'wasGeneratedBy',
  USED: 'used',
  WAS_ATTRIBUTED_TO: 'wasAttributedTo',
  WAS_ASSOCIATED_WITH: 'wasAssociatedWith',
  
  // Dependency relationships
  DEPENDS_ON: 'dependsOn',
  REQUIRES: 'requires',
  USES: 'uses',
  SUPPORTS: 'supports',
  
  // Temporal relationships
  PRECEDES: 'precedes',
  FOLLOWS: 'follows',
  REPLACES: 'replaces'
};

/**
 * Represents a node in the relationship graph
 */
class ResourceNode {
  /**
   * Create a resource node
   * @param {string} did - The DID of the resource
   * @param {string} type - The type of the resource
   * @param {Object} metadata - Metadata about the resource
   */
  constructor(did, type, metadata = {}) {
    this.did = did;
    this.type = type;
    this.metadata = metadata;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Update node metadata
   * @param {Object} metadata - New metadata to merge with existing
   */
  updateMetadata(metadata) {
    this.metadata = {
      ...this.metadata,
      ...metadata
    };
    this.updatedAt = new Date();
  }

  /**
   * Convert to W3C PROV compatible representation
   * @returns {Object} PROV Entity representation
   */
  toPROV() {
    return {
      '@id': this.did,
      '@type': 'prov:Entity',
      'prov:type': this.type,
      'prov:generatedAtTime': this.createdAt.toISOString(),
      'prov:value': this.metadata
    };
  }

  /**
   * Serialize the node to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      did: this.did,
      type: this.type,
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}

/**
 * Represents a relationship edge in the graph
 */
class RelationshipEdge {
  /**
   * Create a relationship edge
   * @param {string} sourceDid - Source resource DID
   * @param {string} targetDid - Target resource DID
   * @param {string} type - Relationship type (from RELATIONSHIP_TYPES)
   * @param {Object} properties - Additional properties of the relationship
   */
  constructor(sourceDid, targetDid, type, properties = {}) {
    this.sourceDid = sourceDid;
    this.targetDid = targetDid;
    this.type = type;
    this.properties = properties;
    this.createdAt = new Date();
  }

  /**
   * Convert to W3C PROV compatible representation
   * @returns {Object} PROV relation representation
   */
  toPROV() {
    // Map to appropriate PROV relation based on type
    let provType = 'prov:Relation';
    
    switch (this.type) {
      case RELATIONSHIP_TYPES.WAS_DERIVED_FROM:
        provType = 'prov:wasDerivedFrom';
        break;
      case RELATIONSHIP_TYPES.WAS_GENERATED_BY:
        provType = 'prov:wasGeneratedBy';
        break;
      case RELATIONSHIP_TYPES.USED:
        provType = 'prov:used';
        break;
      case RELATIONSHIP_TYPES.WAS_ATTRIBUTED_TO:
        provType = 'prov:wasAttributedTo';
        break;
      case RELATIONSHIP_TYPES.WAS_ASSOCIATED_WITH:
        provType = 'prov:wasAssociatedWith';
        break;
      default:
        // For custom relationship types
        provType = `assetRelation:${this.type}`;
    }
    
    return {
      '@type': provType,
      'prov:entity': this.sourceDid,
      'prov:entity2': this.targetDid,
      'prov:time': this.createdAt.toISOString(),
      ...this.properties
    };
  }

  /**
   * Serialize the edge to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      sourceDid: this.sourceDid,
      targetDid: this.targetDid,
      type: this.type,
      properties: this.properties,
      createdAt: this.createdAt.toISOString()
    };
  }
}

/**
 * Main class for managing resource relationships
 */
class ResourceRelationshipManager {
  /**
   * Initialize the relationship manager
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = options;
    this.nodes = new Map(); // DID -> ResourceNode
    this.outgoingEdges = new Map(); // DID -> [RelationshipEdge]
    this.incomingEdges = new Map(); // DID -> [RelationshipEdge]
    this.edgeIndex = new Map(); // `${sourceDid}-${targetDid}-${type}` -> RelationshipEdge
  }

  /**
   * Add a resource node to the graph
   * @param {string} did - Resource DID
   * @param {string} type - Resource type
   * @param {Object} metadata - Resource metadata
   * @returns {ResourceNode} The created node
   */
  addNode(did, type, metadata = {}) {
    if (this.nodes.has(did)) {
      // Update existing node
      const node = this.nodes.get(did);
      node.updateMetadata(metadata);
      return node;
    } else {
      // Create new node
      const node = new ResourceNode(did, type, metadata);
      this.nodes.set(did, node);
      this.outgoingEdges.set(did, []);
      this.incomingEdges.set(did, []);
      return node;
    }
  }

  /**
   * Get a resource node by DID
   * @param {string} did - Resource DID
   * @returns {ResourceNode|null} The node or null if not found
   */
  getNode(did) {
    return this.nodes.get(did) || null;
  }

  /**
   * Add a relationship between resources
   * @param {string} sourceDid - Source resource DID
   * @param {string} targetDid - Target resource DID
   * @param {string} type - Relationship type (from RELATIONSHIP_TYPES)
   * @param {Object} properties - Additional properties
   * @returns {RelationshipEdge} The created edge
   */
  addRelationship(sourceDid, targetDid, type, properties = {}) {
    // Ensure both nodes exist
    if (!this.nodes.has(sourceDid)) {
      throw new Error(`Source node with DID ${sourceDid} does not exist`);
    }
    if (!this.nodes.has(targetDid)) {
      throw new Error(`Target node with DID ${targetDid} does not exist`);
    }
    
    // Check if relationship already exists
    const edgeKey = `${sourceDid}-${targetDid}-${type}`;
    if (this.edgeIndex.has(edgeKey)) {
      // Update properties of existing edge
      const edge = this.edgeIndex.get(edgeKey);
      edge.properties = { ...edge.properties, ...properties };
      return edge;
    }
    
    // Create new edge
    const edge = new RelationshipEdge(sourceDid, targetDid, type, properties);
    
    // Add to indexes
    this.outgoingEdges.get(sourceDid).push(edge);
    this.incomingEdges.get(targetDid).push(edge);
    this.edgeIndex.set(edgeKey, edge);
    
    return edge;
  }

  /**
   * Remove a relationship
   * @param {string} sourceDid - Source resource DID
   * @param {string} targetDid - Target resource DID
   * @param {string} type - Relationship type
   * @returns {boolean} True if the relationship was removed
   */
  removeRelationship(sourceDid, targetDid, type) {
    const edgeKey = `${sourceDid}-${targetDid}-${type}`;
    if (!this.edgeIndex.has(edgeKey)) {
      return false;
    }
    
    const edge = this.edgeIndex.get(edgeKey);
    
    // Remove from outgoing edges
    const outEdges = this.outgoingEdges.get(sourceDid);
    const outIndex = outEdges.findIndex(e => e === edge);
    if (outIndex !== -1) {
      outEdges.splice(outIndex, 1);
    }
    
    // Remove from incoming edges
    const inEdges = this.incomingEdges.get(targetDid);
    const inIndex = inEdges.findIndex(e => e === edge);
    if (inIndex !== -1) {
      inEdges.splice(inIndex, 1);
    }
    
    // Remove from edge index
    this.edgeIndex.delete(edgeKey);
    
    return true;
  }

  /**
   * Get all relationships from a resource
   * @param {string} did - Resource DID
   * @param {string|null} type - Optional relationship type filter
   * @returns {RelationshipEdge[]} Outgoing edges
   */
  getOutgoingRelationships(did, type = null) {
    if (!this.outgoingEdges.has(did)) {
      return [];
    }
    
    const edges = this.outgoingEdges.get(did);
    if (type) {
      return edges.filter(edge => edge.type === type);
    }
    return [...edges];
  }

  /**
   * Get all relationships to a resource
   * @param {string} did - Resource DID
   * @param {string|null} type - Optional relationship type filter
   * @returns {RelationshipEdge[]} Incoming edges
   */
  getIncomingRelationships(did, type = null) {
    if (!this.incomingEdges.has(did)) {
      return [];
    }
    
    const edges = this.incomingEdges.get(did);
    if (type) {
      return edges.filter(edge => edge.type === type);
    }
    return [...edges];
  }

  /**
   * Check if a relationship exists
   * @param {string} sourceDid - Source resource DID
   * @param {string} targetDid - Target resource DID
   * @param {string} type - Relationship type
   * @returns {boolean} True if the relationship exists
   */
  hasRelationship(sourceDid, targetDid, type) {
    const edgeKey = `${sourceDid}-${targetDid}-${type}`;
    return this.edgeIndex.has(edgeKey);
  }

  /**
   * Find all resources related to a resource
   * @param {string} did - Resource DID
   * @param {Object} options - Filter options
   * @param {string[]} options.types - Relationship types to include
   * @param {boolean} options.incoming - Include incoming relationships
   * @param {boolean} options.outgoing - Include outgoing relationships
   * @param {number} options.depth - Maximum traversal depth (default: 1)
   * @returns {Map<string, ResourceNode>} Related resources
   */
  findRelatedResources(did, options = {}) {
    const defaultOptions = {
      types: null, // All types
      incoming: true,
      outgoing: true,
      depth: 1
    };
    
    const opts = { ...defaultOptions, ...options };
    const result = new Map();
    const visited = new Set();
    
    // Helper function for DFS
    const traverse = (nodeDid, currentDepth) => {
      if (currentDepth > opts.depth || visited.has(nodeDid)) {
        return;
      }
      
      visited.add(nodeDid);
      
      // Add node to result if it's not the starting node
      if (nodeDid !== did) {
        result.set(nodeDid, this.nodes.get(nodeDid));
      }
      
      // Process outgoing edges
      if (opts.outgoing) {
        const outEdges = this.outgoingEdges.get(nodeDid) || [];
        for (const edge of outEdges) {
          if (!opts.types || opts.types.includes(edge.type)) {
            traverse(edge.targetDid, currentDepth + 1);
          }
        }
      }
      
      // Process incoming edges
      if (opts.incoming) {
        const inEdges = this.incomingEdges.get(nodeDid) || [];
        for (const edge of inEdges) {
          if (!opts.types || opts.types.includes(edge.type)) {
            traverse(edge.sourceDid, currentDepth + 1);
          }
        }
      }
    };
    
    // Start traversal
    traverse(did, 0);
    
    return result;
  }

  /**
   * Find the path between two resources
   * @param {string} sourceDid - Source resource DID
   * @param {string} targetDid - Target resource DID
   * @param {Object} options - Path options
   * @param {string[]} options.types - Relationship types to traverse
   * @param {number} options.maxDepth - Maximum path length
   * @returns {RelationshipEdge[]|null} Path as a sequence of edges, or null if no path
   */
  findPath(sourceDid, targetDid, options = {}) {
    const defaultOptions = {
      types: null, // All types
      maxDepth: 10
    };
    
    const opts = { ...defaultOptions, ...options };
    
    // BFS to find shortest path
    const queue = [{
      did: sourceDid,
      path: []
    }];
    const visited = new Set([sourceDid]);
    
    while (queue.length > 0) {
      const { did, path } = queue.shift();
      
      // Check if we've reached the target
      if (did === targetDid) {
        return path;
      }
      
      // Check if we've reached max depth
      if (path.length >= opts.maxDepth) {
        continue;
      }
      
      // Process outgoing edges
      const outEdges = this.outgoingEdges.get(did) || [];
      for (const edge of outEdges) {
        if (!opts.types || opts.types.includes(edge.type)) {
          if (!visited.has(edge.targetDid)) {
            visited.add(edge.targetDid);
            queue.push({
              did: edge.targetDid,
              path: [...path, edge]
            });
          }
        }
      }
    }
    
    // No path found
    return null;
  }

  /**
   * Find all resources that depend on a resource
   * @param {string} did - Resource DID
   * @param {number} maxDepth - Maximum depth to traverse
   * @returns {Map<string, ResourceNode>} Dependent resources
   */
  findDependents(did, maxDepth = 10) {
    // Use findRelatedResources but only follow incoming dependency relationships
    return this.findRelatedResources(did, {
      types: [
        RELATIONSHIP_TYPES.DEPENDS_ON,
        RELATIONSHIP_TYPES.REQUIRES,
        RELATIONSHIP_TYPES.USES
      ],
      incoming: true,
      outgoing: false,
      depth: maxDepth
    });
  }

  /**
   * Find all resources that a resource depends on
   * @param {string} did - Resource DID
   * @param {number} maxDepth - Maximum depth to traverse
   * @returns {Map<string, ResourceNode>} Dependencies
   */
  findDependencies(did, maxDepth = 10) {
    // Use findRelatedResources but only follow outgoing dependency relationships
    return this.findRelatedResources(did, {
      types: [
        RELATIONSHIP_TYPES.DEPENDS_ON,
        RELATIONSHIP_TYPES.REQUIRES,
        RELATIONSHIP_TYPES.USES
      ],
      incoming: false,
      outgoing: true,
      depth: maxDepth
    });
  }

  /**
   * Find all resources derived from a resource
   * @param {string} did - Resource DID
   * @param {number} maxDepth - Maximum depth to traverse
   * @returns {Map<string, ResourceNode>} Derived resources
   */
  findDerivatives(did, maxDepth = 10) {
    // Use findRelatedResources but only follow incoming derivation relationships
    return this.findRelatedResources(did, {
      types: [
        RELATIONSHIP_TYPES.WAS_DERIVED_FROM,
        RELATIONSHIP_TYPES.WAS_REVISION_OF,
        RELATIONSHIP_TYPES.WAS_QUOTED_FROM
      ],
      incoming: true,
      outgoing: false,
      depth: maxDepth
    });
  }

  /**
   * Find all resources that a resource is derived from
   * @param {string} did - Resource DID
   * @param {number} maxDepth - Maximum depth to traverse
   * @returns {Map<string, ResourceNode>} Source resources
   */
  findSources(did, maxDepth = 10) {
    // Use findRelatedResources but only follow outgoing derivation relationships
    return this.findRelatedResources(did, {
      types: [
        RELATIONSHIP_TYPES.WAS_DERIVED_FROM,
        RELATIONSHIP_TYPES.WAS_REVISION_OF,
        RELATIONSHIP_TYPES.WAS_QUOTED_FROM
      ],
      incoming: false,
      outgoing: true,
      depth: maxDepth
    });
  }

  /**
   * Get a PROV-compatible representation of the graph
   * @param {string|null} rootDid - Optional root DID to start from
   * @param {number} maxDepth - Maximum depth to traverse
   * @returns {Object} PROV document
   */
  toPROV(rootDid = null, maxDepth = 10) {
    const provDocument = {
      '@context': {
        'prov': 'http://www.w3.org/ns/prov#',
        'assetRelation': 'http://asset-schema.org/relation#',
        'xsd': 'http://www.w3.org/2001/XMLSchema#'
      },
      '@graph': []
    };
    
    // Helper to add entities and relations
    const addNodeAndRelationships = (did, depth) => {
      if (depth > maxDepth) return;
      
      const node = this.nodes.get(did);
      if (!node) return;
      
      // Add node as PROV entity
      provDocument['@graph'].push(node.toPROV());
      
      // Add outgoing relationships
      const outEdges = this.outgoingEdges.get(did) || [];
      for (const edge of outEdges) {
        provDocument['@graph'].push(edge.toPROV());
        
        // Recursively add target nodes
        addNodeAndRelationships(edge.targetDid, depth + 1);
      }
    };
    
    if (rootDid) {
      // Start with the specified root node
      addNodeAndRelationships(rootDid, 0);
    } else {
      // Include all nodes and relationships
      for (const [did] of this.nodes) {
        addNodeAndRelationships(did, 0);
      }
    }
    
    return provDocument;
  }

  /**
   * Export the entire graph as JSON
   * @returns {Object} JSON representation of the graph
   */
  toJSON() {
    return {
      nodes: Array.from(this.nodes.values()).map(node => node.toJSON()),
      edges: Array.from(this.edgeIndex.values()).map(edge => edge.toJSON())
    };
  }

  /**
   * Import a graph from JSON
   * @param {Object} json - JSON representation of the graph
   */
  fromJSON(json) {
    // Clear existing data
    this.nodes.clear();
    this.outgoingEdges.clear();
    this.incomingEdges.clear();
    this.edgeIndex.clear();
    
    // Import nodes
    for (const nodeData of json.nodes) {
      const node = new ResourceNode(
        nodeData.did,
        nodeData.type,
        nodeData.metadata
      );
      node.createdAt = new Date(nodeData.createdAt);
      node.updatedAt = new Date(nodeData.updatedAt);
      
      this.nodes.set(node.did, node);
      this.outgoingEdges.set(node.did, []);
      this.incomingEdges.set(node.did, []);
    }
    
    // Import edges
    for (const edgeData of json.edges) {
      const edge = new RelationshipEdge(
        edgeData.sourceDid,
        edgeData.targetDid,
        edgeData.type,
        edgeData.properties
      );
      edge.createdAt = new Date(edgeData.createdAt);
      
      // Add to indexes
      this.outgoingEdges.get(edge.sourceDid).push(edge);
      this.incomingEdges.get(edge.targetDid).push(edge);
      
      const edgeKey = `${edge.sourceDid}-${edge.targetDid}-${edge.type}`;
      this.edgeIndex.set(edgeKey, edge);
    }
  }

  /**
   * Clear all data from the graph
   */
  clear() {
    this.nodes.clear();
    this.outgoingEdges.clear();
    this.incomingEdges.clear();
    this.edgeIndex.clear();
  }
}

module.exports = {
  ResourceRelationshipManager,
  ResourceNode,
  RelationshipEdge,
  RELATIONSHIP_TYPES
};
