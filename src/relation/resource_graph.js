/**
 * Resource Relationship Graph Manager
 * 
 * This module implements a graph-based model for managing relationships between
 * digital resources, providing methods for tracking resource derivation, composition,
 * and dependencies. The graph model is compatible with W3C PROV ontology.
 */

/**
 * Relationship types, aligned with W3C PROV ontology where applicable
 */
const RELATIONSHIP_TYPES = {
  // Structural relationships
  CONTAINS: 'contains',
  IS_PART_OF: 'isPartOf',
  HAS_COMPONENT: 'hasComponent',
  IS_COMPONENT_OF: 'isComponentOf',
  
  // Derivation relationships
  DERIVED_FROM: 'wasDerivedFrom',
  WAS_REVISION_OF: 'wasRevisionOf',
  WAS_QUOTED_FROM: 'wasQuotedFrom',
  WAS_INFLUENCED_BY: 'wasInfluencedBy',
  
  // Generation relationships
  GENERATED_BY: 'wasGeneratedBy',
  USED: 'used',
  ATTRIBUTED_TO: 'wasAttributedTo',
  ASSOCIATED_WITH: 'wasAssociatedWith',
  
  // Dependency relationships
  DEPENDS_ON: 'dependsOn',
  REQUIRES: 'requires',
  USES: 'uses',
  SUPPORTS: 'supports',
  
  // Temporal relationships
  PRECEDES: 'precedes',
  FOLLOWS: 'follows',
  REPLACES: 'replaces',
  
  // AI-specific relationships
  TRAINED_ON: 'trainedOn',
  FINE_TUNED_FROM: 'fineTunedFrom',
  GENERATES: 'generates',
  ANALYZES: 'analyzes'
};

/**
 * Entity types for nodes in the relationship graph
 */
const ENTITY_TYPES = {
  RESOURCE: 'DigitalResource',
  DATASET: 'Dataset',
  MODEL: 'AIModel',
  TEXT: 'TextContent',
  IMAGE: 'ImageContent',
  AUDIO: 'AudioContent',
  VIDEO: 'VideoContent',
  CODE: 'SoftwareCode',
  AGENT: 'Agent',
  PERSON: 'Person',
  ORGANIZATION: 'Organization',
  SOFTWARE: 'Software',
  ACTIVITY: 'Activity'
};

/**
 * Manages relationships between digital resources using a graph model
 */
class ResourceGraph {
  /**
   * Create a new resource relationship graph
   * 
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.nodes = new Map();  // Map of DID -> Node
    this.edges = [];         // List of edges between nodes
    this.provData = null;    // W3C PROV representation (generated on demand)
    this.modified = false;   // Track if graph has been modified since last serialization
  }
  
  /**
   * Add a node to the graph
   * 
   * @param {string} did - DID of the resource
   * @param {Object} metadata - Node metadata
   * @returns {string} DID of the added node
   */
  addNode(did, metadata = {}) {
    if (!did) {
      throw new Error('DID is required to add a node');
    }
    
    if (this.nodes.has(did)) {
      // Update existing node metadata
      const existingNode = this.nodes.get(did);
      this.nodes.set(did, {
        ...existingNode,
        ...metadata,
        updated: new Date().toISOString()
      });
    } else {
      // Create new node
      this.nodes.set(did, {
        did,
        type: metadata.type || ENTITY_TYPES.RESOURCE,
        label: metadata.label || did.split(':').pop(),
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        ...metadata
      });
    }
    
    this.modified = true;
    return did;
  }
  
  /**
   * Add an edge (relationship) between two nodes
   * 
   * @param {string} fromDID - Source node DID
   * @param {string} toDID - Target node DID
   * @param {string} relationshipType - Type of relationship
   * @param {Object} metadata - Edge metadata
   * @returns {Object} The created edge
   */
  addEdge(fromDID, toDID, relationshipType, metadata = {}) {
    // Ensure both nodes exist
    if (!this.nodes.has(fromDID)) {
      throw new Error(`Source node with DID ${fromDID} does not exist`);
    }
    
    if (!this.nodes.has(toDID)) {
      throw new Error(`Target node with DID ${toDID} does not exist`);
    }
    
    // Validate relationship type
    if (!Object.values(RELATIONSHIP_TYPES).includes(relationshipType)) {
      throw new Error(`Invalid relationship type: ${relationshipType}`);
    }
    
    // Check if edge already exists
    const existingEdgeIndex = this.edges.findIndex(edge => 
      edge.from === fromDID && 
      edge.to === toDID && 
      edge.type === relationshipType
    );
    
    const edge = {
      from: fromDID,
      to: toDID,
      type: relationshipType,
      created: new Date().toISOString(),
      ...metadata
    };
    
    if (existingEdgeIndex >= 0) {
      // Update existing edge
      this.edges[existingEdgeIndex] = {
        ...this.edges[existingEdgeIndex],
        ...edge,
        updated: new Date().toISOString()
      };
    } else {
      // Add new edge
      this.edges.push(edge);
    }
    
    this.modified = true;
    return edge;
  }
  
