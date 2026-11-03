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
});
