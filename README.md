# Đề tài 8: Phát triển ứng dụng PaaS có cơ sở dữ liệu được quản lý và đánh giá gánh nặng vận hành

Dự án mẫu thực nghiệm hoàn chỉnh phục vụ báo cáo bài thực hành và đề tài môn học **Điện toán đám mây & DevOps**.

---

## 📂 Cấu trúc mã nguồn

```
paas-managed-db-eval/
├── .github/workflows/
│   └── ci-cd.yml             # Pipeline CI/CD: Test tự động + Deploy PaaS + Health check
├── prisma/
│   ├── schema.prisma         # Schema cơ sở dữ liệu PostgreSQL & Migration
│   └── seed.js               # Kịch bản khởi tạo dữ liệu mẫu
├── src/
│   ├── config/env.js         # Twelve-Factor Factor III: Cấu hình biến môi trường
│   ├── controllers/
│   │   ├── health.controller.js  # Liveness (/healthz) & Readiness (/readyz) Probes
│   │   └── item.controller.js    # Nghiệp vụ CRUD đầy đủ
│   ├── routes/
│   │   ├── health.routes.js
│   │   └── item.routes.js
│   ├── services/db.js        # Prisma client & Graceful shutdown DB
│   ├── public/               # Giao diện Web Dashboard demo trực tiếp
│   │   ├── index.html
│   │   ├── style.css
│   │   └── app.js
│   ├── app.js                # Express app & Logging (Twelve-Factor Factor XI)
│   └── server.js             # Entrypoint & Graceful Shutdown (Twelve-Factor Factor IX)
├── tests/
│   ├── api.test.js           # 8 bài kiểm thử tự động (Jest + Supertest)
│   └── k6-load-test.js       # Kịch bản kiểm thử tải k6 (p95 latency, RPS, error rate)
├── iaas/                     # Mô hình IaaS tương đương để so sánh gánh nặng vận hành
│   ├── docker-compose.yml    # Nginx Proxy + Node App + Self-managed PostgreSQL
│   ├── nginx.conf            # Cấu hình Reverse Proxy & Rate limit
│   └── setup-vps.sh          # 15+ bước thiết lập máy chủ thủ công
├── render.yaml               # Infrastructure-as-Code Blueprint cho Render PaaS
├── Dockerfile                # Multi-stage build cho Cloud Run / Fly.io / Docker PaaS
├── .env.example              # Mẫu biến môi trường (Tuyệt đối không lưu secret vào git)
├── package.json
└── BAO_CAO_DE_TAI_8.md       # Báo cáo chi tiết lý thuyết, số liệu thực nghiệm và đối chiếu IaaS
```

---

## 🚀 1. Hướng dẫn chạy thử nghiệm tại Local

### Bước 1: Khởi tạo biến môi trường
Copy file mẫu:
```bash
cp .env.example .env
```
*(Nếu chưa có PostgreSQL cục bộ, hệ thống có sẵn cơ chế **In-Memory Fallback** an toàn giúp bạn kiểm thử ngay lập tức giao diện và API mà không bị văng lỗi).*

### Bước 2: Chạy kiểm thử tự động
```bash
npm test
```
Kết quả kiểm thử tự động:
- Kiểm tra Liveness Probe (`/healthz`)
- Kiểm tra Readiness Probe (`/readyz`)
- Kiểm thử đầy đủ quy trình CRUD (`GET`, `POST`, `PUT`, `DELETE /api/items`)
- Kiểm tra validation dữ liệu đầu vào

### Bước 3: Khởi động máy chủ ứng dụng
```bash
npm start
```
Mở trình duyệt truy cập: **`http://localhost:3000`** để xem Dashboard quản trị trực quan.

---

## ☁️ 2. Hướng dẫn triển khai lên PaaS (Render / Fly.io)

