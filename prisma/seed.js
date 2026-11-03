const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Xoa du lieu cu neu can
  await prisma.item.deleteMany({});

  const sampleItems = [
    {
      title: 'Triển khai ứng dụng lên PaaS Render',
      description: 'Cấu hình Web Service kết nối Managed PostgreSQL Database',
      category: 'DevOps',
      status: 'COMPLETED',
      priority: 5,
    },
    {
      title: 'Thiết lập Health Check Probes',
      description: 'Cấu hình endpoint /healthz và /readyz kiểm tra trạng thái database',
      category: 'Monitoring',
      status: 'ACTIVE',
      priority: 4,
    },
    {
      title: 'Tự động hóa CI/CD với GitHub Actions',
      description: 'Tự động build, chạy automated tests và deploy khi có commit mới',
      category: 'CI/CD',
      status: 'ACTIVE',
      priority: 4,
    },
    {
      title: 'Thực nghiệm Rollback phiên bản lỗi',
      description: 'Mô phỏng release hỏng, thực hiện rollback về bản ổn định và đo MTTR',
      category: 'Resilience',
      status: 'ACTIVE',
      priority: 5,
    },
    {
      title: 'Kiểm thử tải với k6',
      description: 'Đo lường p95 latency, throughput (RPS) và error rate khi scale instance',
      category: 'Performance',
      status: 'ACTIVE',
      priority: 3,
    },
  ];

  for (const item of sampleItems) {
    await prisma.item.create({ data: item });
  }

  console.log(`✅ Đã seed thành công ${sampleItems.length} bản ghi mẫu!`);
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