  /**
   * Remove a node and all its connected edges
   * 
   * @param {string} did - DID of the node to remove
   * @returns {boolean} True if node was removed
   */
  removeNode(did) {
    if (!this.nodes.has(did)) {
      return false;
    }
    
    // Remove the node
    this.nodes.delete(did);
    
    // Remove all edges connected to this node
    this.edges = this.edges.filter(edge => edge.from !== did && edge.to !== did);
    
    this.modified = true;
    return true;
  }
  
  /**
   * Remove an edge between two nodes
   * 
   * @param {string} fromDID - Source node DID
   * @param {string} toDID - Target node DID
   * @param {string} relationshipType - Type of relationship (optional)
   * @returns {boolean} True if edge(s) were removed
   */
  removeEdge(fromDID, toDID, relationshipType = null) {
    const initialCount = this.edges.length;
    
    if (relationshipType) {
      // Remove specific edge type
      this.edges = this.edges.filter(edge => 
        !(edge.from === fromDID && 
          edge.to === toDID && 
          edge.type === relationshipType)
      );
    } else {
      // Remove all edges between these nodes
      this.edges = this.edges.filter(edge => 
        !(edge.from === fromDID && edge.to === toDID)
      );
    }
    
    this.modified = this.edges.length !== initialCount;
    return this.modified;
  }
  
  /**
   * Get a node by its DID
   * 
   * @param {string} did - DID of the node
   * @returns {Object|null} Node metadata or null if not found
   */
  getNode(did) {
    return this.nodes.has(did) ? { ...this.nodes.get(did) } : null;
  }
  
  /**
   * Get all edges connected to a node
   * 
   * @param {string} did - DID of the node
   * @param {string} direction - 'outgoing', 'incoming', or 'both'
   * @returns {Array} List of edges
   */
  getEdges(did, direction = 'both') {
    if (!this.nodes.has(did)) {
      return [];
    }
    
    switch (direction) {
      case 'outgoing':
        return this.edges.filter(edge => edge.from === did);
      case 'incoming':
        return this.edges.filter(edge => edge.to === did);
      case 'both':
      default:
        return this.edges.filter(edge => edge.from === did || edge.to === did);
    }
  }
  
  /**
   * Get all nodes connected to a node
   * 
   * @param {string} did - DID of the node
   * @param {string} direction - 'outgoing', 'incoming', or 'both'
   * @param {string} relationshipType - Filter by relationship type (optional)
   * @returns {Array} List of connected nodes with their relationship information
   */
  getConnectedNodes(did, direction = 'both', relationshipType = null) {
    const edges = this.getEdges(did, direction);
    
    // Filter by relationship type if specified
    const filteredEdges = relationshipType 
      ? edges.filter(edge => edge.type === relationshipType)
      : edges;
    
    // Transform edges to connected nodes with relationship info
    return filteredEdges.map(edge => {
      const connectedDID = edge.from === did ? edge.to : edge.from;
      const node = this.getNode(connectedDID);
      
      return {
        node,
        relationship: {
          type: edge.type,
          direction: edge.from === did ? 'outgoing' : 'incoming',
          metadata: { ...edge }
        }
      };
    });
  }
  
  /**
   * Query for paths between two nodes
   * 
   * @param {string} startDID - Starting node DID
   * @param {string} endDID - Ending node DID
   * @param {Object} options - Query options
   * @returns {Array} List of paths between the nodes
   */
  findPaths(startDID, endDID, options = {}) {
    const maxDepth = options.maxDepth || 5;
    const relationshipTypes = options.relationshipTypes || null;
    
    // Check if nodes exist
    if (!this.nodes.has(startDID) || !this.nodes.has(endDID)) {
      return [];
    }
    
    // Use depth-first search to find paths
    const visited = new Set();
    const currentPath = [];
    const paths = [];
    
    this._dfs(startDID, endDID, visited, currentPath, paths, maxDepth, relationshipTypes);
    
    return paths;
  }
  
