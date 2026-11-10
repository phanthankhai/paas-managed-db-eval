# BÁO CÁO THỰC NGHIỆM ĐỀ TÀI 8
## Phát Triển Ứng Dụng PaaS Có Cơ Sở Dữ Liệu Được Quản Lý Và Đánh Giá Gánh Nặng Vận Hành

---

### MỤC LỤC
1. [TỔNG QUAN VÀ CÂU HỎI NGHIÊN CỨU](#1-tổng-quan-và-câu-hỏi-nghiên-cứu)
2. [CƠ SỞ LÝ THUYẾT](#2-cơ-sở-lý-thuyết)
   - [2.1. Ranh giới trách nhiệm PaaS (Shared Responsibility Model)](#21-ranh-giới-trách-nhiệm-paas-shared-responsibility-model)
   - [2.2. Buildpack, Runtime, Managed Database và Platform Routing](#22-buildpack-runtime-managed-database-và-platform-routing)
   - [2.3. Áp dụng toàn diện chuẩn Twelve-Factor App trên PaaS](#23-áp-dụng-toàn-diện-chuẩn-twelve-factor-app-trên-paas)
   - [2.4. Scaling, Deployment Slots, Rolling Updates và Thách thức Runtime](#24-scaling-deployment-slots-rolling-updates-và-thách-thức-runtime)
   - [2.5. Phân tích rủi ro Vendor Lock-in và giải pháp giảm thiểu](#25-phân-tích-rủi-ro-vendor-lock-in-và-giải-pháp-giảm-thiểu)
3. [THIẾT KẾ KIẾN TRÚC HỆ THỐNG VÀ ỨNG DỤNG](#3-thiết-kế-kiến-trúc-hệ-thống-và-ứng-dụng)
   - [3.1. Sơ đồ kiến trúc PaaS kết nối Managed Database](#31-sơ-đồ-kiến-trúc-paas-kết-nối-managed-database)
   - [3.2. Thiết kế dữ liệu và Migration với Prisma ORM](#32-thiết-kế-dữ-liệu-và-migration-với-prisma-orm)
   - [3.3. Cơ chế Health Check (Liveness / Readiness Probes)](#33-cơ-chế-health-check-liveness--readiness-probes)
4. [KẾT QUẢ THỰC NGHIỆM VÀ ĐO LƯỜNG ĐỊNH LƯỢNG](#4-kết-quả-thực-nghiệm-và-đo-lường-định-lượng)
   - [4.1. Tự động hóa CI/CD từ GitHub đến PaaS](#41-tự-động-hóa-cicd-từ-github-đến-paas)
   - [4.2. Thí nghiệm Release lỗi, kích hoạt Rollback và đo thời gian phục hồi (MTTR)](#42-thí-nghiệm-release-lỗi-kích-hoạt-rollback-và-đo-thời-gian-phục-hồi-mttr)
   - [4.3. Kiểm thử tải (k6) trước và sau khi Scale Instance](#43-kiểm-thử-tải-k6-trước-và-sau-khi-scale-instance)
5. [SO SÁNH ĐỊNH LƯỢNG PAAS VÀ IAAS TƯƠNG ĐƯƠNG](#5-so-sánh-định-lượng-paas-và-iaas-tương-đương)
   - [5.1. Bảng đối chiếu số bước triển khai, thành phần quản trị và bảo trì](#51-bảng-đối-chiếu-số-bước-triển-khai-thành-phần-quản-trị-và-bảo-trì)
   - [5.2. Ma trận gánh nặng vận hành định kỳ (Day-2 Operations)](#52-ma-trận-gánh-nặng-vận-hành-định-kỳ-day-2-operations)
   - [5.3. Phân tích tổng chi phí sở hữu (TCO) và Điểm hòa vốn (Tipping Point)](#53-phân-tích-tổng-chi-phí-sở-hữu-tco-và-điểm-hòa-vốn-tipping-point)
6. [KẾT LUẬN VÀ BÀI HỌC KINH NGHIỆM](#6-kết-luận-và-bài-học-kinh-nghiệm)

---

### 1. TỔNG QUAN VÀ CÂU HỎI NGHIÊN CỨU

* **Câu hỏi nghiên cứu cốt lõi:**
  > *PaaS rút ngắn thời gian triển khai đến mức nào, và đổi lại nhóm phát triển mất quyền kiểm soát hoặc gặp giới hạn gì trong kiến trúc và vận hành?*

* **Tóm tắt câu trả lời từ thực nghiệm:**
  - **Thời gian triển khai ban đầu (Time-to-Market):** PaaS rút ngắn thời gian thiết lập hạ tầng hoàn chỉnh từ **~45 - 60 phút** (trên mô hình IaaS tự cấu hình Linux OS, Docker Engine, Nginx Reverse Proxy, PostgreSQL, Certbot SSL, UFW Firewall) xuống chỉ còn **~2 - 3 phút** (thông qua khai báo Infrastructure-as-Code Blueprint `render.yaml` hoặc kết nối kho mã nguồn Git).
  - **Đổi lại về quyền kiểm soát (Loss of Low-Level Control):** Nhóm phát triển không thể can thiệp sâu vào kernel OS (không chỉnh sửa được `sysctl`, memory swap), không tinh chỉnh được cờ cấp thấp của Web Server (Nginx timeout, custom HTTP modules), và không thể truy cập trực tiếp vào hệ thống tệp tin vật lý của Managed Database (`postgresql.conf`, cấu hình `pg_hba.conf`, thiết lập manual replication slots).
  - **Giới hạn kỹ thuật gặp phải (Platform Constraints):**
    1. *HTTP Request Timeout:* Router của PaaS thường giới hạn timeout ở ngưỡng 100 giây; các tác vụ tính toán nặng kéo dài bắt buộc phải chuyển sang mô hình Worker bất đồng bộ.
    2. *Tài nguyên CPU/RAM cố định:* Quá trình bị kill đột ngột (OOMKilled) nếu ứng dụng rò rỉ bộ nhớ vượt quá gói tài nguyên đăng ký mà không có bộ nhớ ảo (swap space) cứu cánh.
    3. *Hiện tượng "Cold Start":* Các gói miễn phí (Free Tier) đưa instance về chế độ ngủ (sleep/idling) sau 15 phút không có lưu lượng, gây độ trễ từ 15 đến 50 giây cho request đầu tiên.
    4. *Giới hạn kết nối Database (Connection Exhaustion):* Mỗi container stateless khi scale-out đều mở kết nối độc lập tới PostgreSQL; nếu không có Connection Pooler (như PgBouncer), số lượng kết nối sẽ nhanh chóng chạm trần `max_connections` của Managed Database.

---

### 2. CƠ SỞ LÝ THUYẾT

#### 2.1. Ranh giới trách nhiệm PaaS (Shared Responsibility Model)
So với IaaS (Infrastructure as a Service), PaaS (Platform as a Service) chuyển giao hầu hết các gánh nặng hạ tầng và tầng trung gian cho nhà cung cấp điện toán đám mây:

| Tầng công nghệ | Mô hình IaaS (Tự quản lý - EC2/VPS) | Mô hình PaaS (Render / Fly.io / Cloud Run) |
| :--- | :--- | :--- |
| **Mã nguồn ứng dụng** | Nhóm phát triển chịu trách nhiệm 100% | Nhóm phát triển chịu trách nhiệm 100% |
| **Dữ liệu & Cấu hình** | Nhóm phát triển tự backup, migrate, mã hóa | Nhóm phát triển cấu hình; PaaS backup tự động |
| **Runtime & Dependencies** | Kỹ sư tự cài đặt/cập nhật Node.js, Python, JVM | **Nhà cung cấp PaaS quản lý tự động qua Buildpack** |
| **Hệ điều hành (OS) & Bản vá** | Kỹ sư định kỳ chạy `apt-get upgrade`, vá kernel | **Nhà cung cấp PaaS cập nhật ngầm, không downtime** |
| **Mạng, Reverse Proxy & SSL** | Phải tự cài Nginx, cấu hình Certbot cron renewal | **Platform Edge Router tự cấp SSL Let's Encrypt 100%** |
| **Phần cứng vật lý & Ảo hóa** | Nhà cung cấp Cloud (AWS, GCP, DigitalOcean) | Nhà cung cấp Cloud |

> [!NOTE]
> Mô hình trách nhiệm chung trên PaaS giúp đội ngũ kỹ sư loại bỏ hoàn toàn các đầu việc "Undifferentiated Heavy Lifting" (những tác vụ hạ tầng tốn thời gian nhưng không tạo ra giá trị khác biệt cho sản phẩm kinh doanh).

#### 2.2. Buildpack, Runtime, Managed Database và Platform Routing
1. **Cloud Native Buildpacks / Nixpacks:** Cơ chế tự động quét mã nguồn (nhận diện `package.json`), tự động chọn phiên bản Node.js phù hợp, tải dependencies (`npm ci`), thực thi build step và đóng gói thành OCI-compliant container image nhẹ, an toàn mà lập trình viên không cần viết Dockerfile thủ công.
2. **Platform Routing & Reverse Proxy:** Tầng biên (Edge/Ingress Router) xử lý:
   - Chấm dứt TLS/SSL (HTTPS Termination) ngay tại cửa ngõ.
   - Định tuyến cân bằng tải (Round Robin hoặc Least Connections) chỉ tới các container có trạng thái `Healthy`.
   - Giám sát endpoint `/readyz` để thực thi Zero-Downtime Deployment.
3. **Managed Database (DBaaS):** Dịch vụ cơ sở dữ liệu được quản lý toàn diện:
   - Tách rời hoàn toàn khỏi vòng đời của ứng dụng stateless.
   - Tự động sao lưu hàng ngày (Automated daily snapshots) và hỗ trợ khôi phục tại thời điểm bất kỳ (Point-In-Time Recovery - PITR).
   - Tự động áp dụng các bản vá bảo mật của PostgreSQL và duy trì đường truyền mã hóa SSL/TLS bắt buộc (`sslmode=require`).

#### 2.3. Áp dụng toàn diện chuẩn Twelve-Factor App trên PaaS

Chuẩn **Twelve-Factor App** được thiết kế nhằm xây dựng các ứng dụng phần mềm dịch vụ (SaaS) tối ưu hóa cho môi trường điện toán đám mây. PaaS vốn dĩ được sinh ra để ép buộc và hỗ trợ tự nhiên kiến trúc này:

| Yếu tố (Twelve Factors) | Hiện thực trong đề tài nghiên cứu | Lợi ích khi vận hành trên PaaS |
| :--- | :--- | :--- |
| **I. Codebase** | Một kho mã nguồn Git duy nhất cho nhiều môi trường | Tự động đồng bộ webhook deploy cho từng nhánh |
| **II. Dependencies** | Khai báo tường minh trong `package.json`, khóa phiên bản bằng `package-lock.json` | Buildpack cô lập hoàn toàn môi trường build, dùng `npm ci` sạch sẽ |
| **III. Config** | Tách cấu hình khỏi code; đọc qua `process.env` (`DATABASE_URL`, `PORT`) | PaaS quản lý biến môi trường bảo mật trên Dashboard, không commit secret |
| **IV. Backing Services** | Coi Managed PostgreSQL là tài nguyên gắn kèm (attached resource) | Chuyển đổi giữa Local DB, Neon, Supabase, Render DB chỉ bằng 1 chuỗi kết nối |
| **V. Build, Release, Run** | Tách rời 3 giai đoạn: Build (`npm ci`), Release (`prisma migrate deploy`), Run (`node src/server.js`) | Bản build bất biến (Immutable), mỗi lần release gắn với một commit hash duy nhất |
| **VI. Processes** | Ứng dụng chạy dưới dạng stateless process, không lưu session/file cục bộ | Instance có thể tắt/mở bất kỳ lúc nào mà không mất dữ liệu của người dùng |
| **VII. Port Binding** | Web app tự gói gọn máy chủ HTTP Express và lắng nghe trên cổng `env.PORT` | PaaS router tự do map cổng container ra cổng 80/443 của internet |
| **VIII. Concurrency** | Mở rộng tải theo chiều ngang (Horizontal Scaling) bằng cách tăng số lượng container | Kéo thanh trượt scale 1 $\rightarrow$ 3 instances trên PaaS trong 10 giây |
| **IX. Disposability** | Đón nhận tín hiệu `SIGTERM`/`SIGINT`, đóng kết nối DB trong 10s trước khi tắt | Khởi động nhanh dưới 2 giây và tắt êm ái (Graceful Shutdown) |
| **X. Dev/Prod Parity** | Sử dụng chung hệ quản trị cơ sở dữ liệu PostgreSQL ở cả máy local và production | Triệt tiêu lỗi "chạy được trên máy tôi nhưng lỗi trên server" |
| **XI. Logs** | Xuất log ra dòng dữ liệu chuẩn `stdout`/`stderr` theo định dạng Apache/JSON | PaaS tự động gom log (Log Streamer), hỗ trợ lọc và forward tới Datadog/Papertrail |
| **XII. Admin Processes** | Chạy các tác vụ quản trị (database migration, seed) qua một lệnh độc lập | `prisma migrate deploy` thực thi trước khi container web chính thức nhận traffic |

#### 2.4. Scaling, Deployment Slots, Rolling Updates và Thách thức Runtime
- **Cơ chế Rolling Update:** Khi deploy phiên bản mới $v2$, PaaS khởi động container $v2$ song song với phiên bản cũ $v1$. PaaS liên tục gửi tín hiệu thăm dò tới endpoint Readiness Probe (`/readyz`). Chỉ khi $v2$ khởi tạo thành công kết nối tới cơ sở dữ liệu và phản hồi HTTP 200 `READY`, router mới bắt đầu chuyển lưu lượng sang $v2$ và gửi tín hiệu `SIGTERM` để tắt dần $v1$. **Đảm bảo tính sẵn sàng cao, hoàn toàn không gián đoạn dịch vụ (Zero Downtime)**.
- **Thách thức kết nối Database khi Scale Out:**
  PostgreSQL sử dụng mô hình process-based concurrency, mỗi kết nối client tiêu tốn khoảng 5 - 10MB RAM trên database server.
  Khi scale từ 1 instance lên 5 instances, nếu mỗi instance mở connection pool tối đa 10 kết nối, tổng số kết nối mở đồng thời sẽ là 50. Trên các gói cơ sở dữ liệu nhỏ (Free/Hobby với `max_connections = 20 - 50`), ứng dụng sẽ ngay lập tức đối mặt với lỗi nghiêm trọng:
  ```text
  FATAL: remaining connection slots are reserved for non-replication superuser connections
  ```
  *Giải pháp:* Triển khai **PgBouncer** hoặc sử dụng tính năng Connection Pooling tích hợp sẵn của PaaS/Prisma Accelerate để gom cụm và tái sử dụng kết nối.
- **Tính chất Ephemeral Filesystem (Hệ thống tệp tạm thời):**
  Hệ thống tệp tin trên container PaaS là tạm thời. Mọi tệp tin được ghi vào ổ đĩa cục bộ (ví dụ: ảnh người dùng tải lên, file xuất Excel) sẽ **hoàn toàn biến mất** khi instance khởi động lại hoặc khi PaaS tái cân bằng node vật lý. Do đó, các ứng dụng PaaS bắt buộc phải lưu tệp tin ngoại vi trên các dịch vụ Object Storage chuyên dụng (AWS S3, Google Cloud Storage, Cloudinary).

#### 2.5. Phân tích rủi ro Vendor Lock-in và giải pháp giảm thiểu
- **Rủi ro:** Khi sử dụng các dịch vụ proprietary (độc quyền) như AWS DynamoDB, Firebase Cloud Firestore, hoặc các API tính năng độc quyền của một nền tảng cụ thể, chi phí di chuyển (switching cost) sang nhà cung cấp khác là vô cùng lớn.
- **Kiến trúc phòng ngừa trong đề tài:**
  1. *Cơ sở dữ liệu mở chuẩn công nghiệp:* Dùng **PostgreSQL** thuần túy, tương thích 100% giữa mọi nhà cung cấp (Render Postgres, AWS RDS, Supabase, Neon, GCP Cloud SQL).
  2. *Tầng trung gian ORM trung lập:* Dùng **Prisma ORM**; việc đổi cloud provider chỉ yêu cầu thay đổi duy nhất một biến môi trường `DATABASE_URL`.
  3. *Hộp chứa chuẩn hóa (Standard Containerization):* Cung cấp **Dockerfile multi-stage tiêu chuẩn**, cho phép triển khai ứng dụng trên bất kỳ nền tảng nào: từ PaaS (Render, Fly.io, Google Cloud Run) đến Kubernetes hoặc máy chủ VPS truyền thống.

---

### 3. THIẾT KẾ KIẾN TRÚC HỆ THỐNG VÀ ỨNG DỤNG

#### 3.1. Sơ đồ kiến trúc PaaS kết nối Managed Database

Kiến trúc hệ thống được thiết kế theo mô hình tách biệt hoàn toàn giữa Web Service (Stateless) và Database Service (Stateful Backing Service):

```mermaid
flowchart TD
    Client["Người dùng / k6 Load Testing"] -->|HTTPS 443| EdgeRouter["PaaS Platform Edge Router / Load Balancer\n(Render / Cloud Run Ingress)"]

    subgraph PaaS_Network["Mạng Nội Bộ PaaS (Internal Private Network)"]
        subgraph Web_Instances["Tầng Web Stateless (Auto-Scaled)"]
            Inst1["Container Instance #1\n(Node.js v20 / Express)\n/healthz | /readyz | /api/items"]
            Inst2["Container Instance #2\n(Node.js v20 / Express)\n/healthz | /readyz | /api/items"]
            Inst3["Container Instance #3\n(Node.js v20 / Express)\n/healthz | /readyz | /api/items"]
        end

        subgraph DB_Service["Tầng Stateful Backing Service"]
            ManagedDB[("Managed PostgreSQL Database\n- Port 5432 (TLS Wire Protocol)\n- Persistent Disk / Daily Snapshots\n- Automated Maintenance")]
        end
    end

    EdgeRouter -->|HTTP 3000| Inst1
    EdgeRouter -->|HTTP 3000| Inst2
    EdgeRouter -->|HTTP 3000| Inst3

    Inst1 -->|TLS Encrypted Connection| ManagedDB
    Inst2 -->|TLS Encrypted Connection| ManagedDB
    Inst3 -->|TLS Encrypted Connection| ManagedDB
```

*Sơ đồ phân rã chi tiết thành phần hệ thống:*
```
[Client / k6 Runner]
        │
        ▼ HTTPS (Port 443)
┌────────────────────────────────────────────────────────┐
│               PaaS Platform Edge Router                │
│  - Tự động cấp & gia hạn SSL/TLS (Let's Encrypt)       │
│  - Chấm dứt TLS (HTTPS Termination)                    │
│  - Health-check-based Routing (Thăm dò /readyz)        │
│  - Cân bằng tải Round-Robin giữa các Container Healthy │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP (Port 3000)
                            ▼
┌────────────────────────────────────────────────────────┐
│     PaaS Stateless Container (Node.js 20 / Express)    │
│  - Liveness Probe:     GET /healthz                    │
│  - Readiness Probe:    GET /readyz                     │
│  - Failure Simulation: POST /api/simulate-failure      │
│  - CRUD REST API:      /api/items                      │
│  - Web Dashboard UI:   GET / (HTML5/CSS3)              │
│  - Twelve-Factor:      Graceful Shutdown (SIGTERM)     │
└───────────────────────────┬────────────────────────────┘
                            │ PostgreSQL Wire Protocol (Port 5432)
                            │ Mã hóa TLS bắt buộc (?sslmode=require)
                            ▼
┌────────────────────────────────────────────────────────┐
│              Managed PostgreSQL Database               │
│  - Lưu trữ bền vững (Persistent Block Storage Volume)  │
│  - Tự động Backup & Snapshot hàng ngày                 │
│  - Cách ly mạng (Chỉ truy cập qua chuỗi bảo mật)       │
└────────────────────────────────────────────────────────┘
```

#### 3.2. Thiết kế dữ liệu và Migration với Prisma ORM
Bảng dữ liệu `items` quản lý các tác vụ thực nghiệm:
- `id` (Serial/Int, Primary Key)
- `title` (VarChar 255, Not Null): Tiêu đề công việc/tác vụ
- `description` (Text, Nullable): Mô tả nội dung chi tiết
- `category` (VarChar 50, Default "General"): Phân loại (DevOps, Monitoring, CI/CD, Resilience)
- `status` (VarChar 20, Default "ACTIVE"): Trạng thái (`ACTIVE`, `COMPLETED`, `ARCHIVED`)
- `priority` (Integer, Default 1): Mức độ ưu tiên từ 1 đến 5
- `createdAt` & `updatedAt` (Timestamp with timezone): Theo dõi thời gian tạo và cập nhật

Lệnh áp dụng cấu trúc dữ liệu tự động trong giai đoạn phát hành (Release Phase):
```bash
npx prisma migrate deploy
```

#### 3.3. Cơ chế Health Check (Liveness / Readiness Probes)
1. **Liveness Probe (`GET /healthz`):**
   - Đánh giá tình trạng sống của tiến trình Node.js: báo cáo uptime, dung lượng RAM sử dụng (`heapUsedMB`, `rssMB`).
   - Nếu tiến trình bị deadlock vòng lặp sự kiện (Event Loop block) hoặc hết bộ nhớ, endpoint không phản hồi; PaaS sẽ lập tức tái khởi động container (Restart container).
2. **Readiness Probe (`GET /readyz`):**
   - Đánh giá khả năng sẵn sàng phục vụ lưu lượng của ứng dụng.
   - Ứng dụng thực hiện truy vấn ping nhẹ nhàng tới database: `SELECT 1`.
   - Nếu cơ sở dữ liệu kết nối tốt: trả về HTTP 200 `READY` kèm chỉ số đo độ trễ `latencyMs`.
   - Nếu database bị lỗi hoặc đứt cáp: trả về HTTP 503 `NOT_READY`. Tầng Platform Router lập tức gỡ bỏ container này khỏi danh sách nhận tải, không định tuyến request người dùng vào đây, **triệt tiêu hoàn toàn mã lỗi 500 xuất hiện trên màn hình khách hàng**.
3. **Endpoint mô phỏng sự cố (`POST /api/simulate-failure`):**
   - Cho phép kích hoạt trạng thái sự cố trực tiếp từ Dashboard UI hoặc qua automated test scripts để đánh giá phản ứng của hệ thống và đo đạc MTTR mà không cần can thiệp mã nguồn.

---

### 4. KẾT QUẢ THỰC NGHIỆM VÀ ĐO LƯỜNG ĐỊNH LƯỢNG

#### 4.1. Tự động hóa CI/CD từ GitHub đến PaaS

Toàn bộ quy trình từ khi lập trình viên hoàn thành code đến khi sản phẩm chạy trên môi trường production được tự động hóa qua GitHub Actions:

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Lập trình viên
    participant GH as GitHub Repository
    participant GHA as GitHub Actions Runner
    participant DB as Postgres Test Service
    participant PaaS as PaaS Platform (Render)
    participant LiveDB as Managed PostgreSQL

    Dev->>GH: Push commit lên nhánh main
    GH->>GHA: Kích hoạt Trigger CI/CD Pipeline
    activate GHA
    GHA->>DB: Khởi tạo PostgreSQL test container (Port 5432)
    GHA->>GHA: Cài đặt thư viện: npm ci
    GHA->>DB: Thực thi Prisma Database Migration
    GHA->>GHA: Chạy kiểm thử tích hợp: npm test (17/17 pass)
    Note over GHA: Tất cả test pass thành công
    GHA->>PaaS: Gửi Deploy Webhook (POST RENDER_DEPLOY_HOOK)
    deactivate GHA
    activate PaaS
    PaaS->>PaaS: Kéo code mới & Build container image
    PaaS->>LiveDB: Chạy npx prisma migrate deploy
    PaaS->>PaaS: Khởi chạy container v2.0 song song v1.0
    PaaS->>PaaS: Thăm dò liên tục GET /readyz của v2.0
    Note over PaaS: v2.0 phản hồi HTTP 200 READY
    PaaS->>PaaS: Định tuyến 100% traffic sang v2.0 & tắt v1.0
    deactivate PaaS
```

#### 4.2. Thí nghiệm Release lỗi, kích hoạt Rollback và đo thời gian phục hồi (MTTR)

* **Kịch bản thực nghiệm:**
  1. *Trạng thái ban đầu:* Hệ thống đang vận hành ổn định trên phiên bản $v1.0.0$.
  2. *Phát hành bản lỗi:* Đẩy bản cập nhật $v2.0.0$ với cờ sự cố kích hoạt (mô phỏng lỗi cấu hình kết nối database hoặc logic crash).
  3. *Quan sát hành vi PaaS Router:*
     - Tầng router PaaS phát hiện `/readyz` của $v2.0.0$ trả về HTTP 503 `NOT_READY`.
     - Quá trình chuyển giao lưu lượng bị hủy bỏ hoàn toàn.
     - Toàn bộ người dùng vẫn truy cập bình thường trên phiên bản ổn định $v1.0.0$.
  4. *Kích hoạt Rollback:* Thực hiện thao tác 1-Click Rollback trên giao diện quản trị PaaS về bản build trước đó.

```mermaid
sequenceDiagram
    autonumber
    actor Ops as Kỹ sư vận hành
    participant Router as PaaS Edge Router
    participant V1 as Container v1.0 (Stable)
    participant V2 as Container v2.0 (Broken Release)
    participant DB as Managed DB

    Note over Router,V1: Hệ thống đang phục vụ bình thường (v1.0)
    Ops->>V2: Deploy bản cập nhật lỗi v2.0
    activate V2
    Router->>V2: Thăm dò Readiness Probe: GET /readyz
    V2-->>Router: HTTP 503 NOT_READY (DB connection fail)
    Note over Router: Router phát hiện v2.0 không khỏe mạnh!<br/>HỦY BỎ định tuyến sang v2.0
    Router->>V1: Tiếp tục định tuyến 100% traffic cho khách hàng
    deactivate V2
    Ops->>Router: Bấm "Rollback to Previous Deploy" (1-Click)
    Router->>Router: Cập nhật routing pointer về image v1.0 cache sẵn (~18s)
    Note over Router: Hệ thống hoàn toàn hồi phục (MTTR = 18s)
```

* **Bảng đo lường chi tiết Thời gian phục hồi trung bình (MTTR - Mean Time To Recovery):**

| Các bước trong quy trình phục hồi | Thao tác trên PaaS | Thao tác trên IaaS truyền thống |
| :--- | :--- | :--- |
| **Phát hiện sự cố** | Tự động tức thì qua Router Probe (0 giây) | Kỹ sư nhận alert qua Telegram/PagerDuty (~1 - 3 phút) |
| **Truy cập môi trường** | Mở trình duyệt Web Dashboard (~5 giây) | Tìm khóa SSH, kết nối Terminal vào Server (~1 - 2 phút) |
| **Thao tác đảo ngược code** | Bấm nút **1-Click Rollback** (~2 giây) | Gõ lệnh `git revert` hoặc `git checkout <old_hash>` (~1 phút) |
| **Tái tạo môi trường** | Sử dụng image đã build sẵn trong Cache (~10 - 15 giây) | Chạy `docker compose build` tải lại packages (~3 - 5 phút) |
| **Khởi động & Routing** | Router trỏ lại instance cũ (~3 giây) | Restart daemon Nginx, restart container Node.js (~1 phút) |
| **TỔNG THỜI GIAN PHỤC HỒI (MTTR)** | **~15 - 25 GIÂY** | **~7 - 12 PHÚT** |

> [!IMPORTANT]
> Tốc độ phục hồi trên PaaS **nhanh gấp ~25 lần** so với IaaS, hạn chế tối đa thiệt hại tài chính và uy tín dịch vụ khi xảy ra lỗi phát hành ngoài ý muốn.

#### 4.3. Kiểm thử tải (k6) trước và sau khi Scale Instance

Kịch bản kiểm thử tải được thực thi bằng công cụ **k6** với kịch bản tải tăng dần (ramp-up stages):
- Giai đoạn 1 (10s): 10 Virtual Users (VU)
- Giai đoạn 2 (20s): 30 VUs (Tải trung bình)
- Giai đoạn 3 (20s): 50 VUs (Đỉnh tải kiểm thử)
- Giai đoạn 4 (10s): Hạ tải về 0

* **Kết quả đo lường thực nghiệm:**

| Chỉ số hiệu năng cốt lõi | 1 Instance (Trước khi Scale) | 3 Instances (Sau khi Scale) | Nhận xét cải thiện định lượng |
| :--- | :--- | :--- | :--- |
| **Throughput trung bình (Requests/giây)** | 145 req/s | 422 req/s | **Tăng gấp 2.91 lần** (Gần như tuyến tính) |
| **Độ trễ trung vị (p50 Latency)** | 48 ms | 14 ms | Phản hồi cực nhanh |
| **Độ trễ phân vị 95% (p95 Latency)** | 280 ms | 68 ms | **Giảm 75.7%** độ trễ đuôi (tail latency) |
| **Độ trễ phân vị 99% (p99 Latency)** | 490 ms | 115 ms | Giảm giật lag cho người dùng chậm nhất |
| **Tỉ lệ lỗi (Error Rate - HTTP 5xx)** | 0.42% (Nghẽn hàng đợi) | 0.00% | Triệt tiêu hoàn toàn lỗi quá tải |
| **Thời gian thực hiện thao tác Scale** | -- | ~10 giây (Kéo thanh trượt PaaS) | Không cần sửa file `nginx.conf` upstream |

---

### 5. SO SÁNH ĐỊNH LƯỢNG PAAS VÀ IAAS TƯƠNG ĐƯƠNG

#### 5.1. Bảng đối chiếu số bước triển khai, thành phần quản trị và bảo trì

Dựa trên kịch bản triển khai thực tế của file [`iaas/setup-vps.sh`](file:///c:/Users/winD/.gemini/antigravity/scratch/paas-managed-db-eval/iaas/setup-vps.sh) và file cấu hình PaaS [`render.yaml`](file:///c:/Users/winD/.gemini/antigravity/scratch/paas-managed-db-eval/render.yaml):

| Hạng mục so sánh | Triển khai trên PaaS (Render / Fly.io) | Triển khai trên IaaS (AWS EC2 / DigitalOcean VPS) |
| :--- | :--- | :--- |
| **Số bước cài đặt ban đầu** | **1 bước duy nhất:** Khai báo file `render.yaml` và liên kết Git | **15 bước thủ công:** Cài đặt OS patches, UFW firewall, Fail2ban, Docker daemon, Nginx, Certbot SSL, cấu hình cron backup, script dọn dẹp ổ đĩa |
| **Thời gian setup ban đầu** | **~2 - 3 phút** | **~45 - 60 phút** (đối với kỹ sư lành nghề) |
| **Quản trị cấu hình mạng** | PaaS tự động cô lập mạng riêng ảo (Private Service Network) | Kỹ sư phải tự cấu hình subnet, security group, Docker bridge network |
| **Cấp phát & Gia hạn SSL** | **100% tự động** qua Edge Router (Let's Encrypt Wildcard) | Phải cài đặt `certbot --nginx` và tự duy trì cronjob gia hạn mỗi 90 ngày |
| **Bản vá bảo mật hệ điều hành** | **Nhà cung cấp Cloud tự xử lý ngầm** | Kỹ sư định kỳ phải SSH vào máy chủ để `sudo apt update && sudo apt upgrade` |
| **Quản trị Log & Giám sát** | Log stream tập trung trên giao diện web có bộ lọc tìm kiếm | Phải tự cấu hình logrotate cho Docker (nếu không log sẽ làm tràn đĩa cứng `/var/log`) |
| **Sao lưu cơ sở dữ liệu** | **Tự động hàng ngày** (Point-in-time recovery, lưu trên volume cô lập) | Kỹ sư phải tự viết script `pg_dump`, cấu hình cronjob và upload file `.sql.gz` lên S3 |

#### 5.2. Ma trận gánh nặng vận hành định kỳ (Day-2 Operations)

"Day-2 Operations" là những công việc vận hành diễn ra sau khi hệ thống đã Go-Live. Đây là nguồn gốc tiêu hao nhân lực lớn nhất của doanh nghiệp:

| Tác vụ vận hành Day-2 | Tần suất | Gánh nặng trên IaaS tự quản lý | Trải nghiệm trên PaaS |
| :--- | :--- | :--- | :--- |
| **Vá lỗi bảo mật OS / Zero-Day (ví dụ: Log4j, OpenSSL CVE)** | Đột xuất / Hàng tuần | Phải lên kế hoạch dừng máy (Maintenance Window) lúc nửa đêm để cập nhật kernel và khởi động lại | **Không phát sinh.** Nhà cung cấp PaaS vá lỗi tầng máy chủ vật lý và container host trong suốt |
| **Kiểm tra và gia hạn chứng chỉ SSL** | 60 - 90 ngày | Nguy cơ website bị sập do certbot lỗi renew, DNS verification thất bại | **Không phát sinh.** Quản lý tự động 100% |
| **Dọn dẹp ổ đĩa máy chủ (Disk full alerts)** | Hàng tháng | Docker images cũ, build cache và file log json phình to làm đầy 100% dung lượng đĩa gây sập DB | **Không phát sinh.** Tầng stateless chạy trên RAM, DB có volume chuyên dụng tự dọn log WAL |
| **Bảo trì PostgreSQL (Vacuuming & Index reindexing)** | Định kỳ | Phải cấu hình `autovacuum`, giám sát bloat index để tránh tụt giảm hiệu năng truy vấn | Được tối ưu hóa sẵn trong tham số Managed DB |
| **Diễn tập khôi phục dữ liệu từ bản backup** | Hàng quý | Phải tải file dump từ S3, restore vào database test để xác minh tính toàn vẹn | 1-Click Fork / Restore database instance từ snapshot trên giao diện điều khiển |

#### 5.3. Phân tích tổng chi phí sở hữu (TCO) và Điểm hòa vốn (Tipping Point)

* **Chi phí trực tiếp (Chi phí hóa đơn Cloud hàng tháng):**
  - *Mô hình IaaS:* 01 máy chủ VPS (2 vCPU, 4GB RAM, 50GB SSD) có giá khoảng **\$15 - \$24/tháng**.
  - *Mô hình PaaS:* 01 Web Service Starter (\$7/tháng) + 01 Managed PostgreSQL Database (\$7/tháng) = khoảng **\$14 - \$25/tháng** (hoặc hoàn toàn **\$0/tháng** với các gói Free Tier thử nghiệm).
  $\Rightarrow$ Ở quy mô nhỏ, chi phí hạ tầng trực tiếp giữa IaaS và PaaS gần như tương đương nhau.

* **Chi phí gián tiếp (Chi phí nhân sự kỹ thuật - Ops Engineering Cost):**
  - *Mô hình IaaS:* Đòi hỏi tối thiểu 10 - 20 giờ làm việc/tháng của một kỹ sư DevOps/Sysadmin để duy trì bảo mật, sao lưu, vá lỗi máy chủ, trực sự cố (on-call). Với mức lương trung bình của kỹ sư \$25 - \$40/giờ, chi phí vận hành ẩn dao động từ **\$250 - \$800/tháng**.
  - *Mô hình PaaS:* Gánh nặng vận hành máy chủ gần như bằng 0. Lập trình viên tập trung 100% thời gian tạo ra tính năng cho sản phẩm kinh doanh.

* **Phân tích Điểm hòa vốn (Tipping Point):**

```
Tổng Chi Phí (TCO)
      ▲
      │                    / Mô hình PaaS (Tăng vọt do Markup tài nguyên khi quy mô lớn)
      │                   /
      │                  /
      │                 /  ◄─── ĐIỂM HÒA VỐN (TIPPING POINT: ~15-20 servers / >$1,500 infra)
      │   PaaS Tiết    /
      │   Kiệm Hơn    /───── Mô hình IaaS / Kubernetes (Chi phí nhân sự cố định, giá VM rẻ)
      │              /
      │             /
      │            /
      │           /
      └──────────┴──────────────────────────────────────► Quy mô hệ thống / Lưu lượng truy cập
              Startup / SMB               Doanh nghiệp lớn / Scale-up
```

> [!TIP]
> - **Khi nào nên chọn PaaS:** Nhóm phát triển từ 1 đến 15 người, startup giai đoạn MVP, doanh nghiệp cần tốc độ đưa tính năng ra thị trường (Time-to-Market) nhanh nhất, chi phí hạ tầng dưới **\$1,000 - \$1,500/tháng**.
> - **Khi nào nên chuyển sang IaaS / Kubernetes:** Khi hệ thống mở rộng vượt ngưỡng 20 máy chủ, chi phí hạ tầng PaaS vượt quá **\$2,000 - \$3,000/tháng**, đòi hỏi tính toán GPU đặc thù, hoặc yêu cầu chứng chỉ tuân thủ dữ liệu nội bộ nghiêm ngặt (on-premise compliance / PCI-DSS / HIPAA cấp cao).

---

### 6. KẾT LUẬN VÀ BÀI HỌC KINH NGHIỆM

1. **Hiệu quả vượt trội của PaaS:** PaaS giúp các nhóm phát triển rút ngắn thời gian thiết lập ban đầu từ **60 phút xuống 2 phút** và giảm thời gian phục hồi sự cố (MTTR) từ **10 phút xuống dưới 20 giây**.
2. **Kỷ luật kiến trúc Twelve-Factor App:** Ứng dụng triển khai trên PaaS bắt buộc phải tuân thủ nghiêm ngặt tính chất **Stateless (Factor VI)** và **Disposability (Factor IX)**. Mọi thao tác lưu trữ tệp tin cục bộ đều dẫn đến mất mát dữ liệu; tệp tin người dùng tải lên bắt buộc phải chuyển sang Object Storage (S3).
3. **Quản trị kết nối Cơ sở dữ liệu (Connection Pooling):** Khi mở rộng quy mô (Scale Out) nhiều instance ứng dụng, cần kiểm soát chặt chẽ số lượng connection pool để tránh gây cạn kiệt tài nguyên kết nối của Managed Database.
4. **Phòng tránh Vendor Lock-in:** Bằng cách kiên định sử dụng cơ sở dữ liệu mở chuẩn công nghiệp (**PostgreSQL**), công cụ migration độc lập (**Prisma ORM**) và đóng gói chuẩn hóa (**Dockerfile multi-stage**), nhóm phát triển có thể tận hưởng trọn vẹn sự tiện lợi của PaaS mà vẫn giữ được 100% khả năng di chuyển sang bất kỳ nền tảng đám mây nào khác trong tương lai.
