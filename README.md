# Symphony MCP

Symphony là một hệ thống Multi-Agent Coordination sử dụng Model Context Protocol (MCP) và GitHub Projects v2. Dự án được thiết kế với tiêu chí: **Zero-ops, Low-token, siêu tốc (dựa trên Bun) và tối giản (theo nguyên tắc ponytail/lazy senior dev)**.

## 📍 Tình trạng hiện tại (Current Status)

Hiện tại chúng ta đang bám theo kế hoạch tại [`SYMPHONY_PLAN.md`](./SYMPHONY_PLAN.md).

**Đã hoàn thành (Giai đoạn 1 & 2):**
- [x] Thiết lập GitHub App & Projects v2 (Mô hình).
- [x] Khởi tạo MCP Server với Bun (`src/server.ts`).
- [x] Cài đặt `bun:sqlite` để tạo Atomic Locks trên bảng Kanban, tránh race conditions khi nhiều agent cùng claim ticket.
- [x] Tích hợp GitHub GraphQL & REST API (`src/github.ts`).
- [x] Refactor loại bỏ toàn bộ YAGNI logic, interface cồng kềnh, comments dư thừa theo chuẩn `/ponytail`.
- [x] 4 MCP tools cốt lõi đã chạy mượt:
  - `claim_ticket`: Giữ lock bằng SQLite và assign trên GitHub.
  - `set_status`: Kéo thả ticket trên Project V2.
  - `post_signal`: Đẩy payload key=value ngắn gọn lên issue comment.
  - `get_board`: Lấy trạng thái board hiện tại.

**Đang triển khai / Bước tiếp theo (Giai đoạn 3):**
- [ ] **Bước 5:** Push Notification qua MCP thay vì dùng webhooks. Máy chủ MCP cần push thay đổi về cho các Client.
- [ ] **Bước 6:** End-to-End Test (trỏ config của các AI Assistant như Cursor/Claude Code vào `bun run src/server.ts`).

## 🛠 Cách chạy (Run)

Dự án yêu cầu `bun` runtime.

Cài đặt dependencies:
```bash
bun install
```

Chạy MCP Server:
```bash
bun run src/server.ts
```

*(Yêu cầu các biến môi trường: `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `GITHUB_PROJECT_NUMBER`)*
