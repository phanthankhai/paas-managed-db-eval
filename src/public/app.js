// API Base
const API_BASE = '';

// Khởi chạy khi load trang
document.addEventListener('DOMContentLoaded', () => {
  checkLiveness();
  checkReadiness();
  loadItems();

  // Tự động poll health check mỗi 10 giây
  setInterval(() => {
    checkLiveness();
    checkReadiness();
  }, 10000);
});

/**
 * Kiểm tra /healthz
 */
async function checkLiveness() {
  try {
    const res = await fetch(`${API_BASE}/healthz`);
    const data = await res.json();

    const statusBadge = document.getElementById('livenessStatus');
    const dot = document.getElementById('overallStatusDot');
    const platformName = document.getElementById('platformName');
    const appVersion = document.getElementById('appVersion');

    if (res.ok && data.status === 'UP') {
      statusBadge.textContent = 'UP (200 OK)';
      statusBadge.className = 'stat-val badge badge-success';
      dot.className = 'status-indicator';
    } else {
      statusBadge.textContent = `${data.status || 'DOWN'} (${res.status})`;
      statusBadge.className = 'stat-val badge badge-danger';
      dot.className = 'status-indicator down';
    }

    platformName.textContent = data.platform || 'Unknown Platform';
    appVersion.textContent = `v${data.version || '1.0.0'}`;
    document.getElementById('uptimeVal').textContent = `${data.uptimeSeconds || 0}s`;

    if (data.memory) {
      document.getElementById('memoryVal').textContent = `${data.memory.heapUsedMB} MB / ${data.memory.rssMB} MB`;
    }
  } catch (err) {
    document.getElementById('livenessStatus').textContent = 'FAIL (Offline)';
    document.getElementById('livenessStatus').className = 'stat-val badge badge-danger';
    document.getElementById('overallStatusDot').className = 'status-indicator down';
  }
}

/**
 * Kiểm tra /readyz
 */
async function checkReadiness() {
  try {
    const res = await fetch(`${API_BASE}/readyz`);
    const data = await res.json();

    const readyBadge = document.getElementById('readinessStatus');
    const dbMsg = document.getElementById('dbHealthMsg');
    const dbLatency = document.getElementById('dbLatency');

    if (res.ok && data.status === 'READY') {
      readyBadge.textContent = 'READY (200 OK)';
      readyBadge.className = 'stat-val badge badge-success';
      dbMsg.textContent = data.database?.message || 'Connected';
      dbLatency.textContent = `${data.database?.latencyMs || 0} ms`;
    } else {
      readyBadge.textContent = `NOT READY (${res.status})`;
      readyBadge.className = 'stat-val badge badge-warning';
      dbMsg.textContent = data.database?.message || 'Database disconnected / unavailable';
      dbLatency.textContent = '--';
    }
  } catch (err) {
    document.getElementById('readinessStatus').textContent = 'ERROR';
    document.getElementById('readinessStatus').className = 'stat-val badge badge-danger';
    document.getElementById('dbHealthMsg').textContent = 'Mất kết nối server';
  }
}

/**
 * Tải danh sách items từ /api/items
 */
