/**
 * AI Model Context Manager
 * 
 * This module provides comprehensive context management for AI models, integrating
 * both static metadata (model cards) and dynamic interaction information (Model Context Protocol).
 * 
 * Key features:
 * - Integration of model cards for static model characteristics
 * - Model Context Protocol (MCP) support for dynamic model interactions
 * - Comprehensive model metadata management
 * - Runtime context handling and tool permission management
 */

/**
 * Model card schema fields aligned with industry standards
 */
const MODEL_CARD_FIELDS = {
  // Basic Information
  MODEL_NAME: 'modelName',
  MODEL_DESCRIPTION: 'modelDescription',
  MODEL_TYPE: 'modelType',
  MODEL_VERSION: 'modelVersion',
  MODEL_ARCHITECTURE: 'modelArchitecture',
  PARAMETERS: 'parameters',
  MODEL_SIZE: 'modelSize',
  
  // Training Data Information
  TRAINING_DATASET: 'trainingDataset',
  TRAINING_DATASET_REFERENCES: 'trainingDatasetReferences',
  DATA_CHARACTERISTICS: 'dataCharacteristics',
  DATA_PREPROCESSING: 'dataPreprocessing',
  DATA_SPLITS: 'dataSplits',
  
  // Performance Information
  EVALUATION_METRICS: 'evaluationMetrics',
  BENCHMARK_RESULTS: 'benchmarkResults',
  CONFIDENCE_INTERVALS: 'confidenceIntervals',
  PERFORMANCE_TRADEOFFS: 'performanceTradeoffs',
  
  // Usage Information
  INTENDED_USE: 'intendedUse',
  USAGE_EXAMPLES: 'usageExamples',
  LIMITATIONS: 'limitations',
  ETHICAL_CONSIDERATIONS: 'ethicalConsiderations',
  SAFETY_MECHANISMS: 'safetyMechanisms',
  
  // Provenance Information
  DEVELOPER_INFO: 'developerInfo',
  DEVELOPER_CONTACT: 'developerContact',
  CITATION_INFO: 'citationInfo',
  LICENSE_INFO: 'licenseInfo',
  
  // Technical Requirements
  HARDWARE_REQUIREMENTS: 'hardwareRequirements',
  SOFTWARE_DEPENDENCIES: 'softwareDependencies',
  EXECUTION_ENVIRONMENT: 'executionEnvironment',
  
  // Bias and Fairness
  BIAS_ANALYSIS: 'biasAnalysis',
  FAIRNESS_ASSESSMENT: 'fairnessAssessment',
  DEMOGRAPHIC_EVALUATION: 'demographicEvaluation',
  
  // Robustness and Security
  ROBUSTNESS_EVALUATION: 'robustnessEvaluation',
  ADVERSARIAL_TESTING: 'adversarialTesting',
  SECURITY_CONSIDERATIONS: 'securityConsiderations'
};

/**
 * Model Context Protocol (MCP) component types
 */
const MCP_COMPONENT_TYPES = {
  HOST: 'host',
  CLIENT: 'client',
  SERVER: 'server',
  TOOL: 'tool',
  PRIMITIVE: 'primitive'
};

/**
 * Model Context Protocol (MCP) permission levels
 */
const MCP_PERMISSION_LEVELS = {
  NONE: 'none',
  READ_ONLY: 'readOnly',
  WRITE_ONLY: 'writeOnly',
  READ_WRITE: 'readWrite',
  EXECUTE: 'execute',
  FULL: 'full'
};

/**
 * Represents an MCP tool definition
 */
class MCPTool {
  /**
   * Create an MCP tool definition
   * @param {string} id - Tool identifier
   * @param {string} name - Human-readable tool name
   * @param {string} description - Tool description
   * @param {string} version - Tool version
   * @param {Object} schema - JSON Schema definition of tool parameters
   * @param {Object} permissions - Required permissions for the tool
   */
  constructor(id, name, description, version, schema, permissions = {}) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.version = version;
    this.schema = schema;
    this.permissions = permissions;
  }

  /**
   * Serialize the tool to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,
      schema: this.schema,
      permissions: this.permissions
    };
  }
}

/**
 * Represents an MCP primitive definition
 */
class MCPPrimitive {
  /**
   * Create an MCP primitive definition
   * @param {string} id - Primitive identifier
   * @param {string} name - Human-readable primitive name
   * @param {string} description - Primitive description
   * @param {string} type - Primitive data type
   * @param {Object} schema - JSON Schema definition of primitive
   */
  constructor(id, name, description, type, schema) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.type = type;
    this.schema = schema;
  }

  /**
   * Serialize the primitive to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      type: this.type,
      schema: this.schema
    };
  }
}

/**
 * Represents a comprehensive model card
 */
