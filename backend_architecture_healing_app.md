# Tài liệu Kỹ thuật (Technical Design): Kiến trúc Backend & Agentic AI
**Mục tiêu:** Cung cấp bản thiết kế hệ thống (Architecture Blueprint) tối ưu để sử dụng làm ngữ cảnh đầu vào (context) cho các công cụ AI coding assistant (như Claude Code) trong quá trình phát triển (vibe coding).

---

## 1. Kiến trúc Hệ thống Tổng quan (System Architecture)

Hệ thống được thiết kế theo kiến trúc Microservices/Modular để đảm bảo tính thời gian thực (real-time) và khả năng mở rộng cho việc xử lý đa phương thức (Multimodal).

*   **Frontend (Client):** Mobile App (React Native/Expo hoặc Flutter).
*   **API Gateway/Web Server:** FastAPI (Python) hoặc Node.js để quản lý kết nối WebSocket và RESTful API.
*   **AI Backend (Agentic Engine):** Quản lý luồng suy luận của AI thông qua framework Multi-Agent (Auto-Gen hoặc LangGraph).
*   **Database:**
    *   *Primary DB:* PostgreSQL/MongoDB (lưu trữ thông tin user, log cấu hình).
    *   *Cache/Short-term Memory:* Redis (lưu trữ phiên chat hiện tại).
    *   *Long-term Memory (Vector DB):* ChromaDB, Qdrant hoặc Pinecone (lưu trữ ký ức và RAG).

---

## 2. Luồng Dữ liệu Đa phương thức (Multimodal Data Pipeline)

Xử lý đồng thời văn bản và âm thanh giao tiếp thông thường để trích xuất cảm xúc theo thời gian thực.

1.  **Ingestion (Thu thập & Truyền tải):** 
    *   Dữ liệu (Text, Audio thô từ tính năng "Lắc để chửi") được truyền qua WebSocket để giảm độ trễ.
2.  **Multimodal Emotion Engine:**
    *   **Text Embedding (Ngữ nghĩa):** Sử dụng các mô hình ngôn ngữ chuyên biệt cho tiếng Việt (như PhoBERT) để phân tích các câu từ lóng, sự cáu bẳn hoặc mức độ tiêu cực trong văn bản.
    *   **Audio Acoustic (Âm học):** Đưa luồng âm thanh qua các mô hình trích xuất đặc trưng (như emotion2vec) để bắt tông giọng, nhịp thở, độ nhấn nhá.
    *   **Fusion Layer (Dung hợp):** Ghép nối vector đặc trưng từ Text và Audio để phân loại chính xác trạng thái cảm xúc (VD: *Tức giận bề mặt nhưng thực chất buồn bã, Trung tính, Châm biếm*).
3.  **Context Builder:**
    *   Đóng gói "Trạng thái cảm xúc" + "Lịch sử tương tác ngắn hạn" thành `Context Payload` để chuyển giao cho hệ thống Multi-Agent.

---

## 3. Hệ thống Đa Tác vụ (Multi-Agent System - MAS)

Không sử dụng một prompt khổng lồ duy nhất. Hệ thống chia nhỏ thành các Agent chuyên biệt, tương tác với nhau và với môi trường.

*   **Router Agent (Điều phối viên):**
    *   Phân tích `Context Payload` và quyết định kích hoạt Agent nào.
*   **Persona Agent (Tsundere / Sarcastic Buddy):**
    *   *Nhiệm vụ:* Sinh ra phản hồi ngôn ngữ tự nhiên, châm biếm, khích tướng nhưng vẫn nằm trong ranh giới an toàn.
    *   *Model đề xuất:* Claude 3.5 Sonnet hoặc các LLM có khả năng suy luận logic và roleplay xuất sắc.
*   **Action / Tool Agent (Đặc biệt quan trọng cho Mobile):**
    *   *Cơ chế:* Cấu hình các công cụ thông qua giao thức **Model Context Protocol (MCP)**.
    *   *Các Tool cụ thể:*
        *   `trigger_haptic_feedback(intensity="heavy")`: Yêu cầu client rung mạnh.
        *   `change_theme(mode="chaos")`: Đổi giao diện client.
        *   `schedule_notification(time, message)`: Lên lịch gửi push notification khịa user.

---

## 4. Kiến trúc Bộ nhớ (Memory & RAG)

Để AI Agent "nhớ dai" và tạo cảm giác thân thuộc như một người bạn thực sự.

*   **Bộ nhớ ngắn hạn (Short-term):** Lưu trong RAM/Redis theo từng Session. Reset khi người dùng không tương tác sau một khoảng thời gian nhất định (ví dụ: 12 tiếng).
*   **Bộ nhớ dài hạn (Long-term / Vector RAG):**
    *   Các sự kiện chính, những lần người dùng yếu lòng, hoặc những chi tiết về "người cũ" được chunking, embedding và đưa vào Vector DB.
    *   Khi Agent generate câu trả lời, nó sẽ thực hiện truy vấn RAG để lấy các ký ức này ra làm "vũ khí" châm biếm (VD: *"Hôm trước vừa kêu xóa số nó rồi cơ mà?"*).
*   **Ngoại lệ "Hố Đen" (The Venting Void Exception):**
    *   Mọi dữ liệu đi qua module "Hố đen đập phá" bắt buộc bị loại trừ khỏi quy trình Embedding và Vector DB. 
    *   API Backend thực thi lệnh `DROP`/`DELETE` ngay trên RAM sau khi xử lý xong hiệu ứng UI, đảm bảo sự tin tưởng tuyệt đối của người dùng vào tính riêng tư.