async function loadItems() {
  const tbody = document.getElementById('itemsTableBody');
  const statusFilter = document.getElementById('filterStatus').value;

  let url = `${API_BASE}/api/items`;
  if (statusFilter) {
    url += `?status=${encodeURIComponent(statusFilter)}`;
  }

  try {
    const res = await fetch(url);
    const json = await res.json();

    if (!json.success) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Lỗi: ${json.error}</td></tr>`;
      return;
    }

    document.getElementById('dataSourceBadge').textContent = json.source;
    if (json.source.includes('InMemory')) {
      document.getElementById('dataSourceBadge').className = 'badge badge-warning';
    } else {
      document.getElementById('dataSourceBadge').className = 'badge badge-info';
    }

    if (json.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: #64748b;">Chưa có bản ghi nào. Hãy bấm "+ Thêm Item Mới" để tạo dữ liệu!</td></tr>`;
      return;
    }

    tbody.innerHTML = json.data.map((item) => `
      <tr>
        <td class="mono">#${item.id}</td>
        <td>
          <div class="item-title">${escapeHtml(item.title)}</div>
          ${item.description ? `<div class="item-desc">${escapeHtml(item.description)}</div>` : ''}
        </td>
        <td><span class="badge">${escapeHtml(item.category)}</span></td>
        <td><span class="mono">P${item.priority}</span></td>
        <td>
          <span class="badge ${item.status === 'COMPLETED' ? 'badge-success' : item.status === 'ARCHIVED' ? 'badge-warning' : 'badge-info'}">
            ${item.status}
          </span>
        </td>
        <td class="mono" style="font-size: 0.8rem;">${new Date(item.createdAt).toLocaleString('vi-VN')}</td>
        <td style="text-align: right;">
          <button class="btn btn-sm btn-secondary" onclick="editItem(${item.id})">Sửa</button>
          <button class="btn btn-sm btn-danger-sm" onclick="deleteItem(${item.id})">Xóa</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Không thể kết nối API /api/items</td></tr>`;
  }
}

/**
 * Mở modal tạo / sửa
 */
function openModal(item = null) {
  const modal = document.getElementById('itemModal');
  const title = document.getElementById('modalTitle');
  
  if (item) {
    title.textContent = `Chỉnh sửa Item #${item.id}`;
    document.getElementById('itemId').value = item.id;
    document.getElementById('itemTitle').value = item.title;
    document.getElementById('itemDescription').value = item.description || '';
    document.getElementById('itemCategory').value = item.category || 'General';
    document.getElementById('itemPriority').value = item.priority || 3;
    document.getElementById('itemStatus').value = item.status || 'ACTIVE';
  } else {
    title.textContent = 'Thêm Item Mới';
    document.getElementById('itemId').value = '';
    document.getElementById('itemTitle').value = '';
    document.getElementById('itemDescription').value = '';
    document.getElementById('itemCategory').value = 'DevOps';
    document.getElementById('itemPriority').value = '3';
    document.getElementById('itemStatus').value = 'ACTIVE';
  }

  modal.classList.add('active');
}

function closeModal() {
  document.getElementById('itemModal').classList.remove('active');
}

/**
 * Lưu Item (POST hoặc PUT)
 */
async function saveItem() {
  const id = document.getElementById('itemId').value;
  const title = document.getElementById('itemTitle').value.trim();
  const description = document.getElementById('itemDescription').value.trim();
  const category = document.getElementById('itemCategory').value.trim();
  const priority = parseInt(document.getElementById('itemPriority').value, 10);
  const status = document.getElementById('itemStatus').value;

  if (!title) {
    alert('Vui lòng nhập tiêu đề!');
    return;
  }

  const payload = { title, description, category, priority, status };

  try {
    let res;
    if (id) {
      res = await fetch(`${API_BASE}/api/items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(`${API_BASE}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    const data = await res.json();
    if (data.success) {
      closeModal();
      loadItems();
    } else {
      alert(`Lỗi: ${data.error}`);
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  }
}

/**
 * Chỉnh sửa Item
 */
async function editItem(id) {
  try {
    const res = await fetch(`${API_BASE}/api/items/${id}`);
    const data = await res.json();
    if (data.success) {
      openModal(data.data);
    } else {
      alert('Không tìm thấy dữ liệu item');
    }
  } catch (err) {
    alert('Lỗi khi tải thông tin item');
  }
}

/**
 * Xóa Item
 */
async function deleteItem(id) {
  if (!confirm(`Bạn có chắc chắn muốn xóa Item #${id}?`)) return;

  try {
    const res = await fetch(`${API_BASE}/api/items/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      loadItems();
    } else {
      alert(`Lỗi: ${data.error}`);
    }
  } catch (err) {
    alert('Lỗi khi xóa item');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
