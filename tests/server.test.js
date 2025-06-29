import request from 'supertest';
import app from '../src/app.js';

describe('API Server Tests', () => {
  // Test environment setup
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

  describe('Root Endpoint (/)', () => {
    it('should return greeting message', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.text).toBe('Hello from Express!');
    });

    it('should have correct content type', async () => {
      const response = await request(app)
        .get('/')
        .expect('Content-Type', /text/);

      expect(response.status).toBe(200);
    });
  });

  describe('Health Check Endpoint (/healthz)', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/healthz')
        .expect(200);

      expect(response.body).toEqual({ status: 'ok' });
    });

    it('should have correct content type', async () => {
      const response = await request(app)
        .get('/healthz')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
    });
  });

  describe('Readiness Check Endpoint (/readyz)', () => {
    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/readyz')
        .expect(200);

      expect(response.body).toEqual({ status: 'ready' });
    });

    it('should have correct content type', async () => {
      const response = await request(app)
        .get('/readyz')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
    });
  });

  describe('Configuration Endpoint (/config)', () => {
    it('should return configuration data', async () => {
      const response = await request(app)
        .get('/config')
        .expect(200);

      expect(response.body).toHaveProperty('APP_GREETING');
      expect(response.body).toHaveProperty('API_KEY');
      expect(response.body.APP_GREETING).toBe('Hello from Express!');
      expect(response.body.API_KEY).toBe('not‑set');
    });

    it('should have correct content type', async () => {
      const response = await request(app)
        .get('/config')
        .expect('Content-Type', /json/);

      expect(response.status).toBe(200);
    });
  });

  describe('Metrics Endpoint (/metrics)', () => {
    it('should return Prometheus metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
    });

    it('should have correct content type', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect('Content-Type', /text/);

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(response.status).toBe(404);
    });

    it('should return 404 for invalid paths', async () => {
      const response = await request(app)
        .get('/healthz/invalid')
        .expect(404);

      expect(response.status).toBe(404);
    });
  });

  describe('HTTP Methods', () => {
    it('should reject POST requests to GET endpoints', async () => {
      const response = await request(app)
        .post('/healthz')
        .expect(404);

      expect(response.status).toBe(404);
    });

    it('should reject PUT requests to GET endpoints', async () => {
      const response = await request(app)
        .put('/config')
        .expect(404);

      expect(response.status).toBe(404);
    });

    it('should reject DELETE requests to GET endpoints', async () => {
      const response = await request(app)
        .delete('/readyz')
        .expect(404);

      expect(response.status).toBe(404);
    });
  });

  describe('Response Headers', () => {
    it('should include appropriate headers', async () => {
      const response = await request(app)
        .get('/healthz')
        .expect(200);

      expect(response.headers).toHaveProperty('content-type');
      expect(response.headers).toHaveProperty('content-length');
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array(5).fill().map(() => 
        request(app).get('/healthz')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'ok' });
      });
    });

    it('should respond quickly to health checks', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/healthz')
        .expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });

  describe('Environment Variable Tests', () => {
    it('should use default values when env vars are not set', async () => {
      const response = await request(app)
        .get('/config')
        .expect(200);

      expect(response.body.APP_GREETING).toBe('Hello from Express!');
      expect(response.body.API_KEY).toBe('not‑set');
    });
  });
}); 