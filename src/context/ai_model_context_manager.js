/**
 * AI Model Context Manager
 * 
 * This module provides comprehensive context management for AI models, integrating
 * both static metadata (model cards) and dynamic interaction specifications (MCP).
 * It serves as a unified interface for managing the complete context information
 * needed for AI model identification, understanding, and interaction.
 * 
 * Features:
 * - Integration of model cards for static model properties
 * - MCP-compatible interface specifications for dynamic interactions
 * - Comprehensive model context including basic info, training data, performance metrics
 * - Usage restrictions and ethical considerations
 * - Dynamic interaction context with host/client interfaces
 */

/**
 * Default schema for model cards, based on industry standards
 */
const DEFAULT_MODEL_CARD_SCHEMA = {
  modelBasicInfo: {
    name: { type: 'string', required: true },
    description: { type: 'string', required: true },
    modelType: { type: 'string', required: true },
    architecture: { type: 'string', required: false },
    version: { type: 'string', required: true },
    releaseDate: { type: 'string', format: 'date', required: false },
    license: { type: 'string', required: false },
    repository: { type: 'string', format: 'url', required: false },
    contactInfo: { type: 'string', required: false },
    paperLink: { type: 'string', format: 'url', required: false },
    citationInfo: { type: 'string', required: false },
  },
  trainingDataInfo: {
    datasetName: { type: 'string', required: false },
    datasetDid: { type: 'string', required: false },
    datasetDescription: { type: 'string', required: false },
    datasetSize: { type: 'string', required: false },
    datasetDistribution: { type: 'object', required: false },
    datasetLicense: { type: 'string', required: false },
    dataExclusionCriteria: { type: 'string', required: false },
    dataOptOutInfo: { type: 'string', required: false },
    dataPrepProcessing: { type: 'string', required: false },
    dataAnnotationProcess: { type: 'string', required: false }
  },
  performanceInfo: {
    metrics: { type: 'array', items: { type: 'object' }, required: false },
    evaluationDatasets: { type: 'array', items: { type: 'object' }, required: false },
    quantitativeAnalyses: { type: 'array', items: { type: 'object' }, required: false },
    performanceVisualization: { type: 'array', items: { type: 'string' }, required: false },
    decisionThresholds: { type: 'object', required: false },
    varianceAnalysis: { type: 'string', required: false },
    confidenceIntervals: { type: 'object', required: false }
  },
  usageLimitations: {
    intendedUses: { type: 'array', items: { type: 'string' }, required: false },
    outOfScopeUses: { type: 'array', items: { type: 'string' }, required: false },
    technicalLimitations: { type: 'array', items: { type: 'string' }, required: false },
    safetyConsiderations: { type: 'array', items: { type: 'string' }, required: false },
    minimumHardwareRequirements: { type: 'object', required: false }
  },
  ethicalConsiderations: {
    biasAnalysis: { type: 'string', required: false },
    biasMetrics: { type: 'array', items: { type: 'object' }, required: false },
    fairnessAssessment: { type: 'string', required: false },
    securityConsiderations: { type: 'string', required: false },
    privacyConsiderations: { type: 'string', required: false },
    socialImpact: { type: 'string', required: false },
    environmentalImpact: { type: 'string', required: false }
  },
  caveatsAndRecommendations: {
    knownIssues: { type: 'array', items: { type: 'string' }, required: false },
    recommendedMitigations: { type: 'array', items: { type: 'string' }, required: false },
    userFeedbackChannels: { type: 'string', required: false },
    monitoringApproach: { type: 'string', required: false }
  }
};

/**
 * Default schema for MCP host interfaces
 */
const DEFAULT_MCP_HOST_INTERFACE_SCHEMA = {
  interfaceVersion: { type: 'string', required: true },
  supportedOperations: { type: 'array', items: { type: 'string' }, required: true },
  authenticationMethods: { type: 'array', items: { type: 'string' }, required: false },
  inputSchema: { type: 'object', required: true },
  outputSchema: { type: 'object', required: true },
  contextRequirements: { type: 'object', required: false },
  errorSchemas: { type: 'object', required: false },
  healthcheckEndpoint: { type: 'string', required: false }
};

/**
 * Default schema for MCP client interfaces
 */
