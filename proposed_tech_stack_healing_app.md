# Tài liệu Kiến trúc: Đề xuất Tech Stack Toàn diện
**Dự án:** Ứng dụng "Chữa Lành Đảo Ngược" (Mobile Android App)
**Mục tiêu:** Cung cấp tài liệu chi tiết về toàn bộ các công nghệ, công cụ phát triển, giải pháp dữ liệu và hạ tầng lưu trữ được tối ưu hóa cho mô hình Vibe Coding (phát triển bằng AI Agent như Claude Code).

---

## 1. Tổng quan Kiến trúc Hệ thống (Architecture Overview)

Hệ thống được xây dựng theo mô hình **Client-Server độc lập**, giao tiếp thời gian thực thông qua **WebSockets** để đáp ứng khả năng xử lý đa phương thức (văn bản và âm thanh) mà không gây trễ cho trải nghiệm người dùng.

---

## 2. Chi tiết Thành phần Tech Stack

### 2.1. Frontend (Mobile App - Android)
Do đối tượng mục tiêu sử dụng thiết bị Samsung và ứng dụng được phân phối trực tiếp qua file `.apk` (không qua Google Play Store), chúng ta tối ưu hóa mã nguồn cho môi trường Android.

* **Framework chính:** `React Native` kết hợp với `Expo` (TypeScript).
    * *Lý do:* Đây là hệ sinh thái di động phổ biến nhất mà các AI Coding Agent (Claude Code, Cursor) hiểu cực kỳ sâu, giúp sinh code giao diện và animation chuẩn xác, ít lỗi nhất.
* **Tương tác Phần cứng (Hardware APIs):**
    * `expo-sensors` (Accelerometer): Trích xuất dữ liệu cảm biến gia tốc để bắt chính xác sự kiện **Lắc điện thoại (Shake to Rant)**.
    * `expo-haptics`: Điều khiển mô-tơ rung của máy Samsung ở các cấp độ lực khác nhau (`Heavy Impact`) phục vụ cho tính năng đập phá vật thể ảo.
    * `expo-av`: Quản lý Microphone để thu âm trực tiếp Nhật ký Audio với độ nhiễu thấp nhất trước khi đẩy về backend.
* **Hiệu ứng & Giao diện:** `React Native Reanimated` để dựng các chuyển động mượt mà (60-120fps) khi người dùng đập vỡ chữ hoặc tương tác với Avatar AI.

### 2.2. Backend & API Gateway
* **Framework chính:** `FastAPI` (Python).
    * *Lý do:* Tốc độ xử lý bất đồng bộ (Asynchronous) vượt trội, hỗ trợ native cho kết nối song công **WebSocket**, đồng thời tích hợp hoàn hảo với hệ sinh thái AI/Data Science của Python.
* **Giao thức truyền tải:** `WebSockets` cho luồng truyền nhận Audio/Text trực tiếp, kết hợp `RESTful API` cho các tác vụ cấu hình thông thường.

### 2.3. Trí tuệ Nhân tạo & Agentic Core (AI Engine)
* **Mô hình Ngôn ngữ Lớn (LLM):** `Claude 3.5 Sonnet` hoặc `Gemini 1.5 Pro` thông qua API. Đảm bảo năng lực suy luận logic cao, khả năng Roleplay giữ vai "Tsundere" mỏ hỗn xuất sắc và độ chính xác khi gọi công cụ (Tool Calling).
* **Framework Quản lý Agent (Kế hoạch A):** `LangGraph` hoặc `CrewAI` để tự xây dựng các trạng thái logic vòng lặp, điều phối dữ liệu giữa Router Agent và Persona Agent.
* **Giải pháp Thay thế/Dự phòng (Kế hoạch B):** Customize `OpenClaw` làm nhân cốt lõi (Core Agent).
* **Giao thức Gọi Công cụ (Tool Calling):** `Model Context Protocol (MCP)`. Agent sẽ sử dụng các MCP server để kích hoạt các lệnh ngược lại điện thoại (VD: đẩy notification khịa, ra lệnh rung haptics, tự đổi giao diện màu tối).

### 2.4. Khối Xử lý Cảm xúc Đa phương thức (Multimodal Emotion Engine)
Xử lý dữ liệu hội thoại và âm thanh thô trước khi đưa vào ngữ cảnh của Agent:
* **Text Embedding:** Sử dụng mô hình `PhoBERT` (được tối ưu riêng cho tiếng Việt văn ngữ và khẩu ngữ) để bóc tách ngữ nghĩa, phát hiện từ lóng, chửi thề hoặc sự bất ổn ngầm.
* **Audio Acoustic Feature Extraction:** Mô hình `emotion2vec` xử lý các đặc trưng vật lý của âm thanh (cao độ, nhịp điệu nói, khoảng lặng, tiếng thở dài) từ microphone.

### 2.5. Cơ sở Dữ liệu & Bộ nhớ (Database & Memory)
* **Primary DB & Vector DB:** `Supabase` (Tích hợp sẵn **PostgreSQL** và extension **pgvector**).
    * *Nhiệm vụ:* Lưu trữ thông tin log cá nhân và quản lý các đoạn ký ức dài hạn (RAG) phục vụ cho việc khịa lại chuyện cũ của Agent. Một giải pháp "tất cả trong một" giúp AI Agent viết và đọc DB cực kỳ dễ dàng.
* **Short-term Memory Cache:** `Redis` lưu giữ ngữ cảnh phiên chat hiện tại dưới dạng key-value, tự động giải phóng sau 12-24 giờ.

### 2.6. Hạ tầng Hosting & Triển khai (Infrastructure & DevOps)
* **Host Backend & Database:** `Render` (Chọn hạ tầng vùng **Singapore** để có ping kết nối về mạng Việt Nam thấp nhất). Render hỗ trợ quản lý biến môi trường tốt, tự động cập nhật mã nguồn trực tiếp từ GitHub.
* **Build & Ship Frontend:** `EAS (Expo Application Services)` sử dụng câu lệnh `eas build --platform android --profile preview` để đóng gói file `.apk` trên máy chủ cloud của Expo. Không cần cài đặt Android Studio nặng nề trên máy tính cá nhân.

---

## 3. Bản đồ Công cụ và Quy trình Phát triển (Workflow Tools)

```
[Claude Code / Cursor] ---> [Viết Code React Native + FastAPI]
                                   |
         +-------------------------+-------------------------+
         |                                                   |
 [Frontend Workflow]                                 [Backend Workflow]
  - Khởi tạo: Expo CLI                                - Cài đặt: Python venv, Pip
  - Build: EAS CLI -> File .apk                       - Deploy: Kết nối Github với Render
  - Test: Expo Go trên Samsung                        - Data: Cấu hình Supabase Vector
```
