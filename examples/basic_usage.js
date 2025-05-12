/**
 * Basic usage example for Decentralized Digital Resource ID System
 * 
 * This file demonstrates the basic functionality of the system including:
 * - Resource registration
 * - Metadata management
 * - Watermarking
 * - Relationship management
 * - AI model context handling
 */

const { 
  DecentralizedResourceIDSystem, 
  RESOURCE_TYPES, 
  RELATIONSHIP_TYPES,
  MODEL_CARD_FIELDS
} = require('../src');

// Main async function to demonstrate system features
async function demonstrateSystem() {
  console.log('Initializing Decentralized Digital Resource ID System...');
  
  // Create system instance
  const system = new DecentralizedResourceIDSystem({
    // Using minimal options for demonstration
    didFactory: {
      defaultMethod: 'asset',
      defaultCompression: 'base64url'
    },
    // Skip actual blockchain connection for this example
    registry: {
      dltType: 'ethereum',
      storageType: 'ipfs',
      skipConnection: true
    }
  });
  
  // Initialize the system
  await system.initialize();
  
  console.log('System initialized');
  
  // Example 1: Register a text resource
  console.log('\n--- Example 1: Register a text resource ---');
  const textContent = 'This is an example text that demonstrates the digital resource ID system.';
  
  const textRegistration = await system.registerResource(
    textContent,
    RESOURCE_TYPES.TEXT,
    {
      name: 'Example Text',
      description: 'A simple text example',
      creator: 'Example User',
      license: {
        type: 'CC-BY-4.0',
        url: 'https://creativecommons.org/licenses/by/4.0/'
      }
    },
    {
      applyWatermark: true,
      watermarkOptions: {
        robustness: 'medium'
      }
    }
  );
  
  console.log('Text resource registered with DID:', textRegistration.did);
  console.log('DID Document:', JSON.stringify(textRegistration.didDocument, null, 2));
  
  // Example 2: Register an AI model
  console.log('\n--- Example 2: Register an AI model ---');
  
  // Create a mock model (in reality this would be an actual model)
  const mockModel = {
    architecture: 'Transformer',
    parameters: 1_000_000,
    weights: new Array(100).fill(0.1), // Mock weights
  };
  
  // Define the model card
  const modelCard = {
    [MODEL_CARD_FIELDS.MODEL_NAME]: 'ExampleModel',
    [MODEL_CARD_FIELDS.MODEL_DESCRIPTION]: 'An example machine learning model',
    [MODEL_CARD_FIELDS.MODEL_TYPE]: 'Text Generation',
    [MODEL_CARD_FIELDS.MODEL_VERSION]: '1.0.0',
    [MODEL_CARD_FIELDS.MODEL_ARCHITECTURE]: 'Transformer',
    [MODEL_CARD_FIELDS.PARAMETERS]: '1M',
    [MODEL_CARD_FIELDS.TRAINING_DATASET]: 'Example Dataset',
    [MODEL_CARD_FIELDS.EVALUATION_METRICS]: {
      accuracy: 0.92,
      f1: 0.91
    },
    [MODEL_CARD_FIELDS.LIMITATIONS]: 'This is just an example model for demonstration purposes.',
    [MODEL_CARD_FIELDS.DEVELOPER_INFO]: 'Example Organization'
  };
  
  // Define MCP interfaces
  const mcpInterfaces = {
    host: {
      tools: [
        {
          id: 'search_tool',
          name: 'Search Tool',
          description: 'A tool for searching information',
          version: '1.0',
          schema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query'
              }
            },
            required: ['query']
          }
        }
      ]
    },
    client: {
      tools: [
        {
          id: 'content_filter',
          name: 'Content Filter',
          description: 'A tool for filtering content',
          version: '1.0',
          schema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: 'Content to filter'
              },
              level: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
                description: 'Filter strictness level'
              }
            },
            required: ['content']
          }
        }
      ]
    }
  };
  
  const modelRegistration = await system.registerAIModel(
    mockModel,
    modelCard,
    mcpInterfaces,
    {
      applyWatermark: true,
      watermarkOptions: {
        useWhiteboxWatermarking: true,
        useBlackboxWatermarking: true
      }
    }
  );
  
  console.log('AI model registered with DID:', modelRegistration.did);
  
  // Example 3: Register a dataset
  console.log('\n--- Example 3: Register a dataset ---');
  
  // Create a mock dataset (in reality this would be actual data)
  const mockDataset = {
    samples: [
      { id: 1, text: 'Sample 1', label: 'positive' },
      { id: 2, text: 'Sample 2', label: 'negative' },
      { id: 3, text: 'Sample 3', label: 'neutral' }
    ],
    stats: {
      count: 3,
      classDistribution: {
        positive: 1,
        negative: 1,
        neutral: 1
      }
    }
  };
  
  const datasetRegistration = await system.registerResource(
    mockDataset,
    RESOURCE_TYPES.DATASET,
    {
      name: 'Example Dataset',
      description: 'A sample dataset with text and labels',
      creator: 'Example User',
      datasetName: 'ExampleDataset',
      datasetDescription: 'Example dataset for sentiment analysis',
      sampleCount: 3,
      categories: ['text', 'sentiment'],
      license: {
        type: 'CC0-1.0',
        url: 'https://creativecommons.org/publicdomain/zero/1.0/'
      }
    }
  );
  
  console.log('Dataset registered with DID:', datasetRegistration.did);
  
  // Example 4: Establish relationships between resources
  console.log('\n--- Example 4: Establish relationships between resources ---');
  
  // Record that the model was trained on the dataset
  const trainingRelationship = await system.recordRelationship(
    modelRegistration.did,
    datasetRegistration.did,
    RELATIONSHIP_TYPES.USED,
    {
      purpose: 'training',
      timestamp: new Date().toISOString()
    }
  );
  
  console.log('Recorded training relationship:', JSON.stringify(trainingRelationship, null, 2));
  
  // Record that the text was generated by the model
  const generationRelationship = await system.recordRelationship(
    textRegistration.did,
    modelRegistration.did,
    RELATIONSHIP_TYPES.WAS_GENERATED_BY,
    {
      prompt: 'Generate an example text',
      timestamp: new Date().toISOString()
    }
  );
  
  console.log('Recorded generation relationship:', JSON.stringify(generationRelationship, null, 2));
  
  // Example 5: Query relationships
  console.log('\n--- Example 5: Query relationships ---');
  
  const modelRelationships = system.getRelationships(modelRegistration.did, { includeNodes: true });
  console.log('Model relationships:');
  console.log('- Outgoing:', modelRelationships.outgoing.length);
  console.log('- Incoming:', modelRelationships.incoming.length);
  
  // Example 6: Generate provenance report
  console.log('\n--- Example 6: Generate provenance report ---');
  
  const provenanceReport = system.generateProvenanceReport(textRegistration.did);
  console.log('Text provenance report:');
  console.log('- Generated by:', provenanceReport.sources.length, 'sources');
  
  // Example 7: Verify watermark
  console.log('\n--- Example 7: Verify watermark ---');
  
  // Let's verify the watermark in the text
  const textVerification = await system.verifyResourceWatermark(
    textRegistration.watermarked || textContent,
    RESOURCE_TYPES.TEXT,
    { did: textRegistration.did }
  );
  
  console.log('Text watermark verification result:', textVerification.verified);
  
  // Example 8: Create an execution structure
  console.log('\n--- Example 8: Create an execution structure ---');
  
  const executionStructure = await system.createExecutionStructure(
    [modelRegistration.did, datasetRegistration.did],
    {
      name: 'Example Execution Structure',
      description: 'A structure that combines model and dataset',
      roles: {
        [modelRegistration.did]: 'processor',
        [datasetRegistration.did]: 'input'
      },
      executionOrder: [datasetRegistration.did, modelRegistration.did],
      interfaceDefinitions: {
        input: {
          format: 'json',
          schema: { type: 'object' }
        },
        output: {
          format: 'json',
          schema: { type: 'object' }
        }
      },
      environmentRequirements: {
        hardware: {
          memory: '4GB',
          cpu: '2 cores'
        },
        software: {
          runtime: 'Node.js',
          version: '>=14.0.0'
        }
      }
    }
  );
  
  console.log('Execution structure created with DID:', executionStructure.did);
  
  // Demonstrate PROV output
  console.log('\n--- Example 9: W3C PROV output ---');
  
  // Generate PROV document for all registered resources
  const provDocument = system.relationshipManager.toPROV();
  console.log('W3C PROV document generated with entities:', 
    Object.keys(provDocument['@graph'] || {}).length);
  
  console.log('\nAll examples completed successfully!');
}

// Run the demonstration
demonstrateSystem()
  .then(() => {
    console.log('Demonstration completed successfully.');
  })
  .catch((error) => {
    console.error('Demonstration failed:', error);
  });