const DEFAULT_MCP_CLIENT_INTERFACE_SCHEMA = {
  interfaceVersion: { type: 'string', required: true },
  requiredOperations: { type: 'array', items: { type: 'string' }, required: true },
  preferredAuthMethod: { type: 'string', required: false },
  inputFormatters: { type: 'object', required: false },
  outputHandlers: { type: 'object', required: false },
  contextProviders: { type: 'array', items: { type: 'string' }, required: false },
  errorHandlers: { type: 'object', required: false }
};

/**
 * Default schema for MCP primitives definition
 */
const DEFAULT_MCP_PRIMITIVES_SCHEMA = {
  tools: { type: 'array', items: { type: 'object' }, required: false },
  resources: { type: 'array', items: { type: 'object' }, required: false },
  prompts: { type: 'array', items: { type: 'object' }, required: false },
  functions: { type: 'array', items: { type: 'object' }, required: false },
  schemas: { type: 'object', required: false }
};

/**
 * Validates an object against a schema
 * @param {Object} obj - Object to validate
 * @param {Object} schema - Schema to validate against
 * @returns {Object} Validation result
 * @private
 */
function _validateObject(obj, schema) {
  const errors = [];
  const validated = {};
  
  for (const [field, config] of Object.entries(schema)) {
    // Check required fields
    if (config.required && (obj[field] === undefined || obj[field] === null)) {
      errors.push(`Required field '${field}' is missing`);
      continue;
    }
    
    // Skip undefined optional fields
    if (obj[field] === undefined) {
      continue;
    }
    
    // Type checking
    if (config.type && typeof obj[field] !== config.type) {
      if (!(config.type === 'array' && Array.isArray(obj[field]))) {
        errors.push(`Field '${field}' should be of type ${config.type}`);
        continue;
      }
    }
    
    // Format validation (basic)
    if (config.format === 'url' && typeof obj[field] === 'string') {
      try {
        new URL(obj[field]);
      } catch (e) {
        errors.push(`Field '${field}' should be a valid URL`);
        continue;
      }
    }
    
    if (config.format === 'date' && typeof obj[field] === 'string') {
      const date = new Date(obj[field]);
      if (isNaN(date.getTime())) {
        errors.push(`Field '${field}' should be a valid date`);
        continue;
      }
    }
    
    // Array items validation
    if (config.type === 'array' && Array.isArray(obj[field]) && config.items) {
      const itemType = config.items.type;
      for (let i = 0; i < obj[field].length; i++) {
        const item = obj[field][i];
        if (typeof item !== itemType) {
          errors.push(`Item ${i} in field '${field}' should be of type ${itemType}`);
        }
      }
    }
    
    // Add to validated object
    validated[field] = obj[field];
  }
  
  return { validated, errors, isValid: errors.length === 0 };
}

/**
 * Class for managing AI model cards (static metadata)
 */
class ModelCard {
  /**
   * Create a model card
   * @param {Object} data - Model card data
   * @param {Object} schema - Optional custom schema
   */
  constructor(data = {}, schema = DEFAULT_MODEL_CARD_SCHEMA) {
    this.schema = schema;
    this.data = this._initializeData(data);
    this.errors = {};
    this.validate();
  }

  /**
   * Initialize data with schema structure
   * @param {Object} data - Initial data
   * @returns {Object} Structured data
   * @private
   */
  _initializeData(data) {
    const result = {};
    
    for (const section of Object.keys(this.schema)) {
      result[section] = data[section] || {};
    }
    
    return result;
  }

  /**
   * Validate the model card data against the schema
   * @returns {boolean} True if valid
   */
  validate() {
    this.errors = {};
    let isValid = true;
    
    for (const [section, sectionSchema] of Object.entries(this.schema)) {
      const { validated, errors, isValid: sectionValid } = _validateObject(
        this.data[section] || {},
        sectionSchema
      );
      
      if (!sectionValid) {
        this.errors[section] = errors;
        isValid = false;
      }
      
      // Update with validated data
      this.data[section] = validated;
    }
    
    return isValid;
  }

  /**
   * Update a section of the model card
   * @param {string} section - Section name
   * @param {Object} data - New section data
   * @returns {boolean} True if update was valid
   */
  updateSection(section, data) {
    if (!this.schema[section]) {
      throw new Error(`Invalid section: ${section}`);
    }
    
    const { validated, errors, isValid } = _validateObject(
      data,
      this.schema[section]
    );
    
    if (!isValid) {
      this.errors[section] = errors;
      return false;
    }
    
    this.data[section] = {
      ...this.data[section],
      ...validated
    };
    
    return true;
  }

