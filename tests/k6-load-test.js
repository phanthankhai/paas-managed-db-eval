import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Định nghĩa Custom Metrics
const latencyTrend = new Trend('custom_req_duration');
const errorRate = new Rate('custom_error_rate');
const crudOpsCounter = new Counter('crud_operations_total');

// Cấu hình Kịch bản Tải (Load Scenario)
// Mô phỏng tải tăng dần để đánh giá hiệu năng PaaS trước và sau khi Scale Instance
export const options = {
  stages: [
    { duration: '10s', target: 10 },  // Ramp-up: 10 Virtual Users (VU)
    { duration: '20s', target: 30 },  // Tải trung bình: 30 VUs
    { duration: '20s', target: 50 },  // Đỉnh tải: 50 VUs
    { duration: '10s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    // Chỉ số SLA: 95% request phải có latency < 300ms
    http_req_duration: ['p(95)<300', 'p(99)<500'],
    // Tỉ lệ lỗi phải dưới 1%
    http_req_failed: ['rate<0.01'],
    custom_error_rate: ['rate<0.01'],
  },
};

// URL mục tiêu (có thể truyền qua biến môi trường k6 -e TARGET_URL=...)
const BASE_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export default function () {
  const headers = { 'Content-Type': 'application/json' };

  // 1. Kiểm tra Liveness Health check
  const healthRes = http.get(`${BASE_URL}/healthz`);
  latencyTrend.add(healthRes.timings.duration);
  const isHealthOk = check(healthRes, {
    'healthz status is 200': (r) => r.status === 200,
    'healthz status is UP': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && body.status === 'UP';
      } catch (e) {
        return false;
      }
    },
  });
  errorRate.add(!isHealthOk);

  // 2. Lấy danh sách Items (GET /api/items)
  const listRes = http.get(`${BASE_URL}/api/items`);
  latencyTrend.add(listRes.timings.duration);
  const isListOk = check(listRes, {
    'GET /api/items status is 200': (r) => r.status === 200,
  });
  errorRate.add(!isListOk);
  crudOpsCounter.add(1);

  // 3. Tạo mới 1 item ngẫu nhiên (POST /api/items)
  const randomPayload = JSON.stringify({
    title: `k6 Load Test Item ${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    description: 'Bản ghi tải tự động sinh bởi k6 load test',
    category: 'LoadTesting',
    priority: Math.floor(Math.random() * 5) + 1,
    status: 'ACTIVE',
  });

  const createRes = http.post(`${BASE_URL}/api/items`, randomPayload, { headers });
  latencyTrend.add(createRes.timings.duration);
  const isCreated = check(createRes, {
    'POST /api/items status is 201': (r) => r.status === 201,
  });
  errorRate.add(!isCreated);
  crudOpsCounter.add(1);

  let createdId = null;
  if (isCreated) {
    try {
      createdId = JSON.parse(createRes.body).data?.id;
    } catch (e) {}
  }

  // 4. Nếu tạo thành công, đọc chi tiết item đó (GET /api/items/:id)
  if (createdId) {
    const getOneRes = http.get(`${BASE_URL}/api/items/${createdId}`);
    latencyTrend.add(getOneRes.timings.duration);
    const isGetOneOk = check(getOneRes, {
      'GET /api/items/:id status is 200': (r) => r.status === 200,
    });
    errorRate.add(!isGetOneOk);
    crudOpsCounter.add(1);
  }

  // Giãn cách ngẫu nhiên 0.5s - 1.5s giữa các lần lặp của user
  sleep(Math.random() + 0.5);
}