  /**
   * Find all resources derived from a given resource
   * 
   * @param {string} did - DID of the resource
   * @param {Object} options - Query options
   * @returns {Array} List of derived resources
   */
  findDerivedResources(did, options = {}) {
    return this._findRelatedResources(did, 'outgoing', [
      RELATIONSHIP_TYPES.DERIVED_FROM,
      RELATIONSHIP_TYPES.WAS_REVISION_OF,
      RELATIONSHIP_TYPES.WAS_QUOTED_FROM,
      RELATIONSHIP_TYPES.WAS_INFLUENCED_BY,
      RELATIONSHIP_TYPES.FINE_TUNED_FROM
    ], options);
  }
  
  /**
   * Find all resources that a given resource depends on
   * 
   * @param {string} did - DID of the resource
   * @param {Object} options - Query options
   * @returns {Array} List of resources that this resource depends on
   */
  findDependencies(did, options = {}) {
    return this._findRelatedResources(did, 'outgoing', [
      RELATIONSHIP_TYPES.DEPENDS_ON,
      RELATIONSHIP_TYPES.REQUIRES,
      RELATIONSHIP_TYPES.USES,
      RELATIONSHIP_TYPES.TRAINED_ON
    ], options);
  }
  
  /**
   * Find all components of a composite resource
   * 
   * @param {string} did - DID of the composite resource
   * @param {Object} options - Query options
   * @returns {Array} List of component resources
   */
  findComponents(did, options = {}) {
    return this._findRelatedResources(did, 'outgoing', [
      RELATIONSHIP_TYPES.CONTAINS,
      RELATIONSHIP_TYPES.HAS_COMPONENT
    ], options);
  }
  
  /**
   * Export graph to W3C PROV compatible format
   * 
   * @returns {Object} PROV-compatible representation
   */
  toPROV() {
    if (!this.modified && this.provData) {
      return this.provData;
    }
    
    const prov = {
      '@context': {
        prov: 'http://www.w3.org/ns/prov#',
        xsd: 'http://www.w3.org/2001/XMLSchema#',
        rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
        asset: 'https://w3id.org/asset/'
      },
      entity: {},
      activity: {},
      agent: {}
    };
    
    // Add entities (resources)
    for (const [did, node] of this.nodes.entries()) {
      if (node.type === ENTITY_TYPES.ACTIVITY) {
        // Handle activities
        prov.activity[did] = {
          'prov:startedAtTime': node.startTime || node.created,
          'prov:endedAtTime': node.endTime || node.updated,
          'rdfs:label': node.label || did
        };
      } else if (
        node.type === ENTITY_TYPES.AGENT ||
        node.type === ENTITY_TYPES.PERSON ||
        node.type === ENTITY_TYPES.ORGANIZATION ||
        node.type === ENTITY_TYPES.SOFTWARE
      ) {
        // Handle agents
        prov.agent[did] = {
          'prov:type': node.type,
          'rdfs:label': node.label || did
        };
      } else {
        // Handle entities (resources)
        prov.entity[did] = {
          'prov:type': node.type,
          'rdfs:label': node.label || did,
          'prov:generatedAtTime': node.created
        };
      }
    }
    
    // Add relationships
    for (const edge of this.edges) {
      // Map relationship types to PROV relationships
      switch (edge.type) {
        case RELATIONSHIP_TYPES.DERIVED_FROM:
        case RELATIONSHIP_TYPES.WAS_REVISION_OF:
        case RELATIONSHIP_TYPES.WAS_QUOTED_FROM:
        case RELATIONSHIP_TYPES.WAS_INFLUENCED_BY:
          // Entity -> Entity relationships
          if (!prov.entity[edge.to]) continue;
          
          if (!prov.entity[edge.to]['prov:wasDerivedFrom']) {
            prov.entity[edge.to]['prov:wasDerivedFrom'] = [];
          }
          prov.entity[edge.to]['prov:wasDerivedFrom'].push(edge.from);
          break;
          
        case RELATIONSHIP_TYPES.GENERATED_BY:
          // Entity -> Activity relationships
          if (!prov.entity[edge.from] || !prov.activity[edge.to]) continue;
          
          prov.entity[edge.from]['prov:wasGeneratedBy'] = edge.to;
          break;
          
        case RELATIONSHIP_TYPES.USED:
          // Activity -> Entity relationships
          if (!prov.activity[edge.from] || !prov.entity[edge.to]) continue;
          
          if (!prov.activity[edge.from]['prov:used']) {
            prov.activity[edge.from]['prov:used'] = [];
          }
          prov.activity[edge.from]['prov:used'].push(edge.to);
          break;
          
        case RELATIONSHIP_TYPES.ATTRIBUTED_TO:
          // Entity -> Agent relationships
          if (!prov.entity[edge.from] || !prov.agent[edge.to]) continue;
          
          prov.entity[edge.from]['prov:wasAttributedTo'] = edge.to;
          break;
          
        case RELATIONSHIP_TYPES.ASSOCIATED_WITH:
          // Activity -> Agent relationships
          if (!prov.activity[edge.from] || !prov.agent[edge.to]) continue;
          
          prov.activity[edge.from]['prov:wasAssociatedWith'] = edge.to;
          break;
          
        default:
          // Custom relationships outside PROV ontology
          const fromType = this.nodes.get(edge.from)?.type;
          const toType = this.nodes.get(edge.to)?.type;
          
          if (fromType === ENTITY_TYPES.RESOURCE || fromType === ENTITY_TYPES.MODEL) {
            if (!prov.entity[edge.from]) continue;
            
            const relationKey = `asset:${edge.type}`;
            if (!prov.entity[edge.from][relationKey]) {
              prov.entity[edge.from][relationKey] = [];
            }
            prov.entity[edge.from][relationKey].push(edge.to);
          }
      }
    }
    
    this.provData = prov;
    this.modified = false;
    return prov;
  }
  