  /**
   * Get model card data
   * @returns {Object} Model card data
   */
  getData() {
    return { ...this.data };
  }

  /**
   * Convert to JSON-LD
   * @returns {Object} JSON-LD representation
   */
  toJSONLD() {
    const jsonld = {
      '@context': {
        'mc': 'https://schema.org/AIModel#',
        'xsd': 'http://www.w3.org/2001/XMLSchema#'
      },
      '@type': 'mc:ModelCard'
    };
    
    // Map data to JSON-LD format
    for (const [section, sectionData] of Object.entries(this.data)) {
      for (const [key, value] of Object.entries(sectionData)) {
        jsonld[`mc:${section}_${key}`] = value;
      }
    }
    
    return jsonld;
  }
}

/**
 * Class for managing MCP interfaces (dynamic interaction specifications)
 */
class MCPInterface {
  /**
   * Create an MCP interface
   * @param {Object} hostInterface - Host interface specification
   * @param {Object} clientInterface - Client interface specification
   * @param {Object} primitives - MCP primitives definition
   * @param {Object} options - Additional options
   */
  constructor(hostInterface = {}, clientInterface = {}, primitives = {}, options = {}) {
    this.hostInterfaceSchema = options.hostInterfaceSchema || DEFAULT_MCP_HOST_INTERFACE_SCHEMA;
    this.clientInterfaceSchema = options.clientInterfaceSchema || DEFAULT_MCP_CLIENT_INTERFACE_SCHEMA;
    this.primitivesSchema = options.primitivesSchema || DEFAULT_MCP_PRIMITIVES_SCHEMA;
    
    this.hostInterface = hostInterface;
    this.clientInterface = clientInterface;
    this.primitives = primitives;
    this.externalToolPermissions = options.externalToolPermissions || {};
    
    this.errors = {};
    this.validate();
  }

  /**
   * Validate the MCP interface specifications
   * @returns {boolean} True if valid
   */
  validate() {
    this.errors = {};
    let isValid = true;
    
    // Validate host interface
    const hostValidation = _validateObject(
      this.hostInterface,
      this.hostInterfaceSchema
    );
    
    if (!hostValidation.isValid) {
      this.errors.hostInterface = hostValidation.errors;
      isValid = false;
    }
    
    // Validate client interface
    const clientValidation = _validateObject(
      this.clientInterface,
      this.clientInterfaceSchema
    );
    
    if (!clientValidation.isValid) {
      this.errors.clientInterface = clientValidation.errors;
      isValid = false;
    }
    
    // Validate primitives
    const primitivesValidation = _validateObject(
      this.primitives,
      this.primitivesSchema
    );
    
    if (!primitivesValidation.isValid) {
      this.errors.primitives = primitivesValidation.errors;
      isValid = false;
    }
    
    return isValid;
  }

  /**
   * Update host interface
   * @param {Object} hostInterface - New host interface data
   * @returns {boolean} True if update was valid
   */
  updateHostInterface(hostInterface) {
    const { validated, errors, isValid } = _validateObject(
      hostInterface,
      this.hostInterfaceSchema
    );
    
    if (!isValid) {
      this.errors.hostInterface = errors;
      return false;
    }
    
    this.hostInterface = {
      ...this.hostInterface,
      ...validated
    };
    
    return true;
  }

  /**
   * Update client interface
   * @param {Object} clientInterface - New client interface data
   * @returns {boolean} True if update was valid
   */
  updateClientInterface(clientInterface) {
    const { validated, errors, isValid } = _validateObject(
      clientInterface,
      this.clientInterfaceSchema
    );
    
    if (!isValid) {
      this.errors.clientInterface = errors;
      return false;
    }
    
    this.clientInterface = {
      ...this.clientInterface,
      ...validated
    };
    
    return true;
  }

  /**
   * Update primitives
   * @param {Object} primitives - New primitives data
   * @returns {boolean} True if update was valid
   */
  updatePrimitives(primitives) {
    const { validated, errors, isValid } = _validateObject(
      primitives,
      this.primitivesSchema
    );
    
    if (!isValid) {
      this.errors.primitives = errors;
      return false;
    }
    
    this.primitives = {
      ...this.primitives,
      ...validated
    };
    
    return true;
  }