class ModelCard {
  /**
   * Create a model card
   * @param {Object} data - Model card data
   */
  constructor(data = {}) {
    // Initialize with provided data or empty objects/arrays
    this.data = {
      // Basic information (required)
      [MODEL_CARD_FIELDS.MODEL_NAME]: data[MODEL_CARD_FIELDS.MODEL_NAME] || '',
      [MODEL_CARD_FIELDS.MODEL_DESCRIPTION]: data[MODEL_CARD_FIELDS.MODEL_DESCRIPTION] || '',
      [MODEL_CARD_FIELDS.MODEL_TYPE]: data[MODEL_CARD_FIELDS.MODEL_TYPE] || '',
      [MODEL_CARD_FIELDS.MODEL_VERSION]: data[MODEL_CARD_FIELDS.MODEL_VERSION] || '',
      
      // Initialize all other fields with provided data or empty values
      ...Object.values(MODEL_CARD_FIELDS).reduce((acc, field) => {
        if (!(field in acc)) { // Skip fields already added above
          acc[field] = data[field] || (typeof data[field] === 'object' ? {} : '');
        }
        return acc;
      }, {})
    };
  }

  /**
   * Update model card fields
   * @param {Object} updates - Fields to update
   * @returns {ModelCard} This model card instance
   */
  update(updates) {
    Object.entries(updates).forEach(([key, value]) => {
      // Only update fields that are part of the schema
      if (Object.values(MODEL_CARD_FIELDS).includes(key)) {
        this.data[key] = value;
      }
    });
    return this;
  }

  /**
   * Get a specific field value
   * @param {string} field - Field name from MODEL_CARD_FIELDS
   * @returns {*} Field value
   */
  get(field) {
    return this.data[field];
  }

  /**
   * Set a specific field value
   * @param {string} field - Field name from MODEL_CARD_FIELDS
   * @param {*} value - Field value
   * @returns {ModelCard} This model card instance
   */
  set(field, value) {
    if (Object.values(MODEL_CARD_FIELDS).includes(field)) {
      this.data[field] = value;
    }
    return this;
  }

  /**
   * Check if the model card has all required fields
   * @returns {boolean} True if all required fields are present
   */
  isValid() {
    const requiredFields = [
      MODEL_CARD_FIELDS.MODEL_NAME,
      MODEL_CARD_FIELDS.MODEL_DESCRIPTION,
      MODEL_CARD_FIELDS.MODEL_TYPE,
      MODEL_CARD_FIELDS.MODEL_VERSION
    ];
    
    return requiredFields.every(field => 
      this.data[field] !== undefined && 
      this.data[field] !== null && 
      this.data[field] !== ''
    );
  }

  /**
   * Convert to JSON-LD format with schema.org compatibility
   * @returns {Object} JSON-LD representation
   */
  toJSONLD() {
    // Map model card fields to schema.org vocabulary
    return {
      '@context': 'https://schema.org/',
      '@type': 'SoftwareApplication',
      'name': this.data[MODEL_CARD_FIELDS.MODEL_NAME],
      'description': this.data[MODEL_CARD_FIELDS.MODEL_DESCRIPTION],
      'applicationCategory': 'AI Model',
      'applicationSubCategory': this.data[MODEL_CARD_FIELDS.MODEL_TYPE],
      'softwareVersion': this.data[MODEL_CARD_FIELDS.MODEL_VERSION],
      'author': this.data[MODEL_CARD_FIELDS.DEVELOPER_INFO],
      'license': this.data[MODEL_CARD_FIELDS.LICENSE_INFO],
      'citation': this.data[MODEL_CARD_FIELDS.CITATION_INFO],
      // Add additional schema.org mappings as appropriate
      'additionalProperty': Object.entries(this.data)
        .filter(([key]) => !['modelName', 'modelDescription', 'modelType', 'modelVersion', 
                            'developerInfo', 'licenseInfo', 'citationInfo'].includes(key))
        .map(([key, value]) => ({
          '@type': 'PropertyValue',
          'name': key,
          'value': typeof value === 'object' ? JSON.stringify(value) : value
        }))
    };
  }