  /**
   * Export graph to JSON format
   * 
   * @returns {Object} JSON representation of the graph
   */
  toJSON() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges
    };
  }
  
  /**
   * Import graph from JSON representation
   * 
   * @param {Object} json - JSON representation of a graph
   * @returns {ResourceGraph} The updated graph
   */
  static fromJSON(json) {
    const graph = new ResourceGraph();
    
    if (json.nodes) {
      for (const node of json.nodes) {
        graph.addNode(node.did, node);
      }
    }
    
    if (json.edges) {
      for (const edge of json.edges) {
        if (graph.nodes.has(edge.from) && graph.nodes.has(edge.to)) {
          graph.addEdge(edge.from, edge.to, edge.type, edge);
        }
      }
    }
    
    return graph;
  }
  
  /**
   * Import graph from W3C PROV representation
   * 
   * @param {Object} prov - W3C PROV representation
   * @returns {ResourceGraph} The created graph
   */
  static fromPROV(prov) {
    const graph = new ResourceGraph();
    
    // Import entities
    if (prov.entity) {
      for (const [did, entity] of Object.entries(prov.entity)) {
        const type = entity['prov:type'] || ENTITY_TYPES.RESOURCE;
        const label = entity['rdfs:label'] || did.split(':').pop();
        const created = entity['prov:generatedAtTime'] || new Date().toISOString();
        
        graph.addNode(did, { type, label, created });
      }
    }
    
    // Import activities
    if (prov.activity) {
      for (const [did, activity] of Object.entries(prov.activity)) {
        const label = activity['rdfs:label'] || did.split(':').pop();
        const created = activity['prov:startedAtTime'] || new Date().toISOString();
        const updated = activity['prov:endedAtTime'] || created;
        
        graph.addNode(did, { 
          type: ENTITY_TYPES.ACTIVITY, 
          label, 
          created, 
          updated, 
          startTime: activity['prov:startedAtTime'],
          endTime: activity['prov:endedAtTime']
        });
      }
    }
    
    // Import agents
    if (prov.agent) {
      for (const [did, agent] of Object.entries(prov.agent)) {
        const type = agent['prov:type'] || ENTITY_TYPES.AGENT;
        const label = agent['rdfs:label'] || did.split(':').pop();
        
        graph.addNode(did, { type, label });
      }
    }
    
    // Import relationships
    if (prov.entity) {
      for (const [did, entity] of Object.entries(prov.entity)) {
        // Entity -> Entity derivation
        if (entity['prov:wasDerivedFrom']) {
          const sources = Array.isArray(entity['prov:wasDerivedFrom']) 
            ? entity['prov:wasDerivedFrom'] 
            : [entity['prov:wasDerivedFrom']];
            
          for (const source of sources) {
            if (graph.nodes.has(source)) {
              graph.addEdge(source, did, RELATIONSHIP_TYPES.DERIVED_FROM);
            }
          }
        }
        
        // Entity -> Activity generation
        if (entity['prov:wasGeneratedBy'] && graph.nodes.has(entity['prov:wasGeneratedBy'])) {
          graph.addEdge(did, entity['prov:wasGeneratedBy'], RELATIONSHIP_TYPES.GENERATED_BY);
        }
        
        // Entity -> Agent attribution
        if (entity['prov:wasAttributedTo'] && graph.nodes.has(entity['prov:wasAttributedTo'])) {
          graph.addEdge(did, entity['prov:wasAttributedTo'], RELATIONSHIP_TYPES.ATTRIBUTED_TO);
        }
        
        // Custom relationships
        for (const [key, value] of Object.entries(entity)) {
          if (key.startsWith('asset:')) {
            const relationType = key.substring(6);  // Remove 'asset:' prefix
            
            const targets = Array.isArray(value) ? value : [value];
            for (const target of targets) {
              if (graph.nodes.has(target)) {
                graph.addEdge(did, target, relationType);
              }
            }
          }
        }
      }
    }
    
    if (prov.activity) {
      for (const [did, activity] of Object.entries(prov.activity)) {
        // Activity -> Entity usage
        if (activity['prov:used']) {
          const usedEntities = Array.isArray(activity['prov:used']) 
            ? activity['prov:used'] 
            : [activity['prov:used']];
            
          for (const entity of usedEntities) {
            if (graph.nodes.has(entity)) {
              graph.addEdge(did, entity, RELATIONSHIP_TYPES.USED);
            }
          }
        }
        
        // Activity -> Agent association
        if (activity['prov:wasAssociatedWith'] && graph.nodes.has(activity['prov:wasAssociatedWith'])) {
          graph.addEdge(did, activity['prov:wasAssociatedWith'], RELATIONSHIP_TYPES.ASSOCIATED_WITH);
        }
      }
    }
    
    return graph;
  }
  
  /**
   * Helper method for depth-first search to find paths
   * 
   * @param {string} current - Current node DID
   * @param {string} target - Target node DID
   * @param {Set} visited - Set of visited nodes
   * @param {Array} path - Current path
   * @param {Array} paths - Found paths
   * @param {number} depth - Maximum remaining depth
   * @param {Array} relationshipTypes - Filtered relationship types or null
   * @private
   */
  _dfs(current, target, visited, path, paths, depth, relationshipTypes) {
    if (depth < 0) {
      return;
    }
    
    visited.add(current);
    path.push(current);
    
    if (current === target) {
      // Found a path to target
      paths.push([...path]);
    } else {
      // Get all outgoing edges
      const edges = this.getEdges(current, 'outgoing');
      
      for (const edge of edges) {
        if (!visited.has(edge.to) && 
            (!relationshipTypes || relationshipTypes.includes(edge.type))) {
          this._dfs(edge.to, target, visited, path, paths, depth - 1, relationshipTypes);
        }
      }
    }
    
    // Backtrack
    path.pop();
    visited.delete(current);
  }
  
  /**
   * Helper method to find related resources
   * 
   * @param {string} did - DID of the resource
   * @param {string} direction - 'outgoing' or 'incoming'
   * @param {Array} relationshipTypes - Relationship types to consider
   * @param {Object} options - Query options
   * @returns {Array} List of related resources
   * @private
   */
  _findRelatedResources(did, direction, relationshipTypes, options = {}) {
    const maxDepth = options.maxDepth || 1;
    const transitive = options.transitive || false;
    
    if (!this.nodes.has(did)) {
      return [];
    }
    
    if (maxDepth <= 0) {
      return [];
    }
    
    // Get direct connections
    const edges = direction === 'outgoing' ? 
      this.edges.filter(edge => edge.from === did && relationshipTypes.includes(edge.type)) :
      this.edges.filter(edge => edge.to === did && relationshipTypes.includes(edge.type));
    
    const relatedDIDs = direction === 'outgoing' ? 
      edges.map(edge => edge.to) : 
      edges.map(edge => edge.from);
    
    const result = relatedDIDs.map(relatedDID => {
      const node = this.getNode(relatedDID);
      const relationship = edges.find(e => 
        direction === 'outgoing' ? e.to === relatedDID : e.from === relatedDID
      );
      
      return {
        did: relatedDID,
        node,
        relationship: {
          type: relationship.type,
          metadata: { ...relationship }
        }
      };
    });
    
    // Handle transitive relationships if requested
    if (transitive && maxDepth > 1) {
      const transitiveResults = [];
      
      for (const relatedDID of relatedDIDs) {
        const deeperRelated = this._findRelatedResources(
          relatedDID, 
          direction, 
          relationshipTypes, 
          { maxDepth: maxDepth - 1, transitive }
        );
        
        transitiveResults.push(...deeperRelated);
      }
      
      // Add unique transitive results
      for (const transitiveResult of transitiveResults) {
        if (!result.some(r => r.did === transitiveResult.did)) {
          result.push({
            ...transitiveResult,
            transitive: true
          });
        }
      }
    }
    
    return result;
  }
}

module.exports = {
  ResourceGraph,
  RELATIONSHIP_TYPES,
  ENTITY_TYPES
};
