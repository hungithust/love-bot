# Tài liệu Brainstorm: Ý tưởng Phát triển Ứng dụng Di động "Chữa Lành Đảo Ngược"
**Đối tượng mục tiêu:** 01 Người dùng duy nhất (Nữ, vừa thất tình, cá tính mạnh, ngang ngược, không thích bị chỉ dẫn/dạy đời).
**Triết lý thiết kế:** Tối đa hóa UX cá nhân, áp dụng Tâm lý học đảo ngược (Reverse Psychology), tạo Ảo giác về quyền kiểm soát (Illusion of Control), và tích hợp Agentic AI đa phương thức.

---

## 1. Định hướng Concept & AI Persona

Thay vì tiếp cận theo hướng "chữa lành độc hại" (toxic positivity) hoặc ép buộc người dùng vào các khuôn khổ, ứng dụng sẽ đóng vai trò là một không gian an toàn nhưng đầy tính khiêu khích, kích thích cái tôi độc lập của cô ấy để tự vượt qua nỗi buồn.

* **Persona của AI Agent ("Tsundere" / Sarcastic Buddy):**
    * Không dỗ dành sáo rỗng, không dùng văn mẫu "Bạn sẽ ổn thôi".
    * Đóng vai một người bạn thân "mỏ hỗn", chuyên châm biếm (sarcasm) nhưng mục đích ngầm là bảo vệ và giữ cho cô ấy tỉnh táo.
    * *Ví dụ tương tác:* `"Tưởng nay nằm khóc ướt gối không thèm log in nữa cơ?"` hoặc `"Tính nhắn tin cho người yêu cũ à? Đưa điện thoại đây tôi khóa lại cho, đừng làm trò hề nữa."`
* **Giao diện Động theo Vibe (Chaos UI):**
    * Giao diện thay đổi theo thời gian thực dựa trên trạng thái cảm xúc.
    * Cho phép người dùng "ra lệnh" cho AI thay đổi toàn bộ giao diện theo ý muốn bằng ngôn ngữ tự nhiên (`"Đổi web thành màu đen cho tôi"`, `"Bật bài nhạc nào ồn ào nhất lên"`). Việc này thỏa mãn cảm giác làm chủ không gian của một người không thích bị kiểm soát.

---

## 2. Gamification Đảo Ngược (Anti-Gamification)

Né tránh các nhiệm vụ (quests) truyền thống vốn dễ gây cảm giác bị ép buộc. Thay vào đó, ứng dụng sử dụng các cơ chế kích tướng.

* **Cơ chế Kèo Cá Cược (Bets / Anti-Quests):**
    * Thay vì bảo: *"Hãy đi dạo 10 phút"*, AI sẽ thách thức: *"Cược 100 điểm là hôm nay cậu không dám lết xác ra khỏi nhà"*.
    * Nếu cô ấy "nóng máu" làm ngược lại để chứng minh AI sai, cô ấy thắng cược và có quyền bắt AI làm trò hề hoặc nhận phần thưởng.
* **Phần thưởng của sự chống đối:** Đôi khi việc cô ấy nhấn nút "Từ chối" hoặc "Kệ tôi" lại chính là trigger ngầm để hệ thống cộng điểm, ghi nhận sự độc lập.
* **Căn phòng đập phá ảo (Rage Room):**
    * Nơi trút giận vật lý. Mỗi khi cô ấy gõ tên người cũ hoặc một ký ức tồi tệ, cô ấy có thể chọn vũ khí (búa, gậy, lựu đạn) để đập nát hoặc đốt cháy dòng text đó trên màn hình.
* **Gacha Bóc Phốt (Savage Quotes):**
    * Tích điểm từ việc "chống đối" để quay Gacha. Phần thưởng là các câu quote cực phũ, bóc trần sự tệ hại của người cũ hoặc các meme hài hước giúp củng cố tư tưởng "chia tay là đúng đắn".

---

## 3. Các Tính Năng Độc Quyền Trên Mobile (Mobile Hardware Integration)

