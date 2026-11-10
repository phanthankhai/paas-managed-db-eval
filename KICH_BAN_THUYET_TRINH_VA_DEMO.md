# KỊCH BẢN THUYẾT TRÌNH VÀ HƯỚNG DẪN LIVE DEMO
## Đề tài 8: Phát Triển Ứng Dụng PaaS Có Cơ Sở Dữ Liệu Được Quản Lý Và Đánh Giá Gánh Nặng Vận Hành

Tài liệu này được biên soạn dành riêng cho nhóm sinh viên/học viên chuẩn bị **bảo vệ đề tài trước Hội đồng Giảng viên môn Điện toán đám mây & DevOps**.

---

### PHẦN 1: KỊCH BẢN LIVE DEMO (THỜI LƯỢNG 3 - 5 PHÚT)

Khi bước vào phần thực nghiệm, hãy mở sẵn 2 cửa sổ: **Trình duyệt (Web Dashboard)** và **Terminal (VS Code/PowerShell)**.

#### 🎙️ Bước 1: Mở màn & Giới thiệu Dashboard (1 phút)
- **Hành động:** Mở trình duyệt tại địa chỉ: `http://localhost:3000`.
- **Lời thoại gợi ý:**
  > *"Kính thưa Thầy/Cô và các bạn, đây là hệ thống thực nghiệm của nhóm em được xây dựng theo chuẩn Twelve-Factor App. Trên Dashboard, Thầy/Cô có thể thấy 2 đèn báo trạng thái quan trọng:*
  > *1. **Liveness Probe (`/healthz`):** Giám sát tiến trình Node.js có còn sống không, báo cáo uptime và dung lượng RAM.*
  > *2. **Readiness Probe (`/readyz`):** Thăm dò trạng thái kết nối tới Cơ sở dữ liệu PostgreSQL. Platform Router của PaaS liên tục đọc tín hiệu này để quyết định có điều hướng traffic vào container hay không."*

#### 🎙️ Bước 2: Thao tác CRUD & Tính chất Backing Service (1 phút)
- **Hành động:** 
  1. Bấm nút **"+ Thêm Item Mới"**, nhập tiêu đề ví dụ: *"Kiểm thử bảo vệ đồ án"*, chọn Phân loại: *"DevOps"*, bấm **"Lưu thay đổi"**.
  2. Bảng dữ liệu lập tức cập nhật bản ghi mới.
- **Lời thoại gợi ý:**
  > *"Ứng dụng tuân thủ nghiêm ngặt **Factor IV (Backing Services)** và **Factor VI (Stateless Processes)**. Tầng Web hoàn toàn không lưu trạng thái trong bộ nhớ cục bộ, dữ liệu được chuyển tiếp an toàn vào PostgreSQL. Điều này cho phép container có thể bị tiêu hủy hoặc scale-out bất kỳ lúc nào mà không làm mất dữ liệu của người dùng."*

#### 🎙️ Bước 3: Trình diễn Rollback & Thời gian phục hồi MTTR (Điểm nhấn ăn điểm lớn nhất - 1.5 phút)
- **Hành động:**
  1. Chỉ vào card **"🧪 Thí nghiệm Rollback & MTTR"** trên Dashboard.
  2. Bấm nút **"🔴 Giả lập sự cố (503)"**.
  3. Quan sát: Đèn báo Liveness chuyển đỏ (`DOWN 500`), Readiness chuyển vàng/đỏ (`NOT_READY 503`), banner màu đỏ cảnh báo sự cố hiện lên.
  4. Bấm nút **"🟢 Phục hồi (Rollback 200)"**. Hệ thống lập tức xanh trở lại trong tích tắc.
- **Lời thoại gợi ý:**
  > *"Đây là bài toán trọng tâm của đề tài: **Đánh giá gánh nặng vận hành khi phát hành phiên bản lỗi**. Khi một bản release mới gặp sự cố logic hoặc mất kết nối DB:*
  > *- Trên PaaS: Router nhận mã 503 từ `/readyz` nên **tự động chặn không định tuyến người dùng vào container lỗi**. Khi kỹ sư bấm 1-Click Rollback, router chỉ việc trỏ lại bản build cũ đã cache sẵn. Thời gian phục hồi (MTTR) đo được thực tế chỉ mất **15 - 25 giây**.*
  > *- Ngược lại trên IaaS: Kỹ sư phải SSH vào server, pull git cũ, rebuild container, sửa Nginx thủ công, thời gian phục hồi kéo dài từ **7 - 12 phút**, tức PaaS giúp phục hồi **nhanh gấp ~25 lần**."*

#### 🎙️ Bước 4: Chạy kiểm thử tự động trực tiếp trên Terminal (30 giây)
- **Hành động:** Mở Terminal và gõ:
  ```bash
  npm run test:manual
  ```