  /**
   * Serialize the model card to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return { ...this.data };
  }
}

/**
 * Model Context Protocol interface definition
 */
class MCPInterface {
  /**
   * Create a Model Context Protocol interface
   * @param {string} type - Interface type (from MCP_COMPONENT_TYPES)
   * @param {Object} schema - Interface JSON schema
   */
  constructor(type, schema = {}) {
    this.type = type;
    this.schema = schema;
    this.tools = new Map();
    this.primitives = new Map();
  }

  /**
   * Add a tool to the interface
   * @param {MCPTool} tool - Tool to add
   * @returns {MCPInterface} This interface instance
   */
  addTool(tool) {
    this.tools.set(tool.id, tool);
    return this;
  }

  /**
   * Remove a tool from the interface
   * @param {string} toolId - ID of tool to remove
   * @returns {boolean} True if the tool was removed
   */
  removeTool(toolId) {
    return this.tools.delete(toolId);
  }

  /**
   * Get a tool by ID
   * @param {string} toolId - Tool ID
   * @returns {MCPTool|undefined} The tool or undefined if not found
   */
  getTool(toolId) {
    return this.tools.get(toolId);
  }

  /**
   * Add a primitive to the interface
   * @param {MCPPrimitive} primitive - Primitive to add
   * @returns {MCPInterface} This interface instance
   */
  addPrimitive(primitive) {
    this.primitives.set(primitive.id, primitive);
    return this;
  }

  /**
   * Remove a primitive from the interface
   * @param {string} primitiveId - ID of primitive to remove
   * @returns {boolean} True if the primitive was removed
   */
  removePrimitive(primitiveId) {
    return this.primitives.delete(primitiveId);
  }

  /**
   * Get a primitive by ID
   * @param {string} primitiveId - Primitive ID
   * @returns {MCPPrimitive|undefined} The primitive or undefined if not found
   */
  getPrimitive(primitiveId) {
    return this.primitives.get(primitiveId);
  }

  /**
   * Serialize the interface to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      type: this.type,
      schema: this.schema,
      tools: Array.from(this.tools.values()).map(tool => tool.toJSON()),
      primitives: Array.from(this.primitives.values()).map(primitive => primitive.toJSON())
    };
  }
}

/**
 * Main class for AI model context management
 */
class AIModelContextManager {
  /**
   * Initialize the AI model context manager
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = options;
    this.modelCard = new ModelCard(options.modelCard || {});
    this.hostInterface = new MCPInterface(MCP_COMPONENT_TYPES.HOST, options.hostSchema || {});
    this.clientInterface = new MCPInterface(MCP_COMPONENT_TYPES.CLIENT, options.clientSchema || {});
    this.runtimeContext = new Map(); // For storing dynamic runtime context
    this.permissionRegistry = new Map(); // For managing tool permissions
  }

  /**
   * Update the model card
   * @param {Object} updates - Model card updates
   * @returns {AIModelContextManager} This manager instance
   */
  updateModelCard(updates) {
    this.modelCard.update(updates);
    return this;
  }

  /**
   * Get the complete model card
   * @returns {ModelCard} The model card
   */
  getModelCard() {
    return this.modelCard;
  }

  /**
   * Add a tool to the host interface
   * @param {MCPTool} tool - Tool to add
   * @returns {AIModelContextManager} This manager instance
   */
  addHostTool(tool) {
    this.hostInterface.addTool(tool);
    return this;
  }

  /**
   * Add a tool to the client interface
   * @param {MCPTool} tool - Tool to add
   * @returns {AIModelContextManager} This manager instance
   */
  addClientTool(tool) {
    this.clientInterface.addTool(tool);
    return this;
  }

  /**
   * Register a permission requirement for a tool
   * @param {string} toolId - Tool ID
   * @param {string} resourceType - Type of resource requiring permission
   * @param {string} permissionLevel - Permission level (from MCP_PERMISSION_LEVELS)
   * @returns {AIModelContextManager} This manager instance
   */
  registerPermission(toolId, resourceType, permissionLevel) {
    if (!Object.values(MCP_PERMISSION_LEVELS).includes(permissionLevel)) {
      throw new Error(`Invalid permission level: ${permissionLevel}`);
    }
    
    const key = `${toolId}:${resourceType}`;
    this.permissionRegistry.set(key, permissionLevel);
    return this;
  }

