const request = require('supertest');
const app = require('../src/app');

describe('PaaS Health Check & Readiness Endpoints', () => {
  it('GET /healthz should return 200 and UP status (Liveness Probe)', async () => {
    const res = await request(app).get('/healthz');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'UP');
    expect(res.body).toHaveProperty('uptimeSeconds');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('memory');
  });

  it('GET /readyz should return status indicating DB readiness', async () => {
    const res = await request(app).get('/readyz');
    // Depending on DB availability, will be 200 or 503, but must have valid json format
    expect([200, 503]).toContain(res.statusCode);
    expect(res.body).toHaveProperty('status');
  });
});

describe('CRUD Items API Endpoints', () => {
  let createdItemId = null;

  it('GET /api/items should return a list of items', async () => {
    const res = await request(app).get('/api/items');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('POST /api/items should fail with 400 if title is missing', async () => {
    const res = await request(app)
      .post('/api/items')
      .send({ description: 'Thiếu title' });
    
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error).toMatch(/Tiêu đề/);
  });

  it('POST /api/items should create a new item successfully', async () => {
    const newItem = {
      title: 'Automated Test Item',
      description: 'Created by Jest integration test',
      category: 'Testing',
      priority: 4,
      status: 'ACTIVE',
    };

    const res = await request(app)
      .post('/api/items')
      .send(newItem);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.title).toBe(newItem.title);

    createdItemId = res.body.data.id;
  });

  it('GET /api/items/:id should retrieve the created item', async () => {
    expect(createdItemId).not.toBeNull();

    const res = await request(app).get(`/api/items/${createdItemId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data.id).toBe(createdItemId);
  });

  it('PUT /api/items/:id should update the item', async () => {
    expect(createdItemId).not.toBeNull();

    const updatePayload = {
      title: 'Automated Test Item - Updated',
      status: 'COMPLETED',
      priority: 5,
    };

    const res = await request(app)
      .put(`/api/items/${createdItemId}`)
      .send(updatePayload);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data.title).toBe(updatePayload.title);
    expect(res.body.data.status).toBe('COMPLETED');
  });

  it('DELETE /api/items/:id should delete the item', async () => {
    expect(createdItemId).not.toBeNull();

    const res = await request(app).delete(`/api/items/${createdItemId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('success', true);

    // Verify it is gone
    const verifyRes = await request(app).get(`/api/items/${createdItemId}`);
    expect(verifyRes.statusCode).toBe(404);
  });

  it('GET /api/items/:id should return 400 for invalid ID format', async () => {
    const res = await request(app).get('/api/items/not-a-number');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/items/:id should return 404 for non-existent item', async () => {
    const res = await request(app).get('/api/items/999999');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('PUT /api/items/:id should return 404 when updating non-existent item', async () => {
    const res = await request(app)
      .put('/api/items/999999')
      .send({ title: 'Does Not Exist' });
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('PUT /api/items/:id should return 400 for invalid status or empty title', async () => {
    const resInvalidStatus = await request(app)
      .put('/api/items/1')
      .send({ status: 'INVALID_STATUS' });
    expect(resInvalidStatus.statusCode).toBe(400);

    const resEmptyTitle = await request(app)
      .put('/api/items/1')
      .send({ title: '   ' });
    expect(resEmptyTitle.statusCode).toBe(400);
  });

  it('DELETE /api/items/:id should return 404 when deleting non-existent item', async () => {
    const res = await request(app).delete('/api/items/999999');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/items should support filtering by status and category', async () => {
    const res = await request(app).get('/api/items?status=ACTIVE&category=DevOps');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('System Info & Failure Simulation (Rollback Testing)', () => {
  it('GET /api/info should return application metadata', async () => {
    const res = await request(app).get('/api/info');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('app');
    expect(res.body).toHaveProperty('endpoints');
  });

  it('GET /non-existent-route should return 404 JSON', async () => {
    const res = await request(app).get('/non-existent-route');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/simulate-failure should toggle simulated outage for resilience testing', async () => {
    // 1. Kích hoạt giả lập sự cố
    const enableRes = await request(app)
      .post('/api/simulate-failure')
      .send({ enable: true });
    expect(enableRes.statusCode).toBe(200);
    expect(enableRes.body.simulateFailure).toBe(true);

    // 2. Kiểm chứng Liveness Probe báo DOWN 500
    const healthDownRes = await request(app).get('/healthz');
    expect(healthDownRes.statusCode).toBe(500);
    expect(healthDownRes.body.status).toBe('DOWN');

    // 3. Kiểm chứng Readiness Probe báo NOT_READY 503 (Router PaaS sẽ ngắt traffic)
    const readyDownRes = await request(app).get('/readyz');
    expect(readyDownRes.statusCode).toBe(503);
    expect(readyDownRes.body.status).toBe('NOT_READY');

    // 4. Khôi phục lại trạng thái bình thường (Rollback / Recovery)
    const recoverRes = await request(app)
      .post('/api/simulate-failure')
      .send({ enable: false });
    expect(recoverRes.statusCode).toBe(200);
    expect(recoverRes.body.simulateFailure).toBe(false);

    // 5. Kiểm chứng phục hồi thành công
    const healthRecovered = await request(app).get('/healthz');
    expect(healthRecovered.statusCode).toBe(200);
    expect(healthRecovered.body.status).toBe('UP');
  });
});