  /**
   * Update external tool permissions
   * @param {Object} permissions - Tool permissions
   */
  updateExternalToolPermissions(permissions) {
    this.externalToolPermissions = {
      ...this.externalToolPermissions,
      ...permissions
    };
  }

  /**
   * Get the complete MCP interface
   * @returns {Object} Complete interface
   */
  getInterface() {
    return {
      hostInterface: { ...this.hostInterface },
      clientInterface: { ...this.clientInterface },
      primitives: { ...this.primitives },
      externalToolPermissions: { ...this.externalToolPermissions }
    };
  }
}

/**
 * Main class for managing AI model context information
 */
class AIModelContextManager {
  /**
   * Create an AI model context manager
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = options;
    this.modelCard = new ModelCard(options.modelCardData || {});
    this.mcpInterface = new MCPInterface(
      options.hostInterface || {},
      options.clientInterface || {},
      options.primitives || {},
      options.mcpOptions || {}
    );
    
    this.modelDid = options.modelDid || null;
    this.provenance = options.provenance || {};
  }

  /**
   * Get the complete model context
   * @returns {Object} Combined context information
   */
  getCompleteContext() {
    return {
      modelDid: this.modelDid,
      staticContext: this.modelCard.getData(),
      dynamicContext: this.mcpInterface.getInterface(),
      provenance: this.provenance
    };
  }

  /**
   * Update model card information
   * @param {string} section - Section to update
   * @param {Object} data - New section data
   * @returns {boolean} True if update was successful
   */
  updateModelCard(section, data) {
    return this.modelCard.updateSection(section, data);
  }

  /**
   * Update MCP host interface
   * @param {Object} hostInterface - New host interface data
   * @returns {boolean} True if update was successful
   */
  updateHostInterface(hostInterface) {
    return this.mcpInterface.updateHostInterface(hostInterface);
  }

  /**
   * Update MCP client interface
   * @param {Object} clientInterface - New client interface data
   * @returns {boolean} True if update was successful
   */
  updateClientInterface(clientInterface) {
    return this.mcpInterface.updateClientInterface(clientInterface);
  }

  /**
   * Update MCP primitives
   * @param {Object} primitives - New primitives data
   * @returns {boolean} True if update was successful
   */
  updatePrimitives(primitives) {
    return this.mcpInterface.updatePrimitives(primitives);
  }

  /**
   * Update external tool permissions
   * @param {Object} permissions - Tool permissions
   */
  updateExternalToolPermissions(permissions) {
    this.mcpInterface.updateExternalToolPermissions(permissions);
  }

  /**
   * Update model provenance information
   * @param {Object} provenance - Provenance data
   */
  updateProvenance(provenance) {
    this.provenance = {
      ...this.provenance,
      ...provenance
    };
  }

  /**
   * Export the model context in JSON-LD format
   * @returns {Object} JSON-LD representation
   */
  toJSONLD() {
    const modelCardLD = this.modelCard.toJSONLD();
    
    // Create JSON-LD representation
    const jsonld = {
      '@context': {
        ...modelCardLD['@context'],
        'mcp': 'https://schema.org/ModelContextProtocol#',
        'prov': 'http://www.w3.org/ns/prov#'
      },
      '@id': this.modelDid,
      '@type': ['mc:ModelCard', 'mcp:ModelInterface'],
      ...modelCardLD
    };
    
    // Add MCP interface information
    const mcpInterface = this.mcpInterface.getInterface();
    jsonld['mcp:hostInterface'] = mcpInterface.hostInterface;
    jsonld['mcp:clientInterface'] = mcpInterface.clientInterface;
    jsonld['mcp:primitives'] = mcpInterface.primitives;
    jsonld['mcp:externalToolPermissions'] = mcpInterface.externalToolPermissions;
    
    // Add provenance information
    if (Object.keys(this.provenance).length > 0) {
      jsonld['prov:wasGeneratedBy'] = this.provenance.generator;
      jsonld['prov:wasAttributedTo'] = this.provenance.attributedTo;
      jsonld['prov:wasDerivedFrom'] = this.provenance.derivedFrom;
    }
    
    return jsonld;
  }

