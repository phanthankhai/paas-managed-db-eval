/**
 * KỊCH BẢN KIỂM THỬ THỦ CÔNG TOÀN DIỆN (MANUAL TEST RUNNER)
 * Đề tài 8: PaaS & Managed Database Evaluation
 * 
 * Cách chạy:
 *   node tests/manual-test.js
 */

const http = require('http');

const BASE_URL = process.env.TARGET_URL || 'http://localhost:3000';

// Màu sắc cho console
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

function logStep(step, message) {
  console.log(`\n${CYAN}${BOLD}[BƯỚC ${step}]${RESET} ${BOLD}${message}${RESET}`);
}

function logPass(msg) {
  console.log(`  ${GREEN}✓ THÀNH CÔNG:${RESET} ${msg}`);
}

function logFail(msg, err) {
  console.log(`  ${RED}✗ THẤT BẠI:${RESET} ${msg}`, err || '');
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  console.log('='.repeat(65));
  console.log(`${BOLD}🧪 BẮT ĐẦU CHƯƠNG TRÌNH TỰ KIỂM THỬ HỆ THỐNG PAAS${RESET}`);
  console.log(`🌐 Mục tiêu kiểm thử: ${CYAN}${BASE_URL}${RESET}`);
  console.log('='.repeat(65));

  let passed = 0;
  let total = 0;

  // 1. Kiểm tra Liveness Probe
  total++;
  logStep(1, 'Kiểm tra Liveness Probe (GET /healthz)');
  try {
    const res = await request('/healthz');
    if (res.status === 200 && res.data.status === 'UP') {
      logPass(`Trạng thái: ${res.data.status} (200 OK) | Uptime: ${res.data.uptimeSeconds}s | RAM: ${res.data.memory?.rssMB}MB`);
      passed++;
    } else {
      logFail(`Mong đợi 200 UP nhưng nhận: ${res.status}`, res.data);
    }
  } catch (e) {
    logFail('Không thể kết nối tới server. Bạn đã chạy "npm start" chưa?', e.message);
    return;
  }

  // 2. Kiểm tra Readiness Probe
  total++;
  logStep(2, 'Kiểm tra Readiness Probe (GET /readyz)');
  try {
    const res = await request('/readyz');
    if (res.status === 200 && res.data.status === 'READY') {
      logPass(`Router PaaS sẵn sàng! DB Status: ${res.data.database?.message} (Latency: ${res.data.database?.latencyMs}ms)`);
      passed++;
    } else {
      logFail(`Readiness trả về: ${res.status}`, res.data);
    }
  } catch (e) {
    logFail('Lỗi gọi /readyz:', e.message);
  }

  // 3. Lấy danh sách Items
  total++;
  logStep(3, 'Lấy danh sách bản ghi CRUD (GET /api/items)');
  try {
    const res = await request('/api/items');
    if (res.status === 200 && res.data.success) {
      logPass(`Số lượng items hiện tại: ${res.data.count} | Nguồn: ${res.data.source}`);
      passed++;
    } else {
      logFail('Không lấy được items', res.data);
    }
  } catch (e) {
    logFail('Lỗi gọi /api/items:', e.message);
  }

  // 4. Tạo Item mới
  total++;
  logStep(4, 'Tạo một Item mới (POST /api/items)');
  let createdId = null;
  try {
    const payload = {
      title: `Item Test Thủ Công [${new Date().toLocaleTimeString('vi-VN')}]`,
      description: 'Được tạo bởi script tests/manual-test.js',
      category: 'DevOps',
      priority: 5,
      status: 'ACTIVE',
    };
    const res = await request('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.status === 201 && res.data.success) {
      createdId = res.data.data.id;
      logPass(`Đã tạo thành công Item #${createdId}: "${res.data.data.title}" (Status: ${res.data.data.status})`);
      passed++;
    } else {
      logFail('Không tạo được item', res.data);
    }
  } catch (e) {
    logFail('Lỗi tạo item:', e.message);
  }

  // 5. Cập nhật Item vừa tạo
  if (createdId) {
    total++;
    logStep(5, `Cập nhật Item #${createdId} (PUT /api/items/${createdId})`);
    try {
      const updatePayload = {
        title: `Item #${createdId} - ĐÃ CẬP NHẬT THÀNH CÔNG`,
        status: 'COMPLETED',
        priority: 4,
      };
      const res = await request(`/api/items/${createdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      if (res.status === 200 && res.data.data.status === 'COMPLETED') {
        logPass(`Đã cập nhật trạng thái Item #${createdId} sang COMPLETED`);
        passed++;
      } else {
        logFail('Không cập nhật được item', res.data);
      }
    } catch (e) {
      logFail('Lỗi cập nhật item:', e.message);
    }
  }

  // 6. Thí nghiệm mô phỏng sự cố Rollback
  total++;
  logStep(6, 'Thí nghiệm Rollback: Kích hoạt sự cố (POST /api/simulate-failure)');
  try {
    // Bật lỗi
    await request('/api/simulate-failure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable: true }),
    });

    const livenessCheck = await request('/healthz');
    const readinessCheck = await request('/readyz');

    if (livenessCheck.status === 500 && readinessCheck.status === 503) {
      logPass(`PaaS Router phát hiện lỗi thành công! /healthz = 500 DOWN, /readyz = 503 NOT_READY.`);
      console.log(`     ${YELLOW}ℹ️ Tầng Platform Router lập tức hủy bỏ định tuyến sang instance này, bảo vệ người dùng!${RESET}`);
      passed++;
    } else {
      logFail('Simulate failure không đổi status sang 500/503');
    }

    // Phục hồi
    console.log(`\n  ${CYAN}🔄 Đang thực hiện phục hồi (Simulating Rollback to healthy state)...${RESET}`);
    await request('/api/simulate-failure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enable: false }),
    });

    const recoveredCheck = await request('/healthz');
    if (recoveredCheck.status === 200) {
      logPass(`Hệ thống đã phục hồi hoàn toàn (HTTP 200 UP)!`);
    }
  } catch (e) {
    logFail('Lỗi trong thí nghiệm Rollback:', e.message);
  }

  // 7. Xóa Item đã tạo để dọn dẹp
  if (createdId) {
    total++;
    logStep(7, `Dọn dẹp: Xóa Item #${createdId} (DELETE /api/items/${createdId})`);
    try {
      const res = await request(`/api/items/${createdId}`, { method: 'DELETE' });
      if (res.status === 200) {
        logPass(`Đã xóa Item #${createdId} sạch sẽ.`);
        passed++;
      } else {
        logFail(`Xóa thất bại: ${res.status}`);
      }
    } catch (e) {
      logFail('Lỗi xóa item:', e.message);
    }
  }

  console.log('\n' + '='.repeat(65));
  console.log(`${BOLD}🏁 KẾT QUẢ KIỂM THỬ: ${passed}/${total} BƯỚC ĐẠT (${Math.round((passed/total)*100)}%)${RESET}`);
  if (passed === total) {
    console.log(`${GREEN}${BOLD}🎉 TẤT CẢ CÁC BÀI KIỂM THỬ ĐỀU HOÀN TOÀN THÀNH CÔNG!${RESET}`);
  }
  console.log('='.repeat(65));
}

main();

