# 🎵 Symphony MCP Server

**Symphony** là một hệ thống Multi-Agent Coordination (Điều phối Đa Đặc vụ AI) siêu tốc, sử dụng **Model Context Protocol (MCP)** làm cầu nối và **GitHub Projects v2** làm giao diện điều khiển (Board). 

Hệ thống được thiết kế hoàn toàn dựa trên triết lý **"Ponytail / Lazy Senior Dev"**: Không over-engineering, không abstraction thừa, zero-ops (không cần Redis/Docker), và tối thiểu hóa số lượng token (low-token) trao đổi giữa AI và Server.

---

## 🚀 Tính Năng Cốt Lõi (MCP Tools)

Hệ thống expose 4 Tools chính cho các AI Assistant (như Cursor, Claude Code) gọi trực tiếp:

1. 🔒 **`claim_ticket(ticketId, agentId)`**: 
   - Điểm nhấn lớn nhất của hệ thống. Sử dụng `bun:sqlite` làm **Atomic Lock** cực nhanh ở local (`INSERT IF NOT EXISTS`).
   - Ngăn chặn hoàn toàn **Race Conditions** khi có 100 con AI cùng lao vào nhận 1 task. Ai lấy được lock ở SQLite mới được cấp quyền gọi lên GitHub API để assign ticket.
2. 📋 **`set_status(ticketId, status)`**: 
   - Dịch chuyển trạng thái của ticket trên bảng Kanban của GitHub Projects V2 (Todo, In Progress, Review, Done).
3. 📡 **`post_signal(ticketId, payload)`**: 
   - Ghi chú/cập nhật thông tin lên issue bằng định dạng `key=value` siêu nhỏ gọn, tiết kiệm token cho LLM.
4. 👀 **`get_board()`**: 
   - Đọc trạng thái hiện hành của toàn bộ các ticket trong Project.

> ⚡ **Event-Driven (Push over Poll):** Thay vì để AI dùng vòng lặp gọi `get_board` liên tục, MCP Server chủ động gửi `Server Notification` (`sendLoggingMessage`) về cho Client (Cursor/Claude) ngay khi có bất kỳ tool nào thay đổi trạng thái ticket (Bước 5/Giai đoạn 3).

---

## 🛠 Tech Stack

Symphony tận dụng tối đa sức mạnh của **Bun** để đạt tiêu chí Zero-ops:
- **Runtime:** `Bun` (khởi động cực nhanh, hỗ trợ native TypeScript không cần build/compile).
- **Database:** `bun:sqlite` (Built-in, tốc độ bộ nhớ RAM, dùng làm Lock-file, không cần cài server rời).
- **Core SDKs:** `@modelcontextprotocol/sdk`, `@octokit/rest`, `@octokit/graphql`.

---

## 📖 Hướng Dẫn Cài Đặt & Chạy (Setup)

### 1. Yêu cầu hệ thống
- Đã cài đặt [Bun](https://bun.sh/).
- Cần có **GitHub Personal Access Token (Classic)** được cấp quyền: `repo`, `read:project`, `project`.

### 2. Chuẩn bị thông số môi trường (Environment Variables)
Bạn cần thu thập 4 thông số sau:
1. `GITHUB_TOKEN`: Token của bạn.
2. `GITHUB_OWNER`: Tên user/organization sở hữu repo (VD: `kiet-w`).
3. `GITHUB_REPO`: Tên repository (VD: `symphony`).
4. `GITHUB_PROJECT_NUMBER`: ID của Project V2. (Tạo 1 project Kanban trong tab Projects của repo hoặc user. Nhìn lên URL `https://github.com/users/kiet-w/projects/1` => Số cuối cùng chính là `1`).

### 3. Cài đặt Dependencies
```bash
bun install
```

### 4. Tích hợp thẳng vào AI (End-to-End Test)
Không cần chạy server độc lập. Bạn hãy copy file cấu hình sau dán trực tiếp vào phần MCP Config của **Cursor** hoặc **Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "symphony-mcp": {
      "command": "bun",
      "args": [
        "run",
        "/đường/dẫn/tuyệt/đối/tới/repo/symphony/src/server.ts"
      ],
      "env": {
        "GITHUB_TOKEN": "ghp_xxxxxxxxxxxx",
        "GITHUB_OWNER": "kiet-w",
        "GITHUB_REPO": "symphony",
        "GITHUB_PROJECT_NUMBER": "1"
      }
    }
  }
}
```

Ngay khi khởi động AI, Server sẽ tự động chạy qua giao thức `stdio`.

---

## 🐴 Triết Lý Phát Triển (Ponytail Rules)

Bất kỳ ai commit code vào repo này vui lòng tuân thủ các quy tắc:
1. **YAGNI (You Aren't Gonna Need It):** Cái gì không dùng NGAY BÂY GIỜ => Xóa. (VD: Đã xóa cơ chế rollback rườm rà ở `github.ts`).
2. **Minimal Abstraction:** Đừng tạo Interface/Type dài 30 dòng nếu chỉ dùng 1 lần và có thể thay bằng `any`. Đừng chèn JSDoc nếu tên hàm đã tự nói lên tất cả.
3. **No Boilerplate:** Code ít dòng nhất có thể để chạy được. Rút gọn logic (như gộp `parseInt` + `isNaN`). Nếu có chỗ nào rút gọn cố ý, hãy gắn comment: `// ponytail: <lý do>`.