- **Lời thoại gợi ý:**
  > *"Để chứng minh tính toàn vẹn của mã nguồn, nhóm em đã xây dựng kịch bản kiểm thử tự động toàn diện. Toàn bộ 7/7 bước từ kiểm tra probe, CRUD đến mô phỏng sự cố đều pass 100%."*

---

### PHẦN 2: DÀN BÀI 10 SLIDE THUYẾT TRÌNH (SLIDE OUTLINE)

| Slide # | Tiêu đề Slide | Nội dung cốt lõi cần trình bày |
| :---: | :--- | :--- |
| **Slide 1** | **Trang bìa** | Tên đề tài, Giảng viên hướng dẫn, Danh sách sinh viên thực hiện |
| **Slide 2** | **Đặt vấn đề & Câu hỏi nghiên cứu** | - PaaS rút ngắn thời gian triển khai đến mức nào?<br/>- Đổi lại nhóm phát triển mất quyền kiểm soát hoặc gặp giới hạn gì? |
| **Slide 3** | **Ranh giới trách nhiệm (Shared Responsibility)** | Bảng đối chiếu IaaS vs PaaS: PaaS giải phóng kỹ sư khỏi việc vá OS, cài Docker, cấu hình Nginx, gia hạn SSL |
| **Slide 4** | **Kiến trúc hệ thống & Twelve-Factor App** | Sơ đồ Mermaid phân tầng: Edge Router $\rightarrow$ Auto-scaled Containers $\rightarrow$ Managed DB. Áp dụng 12 yếu tố chuẩn cloud-native |
| **Slide 5** | **Quy trình CI/CD tự động** | Pipeline GitHub Actions: Kéo container test PostgreSQL $\rightarrow$ chạy 17 bài test $\rightarrow$ kích hoạt PaaS Webhook deploy |
| **Slide 6** | **Zero-Downtime Deployment & Probes** | Phân biệt Liveness (`/healthz`) và Readiness (`/readyz`). Cơ chế Rolling Update thay thế instance không gián đoạn dịch vụ |
| **Slide 7** | **Thực nghiệm Rollback & MTTR** | So sánh MTTR: PaaS (15-25s) vs IaaS (7-12 phút). Cơ chế router bảo vệ khách hàng khỏi lỗi 500 |
| **Slide 8** | **Kiểm thử tải hiệu năng (k6 Load Test)** | Bảng số liệu: 50 VUs, 6,072 requests, p95 latency 6.79ms, error rate 0.00%. Tăng throughput 2.9 lần khi scale từ 1 lên 3 instances |
| **Slide 9** | **Đánh giá gánh nặng vận hành & Chi phí TCO** | - Day-2 Operations: Triệt tiêu nỗi lo đầy ổ đĩa, hết hạn cert SSL, vá lỗi kernel.<br/>- Biểu đồ điểm hòa vốn (Tipping Point): Dưới \$1,500/tháng PaaS vượt trội về chi phí |
| **Slide 10** | **Kết luận & Khuyến nghị** | 4 bài học kinh nghiệm: Giữ nguyên tắc Stateless, dùng PgBouncer tránh nghẽn connection, dùng PostgreSQL/Prisma tránh Vendor Lock-in |

---

### PHẦN 3: BỘ CÂU HỎI VẤN ĐÁP CỦA HỘI ĐỒNG (Q&A CHEAT SHEET)

Dưới đây là 5 câu hỏi kinh điển mà Giảng viên thường đặt ra cho đề tài PaaS & DevOps, kèm câu trả lời mẫu chuẩn xác nhất:

#### ❓ Câu hỏi 1: *"Tại sao phải tách riêng Liveness Probe (`/healthz`) và Readiness Probe (`/readyz`) mà không gộp chung?"*
* **Trả lời của bạn:**
  > *"Dạ thưa Thầy/Cô, hai probe này phục vụ hai mục đích hoàn toàn khác nhau trong vòng đời của container:*
  > *- **Liveness Probe** kiểm tra xem tiến trình Node.js có còn sống hay bị deadlock vòng lặp sự kiện không. Nếu Liveness hỏng, hành động duy nhất của nền tảng là **Kill và Restart lại container**.*
  > *- **Readiness Probe** kiểm tra xem ứng dụng đã sẵn sàng phục vụ khách hàng chưa (ví dụ: đã kết nối xong tới Database chưa). Nếu DB đang khởi động hoặc tạm thời đứt kết nối, ứng dụng vẫn sống nhưng chưa sẵn sàng nhận request. Khi đó Router chỉ **tạm ngừng gửi traffic** vào container này mà **không restart nó**. Nếu gộp chung kiểm tra DB vào Liveness, khi DB quá tải, toàn bộ cụm container sẽ bị restart liên tục trong vòng lặp vô tận (CrashLoopBackOff), khiến hệ thống sập hoàn toàn."*

