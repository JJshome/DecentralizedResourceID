/**
 * Hierarchical Metadata Manager
 * 
 * This module implements a hierarchical metadata framework that integrates various
 * standards including DID, C2PA, Model Cards, W3C PROV, and MPEG-21 REL.
 * It provides a layered approach to metadata management for digital resources.
 * 
 * Layers:
 * 1. Identification (DID)
 * 2. Provenance & Integrity (C2PA)
 * 3. Resource-specific Characteristics (Model Cards, Data Sheets)
 * 4. Lineage Graph (W3C PROV)
 * 5. Rights Management (MPEG-21 REL)
 */

/**
 * Standards and formats supported in the metadata hierarchy
 */
const METADATA_STANDARDS = {
  DID: 'did',             // W3C Decentralized Identifiers
  C2PA: 'c2pa',           // Coalition for Content Provenance and Authenticity
  MODEL_CARD: 'modelCard', // Model Cards
  DATA_SHEET: 'dataSheet', // Open Data Sheets
  PROV: 'prov',           // W3C PROV
  MPEG21_REL: 'mpeg21Rel', // MPEG-21 Rights Expression Language
  SCHEMA_ORG: 'schemaOrg', // Schema.org
  GENERAL: 'general'      // General purpose metadata
};

/**
 * Formats for metadata serialization
 */
const SERIALIZATION_FORMATS = {
  JSON_LD: 'jsonld',      // JSON-LD
  CBOR: 'cbor',           // Concise Binary Object Representation
  TLV: 'tlv',             // Type-Length-Value
  JSON: 'json',           // Plain JSON
  XML: 'xml'              // XML
};

/**
 * Base class for metadata layers
 */
class MetadataLayer {
  /**
   * Create a metadata layer
   * @param {string} type - Layer type from METADATA_STANDARDS
   * @param {Object} data - Layer data
   */
  constructor(type, data = {}) {
    this.type = type;
    this.data = data;
    this.updated = new Date();
  }

  /**
   * Update layer data
   * @param {Object} updates - Data updates
   * @returns {MetadataLayer} This layer instance
   */
  update(updates) {
    this.data = {
      ...this.data,
      ...updates
    };
    this.updated = new Date();
    return this;
  }

  /**
   * Get a specific field value
   * @param {string} field - Field path (dot notation supported)
   * @param {*} defaultValue - Default value if field not found
   * @returns {*} Field value
   */
  get(field, defaultValue = null) {
    const parts = field.split('.');
    let value = this.data;
    
    for (const part of parts) {
      if (value === null || value === undefined || typeof value !== 'object') {
        return defaultValue;
      }
      value = value[part];
    }
    
    return value !== undefined ? value : defaultValue;
  }

