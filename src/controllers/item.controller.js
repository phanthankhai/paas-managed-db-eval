const { prisma } = require('../services/db');

// In-memory fallback nếu chưa kết nối cơ sở dữ liệu thật (đảm bảo test/demo offline không bị crash)
let inMemoryItems = [
  {
    id: 1,
    title: 'Triển khai ứng dụng lên PaaS Render',
    description: 'Cấu hình Web Service kết nối Managed PostgreSQL Database',
    category: 'DevOps',
    status: 'COMPLETED',
    priority: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    title: 'Thiết lập Health Check Probes',
    description: 'Cấu hình endpoint /healthz và /readyz kiểm tra trạng thái database',
    category: 'Monitoring',
    status: 'ACTIVE',
    priority: 4,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];
let nextId = 3;

/**
 * GET /api/items - Lấy danh sách items (hỗ trợ lọc status, category)
 */
async function getAllItems(req, res) {
  try {
    const { category, status } = req.query;

    if (prisma) {
      const where = {};
      if (category) where.category = String(category);
      if (status) where.status = String(status);

      const items = await prisma.item.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ success: true, count: items.length, source: 'PostgreSQL', data: items });
    }

    // Fallback in-memory
    let filtered = [...inMemoryItems];
    if (category) filtered = filtered.filter((i) => i.category === category);
    if (status) filtered = filtered.filter((i) => i.status === status);
    return res.json({ success: true, count: filtered.length, source: 'InMemory (Fallback)', data: filtered });
  } catch (error) {
    console.error('Lỗi getAllItems:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/items/:id - Lấy chi tiết một item
 */
async function getItemById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID không hợp lệ' });
    }

    if (prisma) {
      const item = await prisma.item.findUnique({ where: { id } });
      if (!item) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy item' });
      }
      return res.json({ success: true, source: 'PostgreSQL', data: item });
    }

    // Fallback
    const item = inMemoryItems.find((i) => i.id === id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy item' });
    }
    return res.json({ success: true, source: 'InMemory (Fallback)', data: item });
  } catch (error) {
    console.error('Lỗi getItemById:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/items - Tạo mới một item
 */
async function createItem(req, res) {
  try {
    const { title, description, category, status, priority } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ success: false, error: 'Tiêu đề (title) là bắt buộc' });
    }

    const payload = {
      title: title.trim(),
      description: description ? description.trim() : null,
      category: category ? category.trim() : 'General',
      status: status || 'ACTIVE',
      priority: priority ? parseInt(priority, 10) : 1,
    };

    if (prisma) {
      const newItem = await prisma.item.create({ data: payload });
      return res.status(201).json({ success: true, source: 'PostgreSQL', data: newItem });
    }

    // Fallback
    const newItem = {
      id: nextId++,
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryItems.unshift(newItem);
    return res.status(201).json({ success: true, source: 'InMemory (Fallback)', data: newItem });
  } catch (error) {
    console.error('Lỗi createItem:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PUT /api/items/:id - Cập nhật item
 */
async function updateItem(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID không hợp lệ' });
    }

    const { title, description, category, status, priority } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (category !== undefined) updateData.category = category.trim();
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = parseInt(priority, 10);

    if (prisma) {
      const updated = await prisma.item.update({
        where: { id },
        data: updateData,
      });
      return res.json({ success: true, source: 'PostgreSQL', data: updated });
    }

    // Fallback
    const index = inMemoryItems.findIndex((i) => i.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy item' });
    }
    inMemoryItems[index] = {
      ...inMemoryItems[index],
      ...updateData,
      updatedAt: new Date(),
    };
    return res.json({ success: true, source: 'InMemory (Fallback)', data: inMemoryItems[index] });
  } catch (error) {
    console.error('Lỗi updateItem:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/items/:id - Xóa item
 */
async function deleteItem(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: 'ID không hợp lệ' });
    }

    if (prisma) {
      await prisma.item.delete({ where: { id } });
      return res.json({ success: true, message: `Đã xóa item #${id} thành công` });
    }

    // Fallback
    const index = inMemoryItems.findIndex((i) => i.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy item' });
    }
    inMemoryItems.splice(index, 1);
    return res.json({ success: true, message: `Đã xóa item #${id} thành công` });
  } catch (error) {
    console.error('Lỗi deleteItem:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
};