### Cách 1: Triển khai tự động bằng `render.yaml` (Khuyên dùng)
1. Đẩy mã nguồn dự án này lên tài khoản **GitHub** cá nhân của bạn.
2. Đăng nhập [Render.com](https://render.com).
3. Vào mục **Blueprints** $\rightarrow$ Chọn **New Blueprint Instance**.
4. Chọn repository GitHub vừa tạo. Render sẽ tự động đọc file `render.yaml` và khởi tạo:
   - **01 Managed PostgreSQL Database** miễn phí (`paas-managed-postgres`).
   - **01 Web Service** chạy Node.js tự động nối chuỗi kết nối `DATABASE_URL`.
   - Cấu hình tự động endpoint kiểm tra sức khỏe tại `/readyz`.

### Cách 2: Triển khai thủ công trên Render
1. Tạo **PostgreSQL Database** trên Render $\rightarrow$ Copy chuỗi `Internal Database URL`.
2. Tạo **Web Service** kết nối repo:
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npx prisma generate && npx prisma migrate deploy`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/readyz`
   - Thêm biến môi trường: `DATABASE_URL` = (Dán URL của PostgreSQL vừa tạo).

---

## 🔄 3. Hướng dẫn thực nghiệm Rollback và đo thời gian phục hồi (MTTR)

1. **Giai đoạn 1 (Ổn định):** Ứng dụng chạy bản `v1.0.0`, endpoint `/healthz` và `/readyz` trả về HTTP 200 `UP/READY`.
2. **Giai đoạn 2 (Tạo Release lỗi):**
   - Vào mục cấu hình Environment Variables trên PaaS, đặt biến `SIMULATE_FAILURE=true` (hoặc push một commit có lỗi logic).
   - Kích hoạt Deploy bản mới.
   - Quan sát nhật ký PaaS: Do Readiness Probe `/readyz` trả về lỗi HTTP 503, cơ chế Rolling Update của PaaS sẽ **không định tuyến traffic sang bản lỗi**.
3. **Giai đoạn 3 (Thực hiện Rollback):**
   - Trên PaaS Dashboard $\rightarrow$ Tab **Events / Deploys** $\rightarrow$ Bấm nút **Rollback** về bản build trước đó.
   - Bấm đồng hồ bấm giờ: Đo thời gian từ lúc bấm Rollback cho đến khi endpoint `/readyz` quay lại trạng thái HTTP 200 (thường chỉ mất **15 - 25 giây**).

---

## ⚡ 4. Hướng dẫn chạy kiểm thử tải (Load Testing) với k6

Cài đặt [k6](https://k6.io/docs/get-started/installation/) trên máy:
- Windows (Winget/Choco): `winget install k6` hoặc `choco install k6`
- Mac: `brew install k6`

Chạy kịch bản kiểm thử tải tăng dần từ 10 $\rightarrow$ 50 VUs:
```bash
# Kiểm thử tải local:
k6 run tests/k6-load-test.js

# Hoặc kiểm thử tải trực tiếp lên URL PaaS đã triển khai:
k6 run -e TARGET_URL=https://your-paas-domain.onrender.com tests/k6-load-test.js
```
Kết quả đo lường:
- `http_req_duration`: Báo cáo chỉ số **p(90)**, **p(95)** và **p(99)** latency.
- `http_req_failed`: Báo cáo tỉ lệ lỗi (% fail rate).
- `iterations`: Tổng số request CRUD đã xử lý thành công.

---

## 📊 5. So sánh với phiên bản IaaS tương đương

Trong thư mục `iaas/`, chúng tôi cung cấp file `docker-compose.yml`, `nginx.conf` và `setup-vps.sh` để tái hiện mô hình IaaS tự quản lý:
- Để chạy mô hình IaaS cục bộ:
  ```bash
  cd iaas
  docker compose up -d --build
  ```
- Hãy đọc bảng so sánh đầy đủ 15+ tiêu chí vận hành, quản trị bản vá, backup và tổng chi phí sở hữu (TCO) trong file **`BAO_CAO_DE_TAI_8.md`**.