  /**
   * Check if a tool has the required permission for a resource
   * @param {string} toolId - Tool ID
   * @param {string} resourceType - Type of resource
   * @param {string} requiredPermission - Required permission level
   * @returns {boolean} True if the tool has the required permission
   */
  hasPermission(toolId, resourceType, requiredPermission) {
    const key = `${toolId}:${resourceType}`;
    const assignedPermission = this.permissionRegistry.get(key) || MCP_PERMISSION_LEVELS.NONE;
    
    // Permission hierarchy
    const permissionRanks = {
      [MCP_PERMISSION_LEVELS.NONE]: 0,
      [MCP_PERMISSION_LEVELS.READ_ONLY]: 1,
      [MCP_PERMISSION_LEVELS.WRITE_ONLY]: 1,
      [MCP_PERMISSION_LEVELS.READ_WRITE]: 2,
      [MCP_PERMISSION_LEVELS.EXECUTE]: 2,
      [MCP_PERMISSION_LEVELS.FULL]: 3
    };
    
    // Special cases for read/write permissions
    if (requiredPermission === MCP_PERMISSION_LEVELS.READ_ONLY) {
      return assignedPermission === MCP_PERMISSION_LEVELS.READ_ONLY ||
             assignedPermission === MCP_PERMISSION_LEVELS.READ_WRITE ||
             assignedPermission === MCP_PERMISSION_LEVELS.FULL;
    }
    
    if (requiredPermission === MCP_PERMISSION_LEVELS.WRITE_ONLY) {
      return assignedPermission === MCP_PERMISSION_LEVELS.WRITE_ONLY ||
             assignedPermission === MCP_PERMISSION_LEVELS.READ_WRITE ||
             assignedPermission === MCP_PERMISSION_LEVELS.FULL;
    }
    
    // General case: compare permission ranks
    return permissionRanks[assignedPermission] >= permissionRanks[requiredPermission];
  }

  /**
   * Set a runtime context value
   * @param {string} key - Context key
   * @param {*} value - Context value
   * @returns {AIModelContextManager} This manager instance
   */
  setRuntimeContext(key, value) {
    this.runtimeContext.set(key, value);
    return this;
  }

  /**
   * Get a runtime context value
   * @param {string} key - Context key
   * @returns {*} Context value or undefined if not found
   */
  getRuntimeContext(key) {
    return this.runtimeContext.get(key);
  }

  /**
   * Create an MCP request context
   * @param {string} toolId - Tool ID
   * @param {Object} parameters - Tool parameters
   * @param {Object} additionalContext - Additional context information
   * @returns {Object} MCP request context
   */
  createRequestContext(toolId, parameters = {}, additionalContext = {}) {
    const tool = this.hostInterface.getTool(toolId) || this.clientInterface.getTool(toolId);
    
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }
    
    return {
      tool: {
        id: tool.id,
        name: tool.name,
        version: tool.version
      },
      parameters,
      context: {
        timestamp: new Date().toISOString(),
        modelName: this.modelCard.get(MODEL_CARD_FIELDS.MODEL_NAME),
        modelVersion: this.modelCard.get(MODEL_CARD_FIELDS.MODEL_VERSION),
        ...additionalContext,
        ...Object.fromEntries(this.runtimeContext)
      }
    };
  }

  /**
   * Generate a complete integrated context representation
   * @returns {Object} Integrated context information
   */
  generateIntegratedContext() {
    // Combine model card data with MCP interfaces
    return {
      modelCard: this.modelCard.toJSON(),
      interfaces: {
        host: this.hostInterface.toJSON(),
        client: this.clientInterface.toJSON()
      },
      permissions: Array.from(this.permissionRegistry.entries()).map(([key, level]) => {
        const [toolId, resourceType] = key.split(':');
        return {
          toolId,
          resourceType,
          permissionLevel: level
        };
      })
    };
  }

  /**
   * Generate a JSON-LD representation of the context
   * @returns {Object} JSON-LD representation
   */
  toJSONLD() {
    const modelCardLD = this.modelCard.toJSONLD();
    
    // Add MCP-specific properties
    modelCardLD.additionalProperty.push({
      '@type': 'PropertyValue',
      'name': 'modelContextProtocol',
      'value': {
        'hostInterface': this.hostInterface.toJSON(),
        'clientInterface': this.clientInterface.toJSON()
      }
    });
    
    return modelCardLD;
  }

  /**
   * Serialize to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      modelCard: this.modelCard.toJSON(),
      hostInterface: this.hostInterface.toJSON(),
      clientInterface: this.clientInterface.toJSON(),
      permissions: Object.fromEntries(this.permissionRegistry),
      // Runtime context is intentionally not serialized
    };
  }
}

module.exports = {
  AIModelContextManager,
  ModelCard,
  MCPInterface,
  MCPTool,
  MCPPrimitive,
  MODEL_CARD_FIELDS,
  MCP_COMPONENT_TYPES,
  MCP_PERMISSION_LEVELS
};