---

#### ❓ Câu hỏi 2: *"Khi scale-out từ 1 lên 10 instances trên PaaS, rủi ro lớn nhất đối với Cơ sở dữ liệu Managed PostgreSQL là gì?"*
* **Trả lời của bạn:**
  > *"Dạ thưa Thầy/Cô, rủi ro lớn nhất là **Cạn kiệt kết nối (Database Connection Exhaustion)**.*
  > *PostgreSQL quản lý mỗi kết nối client bằng một tiến trình riêng (process-based), tiêu tốn từ 5 - 10MB RAM. Do đó, các gói Managed DB vừa và nhỏ thường giới hạn `max_connections` ở mức 50 hoặc 100 kết nối.*
  > *Khi scale lên 10 instances, nếu mỗi instance mở connection pool 10 kết nối, tổng số kết nối sẽ đạt 100, dẫn đến lỗi nghiêm trọng `FATAL: remaining connection slots are reserved`. Giải pháp trong thực tế là nhóm phải triển khai **PgBouncer** hoặc sử dụng tính năng Connection Pooling của nhà cung cấp PaaS để gom cụm và tái sử dụng kết nối."*

---

#### ❓ Câu hỏi 3: *"Nếu người dùng tải ảnh đại diện (avatar) lên ứng dụng, ta có thể lưu trực tiếp vào thư mục `public/uploads` trên server PaaS được không? Tại sao?"*
* **Trả lời của bạn:**
  > *"Dạ tuyệt đối không được ạ!*
  > *Vì theo nguyên tắc **Factor VI (Stateless Processes)** của Twelve-Factor App, container trên PaaS có hệ thống tệp tin tạm thời (**Ephemeral Filesystem**). Khi PaaS khởi động lại container, thực hiện rolling update, hoặc scale-down giảm số lượng máy chủ, toàn bộ các tệp tin lưu trên ổ cứng cục bộ của container sẽ bị **xóa sạch vĩnh viễn**.*
  > *Giải pháp bắt buộc trên môi trường PaaS là chuyển toàn bộ tệp tĩnh của người dùng sang dịch vụ lưu trữ đối tượng bên ngoài (Object Storage) như AWS S3, Google Cloud Storage hoặc Cloudinary."*

---

#### ❓ Câu hỏi 4: *"Trong mã nguồn dự án, nguyên tắc Factor IX: Disposability (Tính dễ phân hủy) được hiện thực như thế nào?"*
* **Trả lời của bạn:**
  > *"Dạ thưa Thầy/Cô, trong tệp [`src/server.js`](file:///c:/Users/winD/.gemini/antigravity/scratch/paas-managed-db-eval/src/server.js), nhóm em đã cài đặt cơ chế **Graceful Shutdown**:*
  > *Ứng dụng lắng nghe tín hiệu ngắt `SIGTERM` và `SIGINT` từ PaaS Router. Khi nhận tín hiệu, máy chủ dừng tiếp nhận request mới qua `server.close()`, sau đó gọi `await disconnectDb()` để đóng sạch sẽ các kết nối đang mở với PostgreSQL, đồng thời có cơ chế timeout 10 giây để đảm bảo tiến trình thoát êm dịu, không làm gián đoạn các giao dịch đang dở dang của khách hàng."*

---

#### ❓ Câu hỏi 5: *"PaaS có thực sự tiết kiệm chi phí hơn IaaS không? Khi nào doanh nghiệp nên chuyển từ PaaS sang IaaS hoặc Kubernetes?"*
* **Trả lời của bạn:**
  > *"Dạ thưa Thầy/Cô, điều này phụ thuộc vào **Tổng chi phí sở hữu (TCO)**:*
  > *- Ở quy mô vừa và nhỏ (startup, MVP, nhóm dưới 15 kỹ sư), chi phí máy chủ PaaS chỉ khoảng \$15 - \$30/tháng, nhưng giúp doanh nghiệp **tiết kiệm từ \$500 - \$1,000/tháng tiền lương thuê kỹ sư DevOps** chuyên trách vận hành, bảo mật và sao lưu.*
  > *- Tuy nhiên, khi hệ thống mở rộng quy mô lớn (vượt quá 15 - 20 servers, chi phí hạ tầng PaaS vượt quá \$2,000 - \$3,000/tháng), mức phí phụ trội (markup) tài nguyên của PaaS sẽ bắt đầu đắt hơn chi phí thuê kỹ sư vận hành IaaS/Kubernetes. Đó chính là **Điểm hòa vốn (Tipping Point)** mà nhóm em đã phân tích ở Mục 5.3 trong Báo cáo."*