  /**
   * Set a specific field value
   * @param {string} field - Field path (dot notation supported)
   * @param {*} value - Field value
   * @returns {MetadataLayer} This layer instance
   */
  set(field, value) {
    const parts = field.split('.');
    const lastPart = parts.pop();
    
    let current = this.data;
    for (const part of parts) {
      if (current[part] === undefined || current[part] === null || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[lastPart] = value;
    this.updated = new Date();
    return this;
  }

  /**
   * Get layer data
   * @returns {Object} Layer data
   */
  getData() {
    return { ...this.data };
  }

  /**
   * Validate layer data (to be implemented by subclasses)
   * @returns {boolean} True if valid
   */
  validate() {
    return true;
  }

  /**
   * Serialize layer to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      type: this.type,
      data: this.data,
      updated: this.updated.toISOString()
    };
  }
}

/**
 * Identification layer based on W3C DID
 */
class IdentificationLayer extends MetadataLayer {
  /**
   * Create an identification layer
   * @param {Object} data - DID and related data
   */
  constructor(data = {}) {
    super(METADATA_STANDARDS.DID, data);
  }

  /**
   * Validate DID data
   * @returns {boolean} True if valid
   */
  validate() {
    // Check if DID is present and follows the correct format
    const did = this.get('id');
    if (!did || typeof did !== 'string' || !did.startsWith('did:')) {
      return false;
    }
    
    // Validate required DID Document fields
    if (!this.get('controller')) {
      return false;
    }
    
    return true;
  }

  /**
   * Convert to a standard DID Document
   * @returns {Object} DID Document
   */
  toDIDDocument() {
    return {
      '@context': ['https://www.w3.org/ns/did/v1', ...this.get('context', [])],
      'id': this.get('id'),
      'controller': this.get('controller'),
      'verificationMethod': this.get('verificationMethod', []),
      'authentication': this.get('authentication', []),
      'service': this.get('service', []),
      'created': this.get('created'),
      'updated': this.get('updated', this.updated.toISOString())
    };
  }
}

/**
 * Provenance and integrity layer based on C2PA
 */
class ProvenanceLayer extends MetadataLayer {
  /**
   * Create a provenance layer
   * @param {Object} data - C2PA manifest data
   */
  constructor(data = {}) {
    super(METADATA_STANDARDS.C2PA, data);
  }

  /**
   * Validate C2PA data
   * @returns {boolean} True if valid
   */
  validate() {
    // Check if claim is present
    if (!this.get('claim')) {
      return false;
    }
    
    // Validate signature if present
    const signature = this.get('signature');
    if (signature && !signature.value) {
      return false;
    }
    
    return true;
  }

  /**
   * Get the C2PA manifest
   * @returns {Object} C2PA manifest
   */
  toC2PAManifest() {
    return {
      ...this.data
    };
  }

  /**
   * Add an assertion to the C2PA manifest
   * @param {string} assertionType - Type of assertion
   * @param {Object} assertionData - Assertion data
   * @returns {ProvenanceLayer} This layer instance
   */
  addAssertion(assertionType, assertionData) {
    const assertions = this.get('claim.assertions', []);
    
    assertions.push({
      '@type': assertionType,
      ...assertionData
    });
    
    this.set('claim.assertions', assertions);
    return this;
  }

  /**
   * Add AI-specific assertions
   * @param {Object} aiData - AI-related data
   * @returns {ProvenanceLayer} This layer instance
   */
  addAIAssertions(aiData) {
    // Add AI training assertion
    if (aiData.trainingDataset) {
      this.addAssertion('AITrainingAssertion', {
        'dataset': aiData.trainingDataset,
        'modelArchitecture': aiData.modelArchitecture,
        'trainingDate': aiData.trainingDate
      });
    }
    
    // Add AI generation assertion
    if (aiData.generatedContent) {
      this.addAssertion('AIGenerationAssertion', {
        'modelId': aiData.modelId,
        'modelVersion': aiData.modelVersion,
        'generationParameters': aiData.generationParameters
      });
    }
    
    return this;
  }
}

/**
 * Resource characteristics layer
 */
class CharacteristicsLayer extends MetadataLayer {
  /**
   * Create a characteristics layer
   * @param {string} resourceType - Type of resource
   * @param {Object} data - Resource characteristic data
   */
  constructor(resourceType, data = {}) {
    // Determine the appropriate metadata standard based on resource type
    let standard;
    switch (resourceType) {
      case 'ai-model':
        standard = METADATA_STANDARDS.MODEL_CARD;
        break;
      case 'dataset':
        standard = METADATA_STANDARDS.DATA_SHEET;
        break;
      default:
        standard = METADATA_STANDARDS.GENERAL;
    }
    
    super(standard, {
      resourceType,
      ...data
    });
  }

  /**
   * Validate resource characteristics data
   * @returns {boolean} True if valid
   */
  validate() {
    // Basic validation based on resource type
    const resourceType = this.get('resourceType');
    
    if (!resourceType) {
      return false;
    }
    
    switch (this.type) {
      case METADATA_STANDARDS.MODEL_CARD:
        // Check for required model card fields
        return !!this.get('modelName') && !!this.get('modelDescription');
        
      case METADATA_STANDARDS.DATA_SHEET:
        // Check for required data sheet fields
        return !!this.get('datasetName') && !!this.get('datasetDescription');
        
      default:
        return true;
    }
  }

  /**
   * Convert to schema.org compatible JSON-LD
   * @returns {Object} Schema.org JSON-LD
   */
  toSchemaOrgJSONLD() {
    let schemaType;
    let additionalProperties = {};
    
    switch (this.type) {
      case METADATA_STANDARDS.MODEL_CARD:
        schemaType = 'SoftwareApplication';
        additionalProperties = {
          'applicationCategory': 'AI Model',
          'softwareVersion': this.get('modelVersion'),
          'operatingSystem': this.get('executionEnvironment')
        };
        break;
        
      case METADATA_STANDARDS.DATA_SHEET:
        schemaType = 'Dataset';
        additionalProperties = {
          'variableMeasured': this.get('variables', []),
          'distribution': {
            '@type': 'DataDownload',
            'contentUrl': this.get('downloadUrl')
          }
        };
        break;
        
      default:
        schemaType = 'CreativeWork';
    }
    
    return {
      '@context': 'https://schema.org/',
      '@type': schemaType,
      'name': this.get('modelName') || this.get('datasetName') || this.get('name'),
      'description': this.get('modelDescription') || this.get('datasetDescription') || this.get('description'),
      ...additionalProperties
    };
  }
}

/**
 * Lineage graph layer based on W3C PROV
 */
class LineageLayer extends MetadataLayer {
  /**
   * Create a lineage layer
   * @param {Object} data - W3C PROV data
   */
  constructor(data = {}) {
    super(METADATA_STANDARDS.PROV, data);
  }

  /**
   * Validate PROV data
   * @returns {boolean} True if valid
   */
  validate() {
    // Check for basic PROV elements
    if (!this.get('agent') && !this.get('entity') && !this.get('activity')) {
      return false;
    }
    
    return true;
  }

  /**
   * Convert to W3C PROV-JSON format
   * @returns {Object} PROV-JSON
   */
  toPROVJSON() {
    return {
      'prefix': this.get('prefix', {}),
      'entity': this.get('entity', {}),
      'activity': this.get('activity', {}),
      'agent': this.get('agent', {}),
      'wasGeneratedBy': this.get('wasGeneratedBy', {}),
      'used': this.get('used', {}),
      'wasAttributedTo': this.get('wasAttributedTo', {}),
      'wasDerivedFrom': this.get('wasDerivedFrom', {}),
      'wasAssociatedWith': this.get('wasAssociatedWith', {})
    };
  }

  /**
   * Add an entity to the PROV graph
   * @param {string} id - Entity ID
   * @param {Object} attributes - Entity attributes
   * @returns {LineageLayer} This layer instance
   */
  addEntity(id, attributes = {}) {
    const entities = this.get('entity', {});
    entities[id] = attributes;
    this.set('entity', entities);
    return this;
  }

  /**
   * Add an activity to the PROV graph
   * @param {string} id - Activity ID
   * @param {Object} attributes - Activity attributes
   * @returns {LineageLayer} This layer instance
   */
  addActivity(id, attributes = {}) {
    const activities = this.get('activity', {});
    activities[id] = attributes;
    this.set('activity', activities);
    return this;
  }

  /**
   * Add an agent to the PROV graph
   * @param {string} id - Agent ID
   * @param {Object} attributes - Agent attributes
   * @returns {LineageLayer} This layer instance
   */
  addAgent(id, attributes = {}) {
    const agents = this.get('agent', {});
    agents[id] = attributes;
    this.set('agent', agents);
    return this;
  }

  /**
   * Add a 'wasGeneratedBy' relation
   * @param {string} entity - Entity ID
   * @param {string} activity - Activity ID
   * @returns {LineageLayer} This layer instance
   */
  addGeneration(entity, activity) {
    const generations = this.get('wasGeneratedBy', {});
    const id = `gen_${entity}_${activity}`;
    generations[id] = {
      'entity': entity,
      'activity': activity
    };
    this.set('wasGeneratedBy', generations);
    return this;
  }

  /**
   * Add a 'used' relation
   * @param {string} activity - Activity ID
   * @param {string} entity - Entity ID
   * @returns {LineageLayer} This layer instance
   */
  addUsage(activity, entity) {
    const usages = this.get('used', {});
    const id = `use_${activity}_${entity}`;
    usages[id] = {
      'activity': activity,
      'entity': entity
    };
    this.set('used', usages);
    return this;
  }

  /**
   * Add a 'wasDerivedFrom' relation
   * @param {string} derived - Derived entity ID
   * @param {string} source - Source entity ID
   * @returns {LineageLayer} This layer instance
   */
  addDerivation(derived, source) {
    const derivations = this.get('wasDerivedFrom', {});
    const id = `der_${derived}_${source}`;
    derivations[id] = {
      'generatedEntity': derived,
      'usedEntity': source
    };
    this.set('wasDerivedFrom', derivations);
    return this;
  }
}

/**
 * Rights management layer based on MPEG-21 REL
 */
class RightsLayer extends MetadataLayer {
  /**
   * Create a rights layer
   * @param {Object} data - Rights data
   */
  constructor(data = {}) {
    super(METADATA_STANDARDS.MPEG21_REL, data);
  }

  /**
   * Validate rights data
   * @returns {boolean} True if valid
   */
  validate() {
    // Check for license information
    if (!this.get('license')) {
      return false;
    }
    
    return true;
  }

  /**
   * Add a permission to the rights layer
   * @param {string} action - Permitted action
   * @param {Object} conditions - Conditions for the permission
   * @returns {RightsLayer} This layer instance
   */
  addPermission(action, conditions = {}) {
    const permissions = this.get('permissions', []);
    
    permissions.push({
      'action': action,
      'conditions': conditions
    });
    
    this.set('permissions', permissions);
    return this;
  }

  /**
   * Add a prohibition to the rights layer
   * @param {string} action - Prohibited action
   * @param {Object} conditions - Conditions for the prohibition
   * @returns {RightsLayer} This layer instance
   */
  addProhibition(action, conditions = {}) {
    const prohibitions = this.get('prohibitions', []);
    
    prohibitions.push({
      'action': action,
      'conditions': conditions
    });
    
    this.set('prohibitions', prohibitions);
    return this;
  }

  /**
   * Add an obligation to the rights layer
   * @param {string} action - Obligated action
   * @param {Object} conditions - Conditions for the obligation
   * @returns {RightsLayer} This layer instance
   */
  addObligation(action, conditions = {}) {
    const obligations = this.get('obligations', []);
    
    obligations.push({
      'action': action,
      'conditions': conditions
    });
    
    this.set('obligations', obligations);
    return this;
  }

  /**
   * Set the license information
   * @param {string} licenseType - Type of license
   * @param {string} licenseUrl - URL to license text
   * @param {string} licenseText - Full license text
   * @returns {RightsLayer} This layer instance
   */
  setLicense(licenseType, licenseUrl, licenseText = '') {
    this.set('license', {
      'type': licenseType,
      'url': licenseUrl,
      'text': licenseText
    });
    return this;
  }

  /**
   * Convert to ODRL JSON-LD
   * @returns {Object} ODRL JSON-LD
   */
  toODRLJSONLD() {
    return {
      '@context': 'https://www.w3.org/ns/odrl.jsonld',
      '@type': 'Policy',
      'uid': this.get('uid', 'urn:policy:' + new Date().getTime()),
      'profile': 'http://example.com/odrl:profile:asset',
      'permission': this.get('permissions', []).map(p => ({
        '@type': 'Permission',
        'action': p.action,
        'constraint': Object.entries(p.conditions).map(([name, value]) => ({
          '@type': 'Constraint',
          'leftOperand': name,
          'operator': 'eq',
          'rightOperand': value
        }))
      })),
      'prohibition': this.get('prohibitions', []).map(p => ({
        '@type': 'Prohibition',
        'action': p.action,
        'constraint': Object.entries(p.conditions).map(([name, value]) => ({
          '@type': 'Constraint',
          'leftOperand': name,
          'operator': 'eq',
          'rightOperand': value
        }))
      })),
      'obligation': this.get('obligations', []).map(o => ({
        '@type': 'Duty',
        'action': o.action,
        'constraint': Object.entries(o.conditions).map(([name, value]) => ({
          '@type': 'Constraint',
          'leftOperand': name,
          'operator': 'eq',
          'rightOperand': value
        }))
      }))
    };
  }
}

/**
 * Main hierarchical metadata manager class
 */
class HierarchicalMetadataManager {
  /**
   * Initialize the hierarchical metadata manager
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      defaultFormat: SERIALIZATION_FORMATS.JSON_LD,
      ...options
    };
    
    // Initialize metadata layers
    this.layers = {
      [METADATA_STANDARDS.DID]: null,
      [METADATA_STANDARDS.C2PA]: null,
      [METADATA_STANDARDS.MODEL_CARD]: null,
      [METADATA_STANDARDS.DATA_SHEET]: null,
      [METADATA_STANDARDS.PROV]: null,
      [METADATA_STANDARDS.MPEG21_REL]: null,
      [METADATA_STANDARDS.GENERAL]: null
    };
  }

  /**
   * Set the identification layer
   * @param {Object} didData - DID document data
   * @returns {HierarchicalMetadataManager} This manager instance
   */
  setIdentificationLayer(didData) {
    this.layers[METADATA_STANDARDS.DID] = new IdentificationLayer(didData);
    return this;
  }

  /**
   * Get the identification layer
   * @returns {IdentificationLayer} The identification layer
   */
  getIdentificationLayer() {
    return this.layers[METADATA_STANDARDS.DID];
  }

  /**
   * Set the provenance layer
   * @param {Object} provenanceData - C2PA manifest data
   * @returns {HierarchicalMetadataManager} This manager instance
   */
  setProvenanceLayer(provenanceData) {
    this.layers[METADATA_STANDARDS.C2PA] = new ProvenanceLayer(provenanceData);
    return this;
  }

  /**
   * Get the provenance layer
   * @returns {ProvenanceLayer} The provenance layer
   */
  getProvenanceLayer() {
    return this.layers[METADATA_STANDARDS.C2PA];
  }

  /**
   * Set the characteristics layer
   * @param {string} resourceType - Type of resource
   * @param {Object} characteristicsData - Resource characteristic data
   * @returns {HierarchicalMetadataManager} This manager instance
   */
  setCharacteristicsLayer(resourceType, characteristicsData) {
    const layer = new CharacteristicsLayer(resourceType, characteristicsData);
    
    // Store in the appropriate layer based on resource type
    switch (resourceType) {
      case 'ai-model':
        this.layers[METADATA_STANDARDS.MODEL_CARD] = layer;
        break;
      case 'dataset':
        this.layers[METADATA_STANDARDS.DATA_SHEET] = layer;
        break;
      default:
        this.layers[METADATA_STANDARDS.GENERAL] = layer;
    }
    
    return this;
  }

  /**
   * Get the characteristics layer
   * @param {string} resourceType - Type of resource
   * @returns {CharacteristicsLayer} The characteristics layer
   */
  getCharacteristicsLayer(resourceType) {
    switch (resourceType) {
      case 'ai-model':
        return this.layers[METADATA_STANDARDS.MODEL_CARD];
      case 'dataset':
        return this.layers[METADATA_STANDARDS.DATA_SHEET];
      default:
        return this.layers[METADATA_STANDARDS.GENERAL];
    }
  }

  /**
   * Set the lineage layer
   * @param {Object} lineageData - W3C PROV data
   * @returns {HierarchicalMetadataManager} This manager instance
   */
  setLineageLayer(lineageData) {
    this.layers[METADATA_STANDARDS.PROV] = new LineageLayer(lineageData);
    return this;
  }

  /**
   * Get the lineage layer
   * @returns {LineageLayer} The lineage layer
   */
  getLineageLayer() {
    return this.layers[METADATA_STANDARDS.PROV];
  }

  /**
   * Set the rights layer
   * @param {Object} rightsData - Rights data
   * @returns {HierarchicalMetadataManager} This manager instance
   */
  setRightsLayer(rightsData) {
    this.layers[METADATA_STANDARDS.MPEG21_REL] = new RightsLayer(rightsData);
    return this;
  }

  /**
   * Get the rights layer
   * @returns {RightsLayer} The rights layer
   */
  getRightsLayer() {
    return this.layers[METADATA_STANDARDS.MPEG21_REL];
  }

  /**
   * Validate all metadata layers
   * @returns {Object} Validation results for each layer
   */
  validateAll() {
    const results = {};
    
    for (const [standard, layer] of Object.entries(this.layers)) {
      if (layer) {
        results[standard] = layer.validate();
      }
    }
    
    return results;
  }

  /**
   * Generate a complete integrated metadata representation
   * @param {string} format - Serialization format (from SERIALIZATION_FORMATS)
   * @returns {Object|string} Integrated metadata in the specified format
   */
  generateIntegratedMetadata(format = this.options.defaultFormat) {
    // Base integrated metadata
    const integrated = {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://schema.org/',
        'https://www.w3.org/ns/prov#',
        'https://www.w3.org/ns/odrl.jsonld'
      ]
    };
    
    // Add identification layer (DID)
    const idLayer = this.getIdentificationLayer();
    if (idLayer) {
      Object.assign(integrated, idLayer.toDIDDocument());
    }
    
    // Add provenance layer (C2PA)
    const provLayer = this.getProvenanceLayer();
    if (provLayer) {
      integrated.provenance = provLayer.toC2PAManifest();
    }
    
    // Add characteristics layer (Model Card, Data Sheet, or General)
    // Determine which characteristics layer to use
    let charLayer = null;
    if (this.layers[METADATA_STANDARDS.MODEL_CARD]) {
      charLayer = this.layers[METADATA_STANDARDS.MODEL_CARD];
      integrated.modelCard = charLayer.getData();
    } else if (this.layers[METADATA_STANDARDS.DATA_SHEET]) {
      charLayer = this.layers[METADATA_STANDARDS.DATA_SHEET];
      integrated.dataSheet = charLayer.getData();
    } else if (this.layers[METADATA_STANDARDS.GENERAL]) {
      charLayer = this.layers[METADATA_STANDARDS.GENERAL];
      integrated.characteristics = charLayer.getData();
    }
    
    // Add schema.org representation if available
    if (charLayer) {
      integrated.schemaOrg = charLayer.toSchemaOrgJSONLD();
    }
    
    // Add lineage layer (PROV)
    const lineageLayer = this.getLineageLayer();
    if (lineageLayer) {
      integrated.provenance = integrated.provenance || {};
      integrated.provenance.lineage = lineageLayer.toPROVJSON();
    }
    
    // Add rights layer (MPEG-21 REL)
    const rightsLayer = this.getRightsLayer();
    if (rightsLayer) {
      integrated.rights = rightsLayer.getData();
      integrated.odrl = rightsLayer.toODRLJSONLD();
    }
    
    // Serialize in the requested format
    return this._serialize(integrated, format);
  }

  /**
   * Serialize metadata in the specified format
   * @param {Object} metadata - Metadata to serialize
   * @param {string} format - Serialization format
   * @returns {Object|string} Serialized metadata
   * @private
   */
  _serialize(metadata, format) {
    switch (format) {
      case SERIALIZATION_FORMATS.JSON_LD:
        // Return JSON-LD representation
        return metadata;
        
      case SERIALIZATION_FORMATS.JSON:
        // Return plain JSON representation
        return JSON.parse(JSON.stringify(metadata));
        
      case SERIALIZATION_FORMATS.CBOR:
        // CBOR serialization would require a CBOR library
        throw new Error('CBOR serialization not implemented');
        
      case SERIALIZATION_FORMATS.TLV:
        // TLV serialization would require a custom implementation
        throw new Error('TLV serialization not implemented');
        
      case SERIALIZATION_FORMATS.XML:
        // XML serialization would require an XML library
        throw new Error('XML serialization not implemented');
        
      default:
        throw new Error(`Unsupported serialization format: ${format}`);
    }
  }

  /**
   * Create a selective metadata view with only specified layers
   * @param {string[]} layers - Array of layer types to include (from METADATA_STANDARDS)
   * @param {string} format - Serialization format
   * @returns {Object|string} Selected metadata in the specified format
   */
  createSelectiveView(layers, format = this.options.defaultFormat) {
    // Base for selective view
    const selective = {
      '@context': [
        'https://www.w3.org/ns/did/v1'
      ]
    };
    
    // Identification layer is always included for reference
    const idLayer = this.getIdentificationLayer();
    if (idLayer) {
      selective.id = idLayer.get('id');
    }
    
    // Add requested layers
    for (const layer of layers) {
      if (!this.layers[layer]) {
        continue;
      }
      
      switch (layer) {
        case METADATA_STANDARDS.DID:
          Object.assign(selective, this.layers[layer].toDIDDocument());
          break;
          
        case METADATA_STANDARDS.C2PA:
          selective.provenance = this.layers[layer].toC2PAManifest();
          break;
          
        case METADATA_STANDARDS.MODEL_CARD:
          selective.modelCard = this.layers[layer].getData();
          break;
          
        case METADATA_STANDARDS.DATA_SHEET:
          selective.dataSheet = this.layers[layer].getData();
          break;
          
        case METADATA_STANDARDS.PROV:
          selective.lineage = this.layers[layer].toPROVJSON();
          break;
          
        case METADATA_STANDARDS.MPEG21_REL:
          selective.rights = this.layers[layer].getData();
          break;
          
        case METADATA_STANDARDS.GENERAL:
          selective.characteristics = this.layers[layer].getData();
          break;
      }
    }
    
    // Serialize in the requested format
    return this._serialize(selective, format);
  }

  /**
   * Export to JSON
   * @returns {Object} JSON representation of all metadata layers
   */
  toJSON() {
    const result = {};
    
    for (const [standard, layer] of Object.entries(this.layers)) {
      if (layer) {
        result[standard] = layer.toJSON();
      }
    }
    
    return result;
  }

  /**
   * Import from JSON
   * @param {Object} json - JSON representation of metadata layers
   * @returns {HierarchicalMetadataManager} This manager instance
   */
  fromJSON(json) {
    // Clear existing layers
    for (const standard of Object.keys(this.layers)) {
      this.layers[standard] = null;
    }
    
    // Import layers from JSON
    for (const [standard, layerData] of Object.entries(json)) {
      if (!layerData) continue;
      
      switch (standard) {
        case METADATA_STANDARDS.DID:
          this.setIdentificationLayer(layerData.data);
          break;
          
        case METADATA_STANDARDS.C2PA:
          this.setProvenanceLayer(layerData.data);
          break;
          
        case METADATA_STANDARDS.MODEL_CARD:
          this.setCharacteristicsLayer('ai-model', layerData.data);
          break;
          
        case METADATA_STANDARDS.DATA_SHEET:
          this.setCharacteristicsLayer('dataset', layerData.data);
          break;
          
        case METADATA_STANDARDS.PROV:
          this.setLineageLayer(layerData.data);
          break;
          
        case METADATA_STANDARDS.MPEG21_REL:
          this.setRightsLayer(layerData.data);
          break;
          
        case METADATA_STANDARDS.GENERAL:
          this.setCharacteristicsLayer('general', layerData.data);
          break;
      }
    }
    
    return this;
  }
}

module.exports = {
  HierarchicalMetadataManager,
  IdentificationLayer,
  ProvenanceLayer,
  CharacteristicsLayer,
  LineageLayer,
  RightsLayer,
  METADATA_STANDARDS,
  SERIALIZATION_FORMATS
};
