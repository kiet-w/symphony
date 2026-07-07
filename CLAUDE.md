# 🤖 TỔ CHỨC TEAM AGENT & SYMPHONY MCP (MULTI-AGENT WORKFLOW)

Chào Agent, bạn đang làm việc trong một hệ thống AI đa Agent cực kỳ tối ưu. Chúng ta đã chuyển đổi từ mô hình truyền thống sang kiến trúc **Symphony MCP Server tích hợp GitHub Projects v2**.

Mọi thiết kế và giao tiếp trong dự án này BẮT BUỘC tuân theo triết lý **Ponytail**: Nhanh nhất, tốn ít Token nhất, và Không làm phức tạp hóa vấn đề (Zero-ops).

## 📍 NHIỆM VỤ ĐẦU TIÊN CỦA BẠN:
Trước khi bắt đầu bất kỳ tác vụ nào (Code, Review, hay quản lý task), bạn **phải đọc file kiến trúc gốc** để hiểu luật chơi giao tiếp qua GitHub:
👉 **Đọc file:** [SYMPHONY_PLAN.md](./SYMPHONY_PLAN.md)

---

## 👥 CÁC VAI TRÒ TRONG HỆ THỐNG

1. **Symphony Agent (Project Manager / Architect)**
   - Người điều phối MCP Server, quản lý GitHub Projects.
2. **Coding Agents (Frontend / Backend)**
   - Nhận task qua `claim_ticket` tool.
   - Báo cáo tiến độ qua `post_signal` (chỉ dùng payload ngắn dạng key=value).
   - Đẩy code lên GitHub Branches.
3. **Code Reviewer Agent**
   - Review code qua GitHub PR. Check kĩ Race Condition, Security, và Clean Code.
   - Báo lỗi qua GitHub Comments (hoặc signal nếu cần).

---

## 🛠️ QUY TẮC CODE CHUẨN PONYTAIL (ÁP DỤNG MỌI ROLE)

- **Không dùng Database nặng:** Mọi trạng thái ticket được lưu trên GitHub Projects V2.
- **Race Condition Lock:** Bắt buộc dùng `SQLite` siêu nhẹ (1 bảng `locks`) để xử lý tránh đụng độ khi nhiều Agent cùng `claim_ticket`.
- **Signal cực ngắn:** Cấm các Agent viết văn xuôi cho nhau đọc. Mọi trao đổi trạng thái dùng định dạng: `agent=tên|ticket=#42|status=blocked|reason=lý_do`.
- **Push Notification:** Không chủ động poll `get_board()` liên tục. Lắng nghe Server Notification từ MCP.
- **Review liên tục:** Bắt buộc áp dụng Code Review sau mỗi thay đổi lớn trước khi Merge. Mọi API phải có Error Handling trả về chuẩn JSON, không bao giờ lộ Stack Trace.

> *Hãy bắt đầu làm việc bằng cách đọc `SYMPHONY_PLAN.md` và kiểm tra xem MCP Server đã sẵn sàng chưa!*

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **symphony** (57 symbols, 67 relationships, 0 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/symphony/context` | Codebase overview, check index freshness |
| `gitnexus://repo/symphony/clusters` | All functional areas |
| `gitnexus://repo/symphony/processes` | All execution flows |
| `gitnexus://repo/symphony/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
