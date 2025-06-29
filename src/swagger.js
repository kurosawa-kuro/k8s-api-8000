import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Node.js Express',
      version: '1.0.0',
      description: 'Express API with Swagger documentation',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Development server (localhost)'
      },
      {
        url: 'http://127.0.0.1:8000',
        description: 'Local development server'
      },
      {
        url: 'http://192.168.1.131:8000',
        description: 'Local network server'
      },
      {
        url: 'https://api.example.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key for authentication'
        }
      }
    },
    security: [
      {
        ApiKeyAuth: []
      }
    ],
    tags: [
      {
        name: 'General',
        description: 'General endpoints'
      },
      {
        name: 'Health',
        description: 'Health check endpoints'
      },
      {
        name: 'Configuration',
        description: 'Configuration endpoints'
      },
      {
        name: 'Users',
        description: 'User management endpoints'
      }
    ]
  },
  apis: ['./src/app.js']
};

export const specs = swaggerJsdoc(options); 