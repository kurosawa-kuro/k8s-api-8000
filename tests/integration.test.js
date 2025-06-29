import request from 'supertest';
import app from '../src/app.js';

describe('API Integration Tests', () => {
  let originalApiKey;
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    // API_KEYを未設定に
    originalApiKey = process.env.API_KEY;
    delete process.env.API_KEY;
  });

  afterAll(() => {
    process.env.NODE_ENV = undefined;
    // API_KEYを元に戻す
    if (originalApiKey !== undefined) {
      process.env.API_KEY = originalApiKey;
    }
  });

  describe('API Workflow Tests', () => {
    it('should complete full API workflow', async () => {
      // Step 1: Check if server is healthy
      const healthResponse = await request(app)
        .get('/healthz')
        .expect(200);

      expect(healthResponse.body.status).toBe('ok');

      // Step 2: Check if server is ready
      const readyResponse = await request(app)
        .get('/readyz')
        .expect(200);

      expect(readyResponse.body.status).toBe('ready');

      // Step 3: Get configuration
      const configResponse = await request(app)
        .get('/config')
        .expect(200);

      expect(configResponse.body).toHaveProperty('APP_GREETING');
      expect(configResponse.body).toHaveProperty('API_KEY');

      // Step 4: Get root endpoint
      const rootResponse = await request(app)
        .get('/')
        .expect(200);

      expect(rootResponse.text).toBe('Hello from Express!');

      // Step 5: Verify metrics are available
      const metricsResponse = await request(app)
        .get('/metrics')
        .expect(200);

      expect(metricsResponse.text).toContain('# HELP');
    });
  });

  describe('Load Testing Simulation', () => {
    it('should handle burst of requests', async () => {
      const burstSize = 10;
      const requests = Array(burstSize).fill().map(() => 
        request(app).get('/healthz')
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ok');
      });

      // Should handle burst within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds max
    });

    it('should maintain consistent response times', async () => {
      const responseTimes = [];
      const numRequests = 5;

      for (let i = 0; i < numRequests; i++) {
        const startTime = Date.now();
        await request(app).get('/healthz').expect(200);
        responseTimes.push(Date.now() - startTime);
      }

      // Calculate average response time
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      
      // Average response time should be reasonable
      expect(avgResponseTime).toBeLessThan(1000);

      // Response times should be consistent (within 50% of average)
      responseTimes.forEach(time => {
        expect(time).toBeLessThan(avgResponseTime * 1.5);
      });
    });
  });

  describe('Error Recovery Tests', () => {
    it('should recover from invalid requests', async () => {
      // Make invalid request
      await request(app)
        .get('/invalid-endpoint')
        .expect(404);

      // Verify normal functionality still works
      const response = await request(app)
        .get('/healthz')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });

    it('should handle malformed requests gracefully', async () => {
      // Test with malformed headers
      const response = await request(app)
        .get('/healthz')
        .set('Accept', 'invalid-content-type')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });

  describe('Content Type Validation', () => {
    it('should return correct content types for all endpoints', async () => {
      const endpoints = [
        { path: '/', expectedType: /text/ },
        { path: '/healthz', expectedType: /json/ },
        { path: '/readyz', expectedType: /json/ },
        { path: '/config', expectedType: /json/ },
        { path: '/metrics', expectedType: /text/ }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint.path)
          .expect('Content-Type', endpoint.expectedType)
          .expect(200);
      }
    });
  });

  describe('Response Structure Validation', () => {
    it('should return consistent JSON structure for JSON endpoints', async () => {
      const jsonEndpoints = ['/healthz', '/readyz', '/config'];

      for (const endpoint of jsonEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(200);

        expect(typeof response.body).toBe('object');
        expect(response.body).not.toBeNull();
      }
    });

    it('should return string responses for text endpoints', async () => {
      const textEndpoints = ['/', '/metrics'];

      for (const endpoint of textEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .expect(200);

        expect(typeof response.text).toBe('string');
        expect(response.text.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Security Tests', () => {
    it('should not expose sensitive information in headers', async () => {
      const response = await request(app)
        .get('/healthz')
        .expect(200);

      // Should not expose server technology in headers
      expect(response.headers).not.toHaveProperty('x-powered-by');
      expect(response.headers).not.toHaveProperty('server');
    });

    it('should handle large request headers gracefully', async () => {
      const largeHeader = 'x'.repeat(10000);
      
      const response = await request(app)
        .get('/healthz')
        .set('X-Large-Header', largeHeader)
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });

  describe('Concurrent Access Tests', () => {
    it('should handle multiple different endpoint requests concurrently', async () => {
      const requests = [
        request(app).get('/'),
        request(app).get('/healthz'),
        request(app).get('/readyz'),
        request(app).get('/config'),
        request(app).get('/metrics')
      ];

      const responses = await Promise.all(requests);

      expect(responses[0].status).toBe(200); // Root
      expect(responses[1].status).toBe(200); // Health
      expect(responses[2].status).toBe(200); // Ready
      expect(responses[3].status).toBe(200); // Config
      expect(responses[4].status).toBe(200); // Metrics
    });
  });
}); 