  /**
   * Export the model context as a DID service endpoint definition
   * @returns {Object} Service endpoint definition
   */
  toDIDServiceEndpoint() {
    return {
      id: `${this.modelDid}#model-context`,
      type: 'AIModelContextService',
      serviceEndpoint: {
        modelCardEndpoint: `${this.modelDid}/model-card`,
        mcpHostInterfaceEndpoint: `${this.modelDid}/mcp-host`,
        mcpClientInterfaceEndpoint: `${this.modelDid}/mcp-client`,
        mcpPrimitivesEndpoint: `${this.modelDid}/mcp-primitives`
      }
    };
  }

  /**
   * Validate the complete model context
   * @returns {Object} Validation results with errors
   */
  validate() {
    const modelCardValid = this.modelCard.validate();
    const mcpInterfaceValid = this.mcpInterface.validate();
    
    return {
      isValid: modelCardValid && mcpInterfaceValid,
      errors: {
        modelCard: this.modelCard.errors,
        mcpInterface: this.mcpInterface.errors
      }
    };
  }

  /**
   * Create an execution context for model interaction
   * @param {Object} input - Input data for the model
   * @param {Object} options - Execution options
   * @returns {Object} Execution context
   */
  createExecutionContext(input, options = {}) {
    // This would create a runtime context for model execution
    // based on the static metadata and dynamic interface
    return {
      input,
      modelDid: this.modelDid,
      hostInterface: this.mcpInterface.hostInterface,
      allowedTools: this._getAllowedTools(options),
      contextVariables: options.contextVariables || {},
      executionId: options.executionId || crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get allowed tools based on permissions
   * @param {Object} options - Execution options
   * @returns {Array} Allowed tools
   * @private
   */
  _getAllowedTools(options = {}) {
    const requestedTools = options.requestedTools || [];
    const allTools = this.mcpInterface.primitives.tools || [];
    const permissions = this.mcpInterface.externalToolPermissions;
    
    // Filter tools based on permissions
    return allTools.filter(tool => {
      // If tool is explicitly requested
      if (requestedTools.includes(tool.name)) {
        // Check if tool has permissions
        if (permissions[tool.name] === 'allowed') {
          return true;
        }
        if (permissions[tool.name] === 'requires_approval' && options.approvedTools?.includes(tool.name)) {
          return true;
        }
        return false;
      }
      
      // Include default tools
      return permissions[tool.name] === 'default';
    });
  }
}

/**
 * Factory for creating model context managers for different model types
 */
class AIModelContextManagerFactory {
  /**
   * Create a context manager for a specific model type
   * @param {string} modelType - Type of AI model
   * @param {Object} options - Configuration options
   * @returns {AIModelContextManager} Appropriate context manager
   */
  static createContextManager(modelType, options = {}) {
    switch (modelType.toLowerCase()) {
      case 'language-model':
        // Could extend with language model specific functionality
        return new AIModelContextManager({
          ...options,
          modelCardData: {
            ...options.modelCardData,
            modelBasicInfo: {
              ...options.modelCardData?.modelBasicInfo,
              modelType: 'LanguageModel'
            }
          }
        });
      
      case 'vision-model':
        // Could extend with vision model specific functionality
        return new AIModelContextManager({
          ...options,
          modelCardData: {
            ...options.modelCardData,
            modelBasicInfo: {
              ...options.modelCardData?.modelBasicInfo,
              modelType: 'VisionModel'
            }
          }
        });
      
      case 'multimodal-model':
        // Could extend with multimodal model specific functionality
        return new AIModelContextManager({
          ...options,
          modelCardData: {
            ...options.modelCardData,
            modelBasicInfo: {
              ...options.modelCardData?.modelBasicInfo,
              modelType: 'MultimodalModel'
            }
          }
        });
      
      default:
        return new AIModelContextManager(options);
    }
  }
}

module.exports = {
  AIModelContextManager,
  AIModelContextManagerFactory,
  ModelCard,
  MCPInterface,
  DEFAULT_MODEL_CARD_SCHEMA,
  DEFAULT_MCP_HOST_INTERFACE_SCHEMA,
  DEFAULT_MCP_CLIENT_INTERFACE_SCHEMA,
  DEFAULT_MCP_PRIMITIVES_SCHEMA
};
