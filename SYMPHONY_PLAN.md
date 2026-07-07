# Kế hoạch Triển Khai Symphony MCP (Phong cách Ponytail) - CẬP NHẬT (v3 - Bun Stack)

Dựa trên ý tưởng kết hợp Model Context Protocol (MCP) và GitHub Projects v2, đây là bản kế hoạch chi tiết (Plan) để boot hệ thống "Symphony" quản lý đa Agent với tiêu chí: **Zero-ops, Low-token, và Nhanh nhất có thể.**

## Tech Stack Mới (Siêu tốc với Bun)
Thay vì Node.js + TypeScript build rườm rà, chúng ta sẽ chuyển hoàn toàn sang **Bun**:
1. **Runtime:** Bun (chạy thẳng `.ts`, cold start cực thấp).
2. **Database Lock:** `bun:sqlite` (tích hợp sẵn, tốc độ bộ nhớ cực nhanh, không cần cài driver).
3. **HTTP Server:** `Bun.serve()` (nếu sau này cần webhook).
4. **Dev Loop:** `bun run --watch server.ts`.

---

## 🚀 Lộ trình Thực thi

### Giai đoạn 1: Thiết lập Xương Sống (GitHub)
- **Bước 1: Tạo Identity (GitHub App)**
  - Đăng ký GitHub App (`issues:write`, `projects:write`).
- **Bước 2: Setup Giao Diện (GitHub Projects v2)**
  - Bật Projects v2, thiết lập bảng Kanban, bật auto-close PR/Issues.

### Giai đoạn 2: Lõi Xử Lý (Symphony MCP Server)
- **Bước 3: Scaffold Server với Bun**
  - Khởi tạo thư mục và chạy `bun init -y`.
  - Cài đặt `@modelcontextprotocol/sdk`, `@octokit/rest`, `@octokit/graphql`, `zod`.
- **Bước 4: Viết 4 Tools Cốt Lõi (Có SQLite Lock)**
  - `claim_ticket(ticketId, agentId)`: Dùng `bun:sqlite` tạo bảng `locks`. Phải **check-then-set có điều kiện** (INSERT IF NOT EXISTS) để đảm bảo khóa nguyên tử (Atomic Lock). Nếu khóa thành công mới được gán việc.
  - `set_status(ticketId, status)`: Dịch chuyển Kanban.
  - `post_signal(ticketId, payload)`: Payload siêu gọn dạng key=value.
  - `get_board()`: Đọc board hiện tại.

### Giai đoạn 3: Tối ưu Giao tiếp
- **Bước 5: Push Notification qua MCP (Bỏ Webhook khỏi MVP)**
  - Bỏ Tunnel/Webhook. Dùng Server Notifications của MCP để push trạng thái.
- **Bước 6: End-to-End Test**
  - Trỏ config Cursor/Claude Code vào `bun run server.ts`.

---

## Tiêu chí Ràng Buộc (Ponytail Rules)
1. **Chỉ dùng Bun SQLite:** SQLite built-in đủ cho lock file local cực nhanh, cấm tuyệt đối Redis/Docker giai đoạn này.
2. **Signal ngắn:** Không viết văn xuôi. Chỉ payload key=value.
3. **Push over Poll:** MCP Server phải push thay đổi về Client, Client không được fetch vòng lặp `get_board()`.
