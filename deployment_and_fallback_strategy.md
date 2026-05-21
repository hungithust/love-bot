# Kế hoạch Triển khai & Chiến lược Dự phòng (Deployment & Fallback Strategy)

**Mục tiêu:** Cập nhật quyết định về hạ tầng máy chủ và phương án dự phòng cho hệ thống Agentic AI của ứng dụng "Chữa Lành Đảo Ngược" trên Android.

---

## 1. Hạ tầng Hosting Backend (Render)

*   **Nền tảng được chọn:** Render (PaaS).
*   **Ưu điểm triển khai:** 
    *   Hỗ trợ xuất sắc các kết nối WebSocket (long-lived connections), đảm bảo độ trễ thấp nhất cho các tính năng tương tác thời gian thực như "Lắc để chửi".
    *   Việc đóng gói và deploy pipeline nhận diện cảm xúc đa phương thức (sử dụng PhoBERT cho ngữ nghĩa và emotion2vec cho dữ liệu giọng nói thông thường) lên môi trường Render diễn ra rất trơn tru nhờ cơ chế tự động build từ Git.
*   **Cấu hình tối ưu:** Nên đặt region ở khu vực gần Việt Nam (như Singapore) để tối ưu hóa tốc độ gửi nhận gói tin từ máy thiết bị Samsung của người dùng.

---

## 2. Chiến lược Agentic AI & Fallback (OpenClaw)

Xây dựng AI Agent cá tính mạnh là một thách thức lớn, đặc biệt khi yêu cầu khả năng giữ luồng ngữ cảnh (context) và gọi công cụ (tool calling) liên tục.

*   **Kế hoạch A (Custom Multi-Agent):** Tự thiết kế các node agent (Router Agent, Tsundere Agent, Action Agent) thông qua luồng logic tự code để kiểm soát chặt chẽ từng trạng thái cảm xúc.
*   **Kế hoạch B (OpenClaw Customization):** 
    *   Nếu kiến trúc tự build gặp nút thắt (bottleneck) về độ mượt mà hoặc không đạt được sự "nhảy số" linh hoạt như kỳ vọng, **OpenClaw** sẽ được đưa vào làm core agent thay thế.
    *   Thay vì đập đi xây lại, các công cụ đã cấu hình qua giao thức Model Context Protocol (MCP server) — ví dụ như lệnh rung máy (`trigger_haptic`) hay đổi giao diện (`change_chaos_theme`) — sẽ được plug trực tiếp vào OpenClaw. Điều này giúp tận dụng khả năng suy luận mạnh mẽ có sẵn của OpenClaw mà vẫn giữ nguyên được độ "ngang ngược" và các tương tác vật lý độc quyền trên Mobile.