Chuyển đổi từ Web sang Mobile App giúp tận dụng tối đa phần cứng điện thoại để tăng cường trải nghiệm tương tác vật lý:

* **Lắc để chửi (Shake to Rant):** Khi đang tức giận, cô ấy chỉ cần lắc mạnh điện thoại. App lập tức kích hoạt màn hình "Hố đen cảm xúc" (Venting Void) với background đỏ rực, tự động bật microphone để ghi âm lời phàn nàn mà không cần bấm nút phức tạp.
* **Phản hồi xúc giác bạo lực (Heavy Haptic Feedback):** Khi thực hiện các hành động dứt khoát như xóa ảnh cũ, block từ khóa, hoặc đập phá đồ vật ảo, điện thoại sẽ rung mạnh (Heavy Impact) để mang lại cảm giác giải tỏa tối đa.
* **Thông báo đẩy châm biếm (Sarcastic Push Notifications):**
    * AI tự động gửi thông báo dựa trên bối cảnh thời gian hoặc hành vi.
    * *11h đêm:* `"Đừng có tò mò vào xem story của nó nữa, đi ngủ đi."`
    * *Sau 2 ngày không mở app:* `"Ủa tự chữa lành xong rồi hả? Hay lại lén lút nhắn tin lại với nó rồi?"`

---

## 4. Giải Pháp Kỹ Thuật Frontend & Luồng User Flow

Để tối ưu hóa thời gian phát triển (nhắm tới mô hình MVP nhanh chóng) mà vẫn đạt hiệu quả UX mượt mà:

### Lựa chọn Tech Stack:
1.  **React Native + Expo:**
    * *Lý do:* Hệ sinh thái được các AI coding agent (Claude, Cursor) hỗ trợ tốt nhất, sinh code UI chuẩn xác.
    * *Ưu điểm:* Dễ tích hợp thư viện animation (`React Native Reanimated`) và `Haptic Feedback`. Build file cài đặt (APK/TestFlight) cực nhanh qua Expo.
2.  **Flutter:**
    * *Lý do:* Phù hợp nếu muốn app thiên về hiệu ứng đồ họa 2D game, xử lý va chạm vật lý rơi vỡ, cháy nổ mượt mà (60-120fps).
3.  **PWA (Progressive Web App):**
    * *Giải pháp thay thế:* Nếu vẫn muốn dùng Web Tech (ReactJS/NextJS) nhưng có icon trên màn hình điện thoại, chạy full-screen và không cần qua các chợ ứng dụng phiền phức.

### Thiết kế Luồng UI (Bottom-Up):
* **Không Onboarding:** Mở app là vào thẳng màn hình chính, không hướng dẫn rườm rà. Nếu bấm sai, AI sẽ nhảy ra nhắc nhở châm biếm để cô ấy tự mày mò.
* **Màn hình chính tối giản linh động:** Chỉ gồm một Avatar AI (hoặc thú cưng mặt cọc) đang ngồi bấm điện thoại. Cô ấy chạm vào hoặc nói chuyện thì thực thể này mới tương tác lại, tránh cảm giác bị làm phiền.

---

## 5. Định Hướng Agentic AI Workflow (Backend Hint)

* **Nhận diện cảm xúc đa phương thức (Multimodal Input):** Kết hợp phân tích ngữ nghĩa văn bản tiếng Việt và phân tích tone giọng từ Nhật ký Audio (Speech-to-Text) để đánh giá xem mood thực tế của cô ấy là đang buồn, đang cáu, hay đang giả vờ ổn.
* **Hệ thống Đa Tác Vụ (Multi-Agent System):**
    * *Agent 1 (Quest Master):* Thách thức và đưa ra các kèo cá cược dựa trên mood.
    * *Agent 2 (Meme/Joke Generator):* Săn tìm hoặc tự chế các nội dung châm biếm hợp gu.
    * *Agent 3 (Cảnh vệ ngầm):* Theo dõi các dấu hiệu suy sụp nghiêm trọng để tự động lùi lại, hạ giọng và đưa ra sự hỗ trợ kịp thời khi cần thiết.
