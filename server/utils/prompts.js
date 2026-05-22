const PROMPTS = {
  // Smart Organizer - Classify file content
  classifyFile: (text, existingFolders = []) => {
    let foldersContext = "";
    if (existingFolders && existingFolders.length > 0) {
      foldersContext = `
Dưới đây là danh sách các THƯ MỤC HIỆN CÓ trong hệ thống:
${JSON.stringify(existingFolders, null, 2)}

QUY TẮC PHÂN LOẠI (đọc kỹ trước khi quyết định):

A) **MERGE vào thư mục có sẵn** CHỈ KHI thoả MỌI điều kiện sau:
   1. Môn học (subject) TRÙNG CHÍNH XÁC với subject của thư mục đó.
      VD đúng: "Toán" = "Toán"; "Tin học" = "Tin học"
      VD SAI: "Toán" ≠ "Vật lý"; "Tin học" ≠ "Hóa học"; "Sinh học" ≠ "Hóa học"
   2. VÀ chapter cùng chủ đề tổng quát (VD: cùng "Hàm số bậc 2", hoặc cùng "Lập trình HTML")
   3. VÀ tài liệu mới rõ ràng thuộc cùng phạm vi kiến thức.

B) **TẠO THƯ MỤC MỚI** nếu một trong các điều kiện sau đúng:
   - Subject khác hẳn (VD tài liệu Tin học mà chỉ có thư mục Hóa học → BẮT BUỘC tạo mới)
   - Chapter khác hoàn toàn dù cùng subject
   - Không chắc chắn → MẶC ĐỊNH tạo mới (an toàn hơn nhồi nhét)

CẢNH BÁO QUAN TRỌNG: KHÔNG được merge tài liệu vào thư mục có subject khác. Thà tạo nhiều thư mục riêng hơn là gom nhầm. Cùng grade (cùng khối lớp) HOẶC cùng vài tag rời rạc KHÔNG đủ để merge.
`;
    } else {
      foldersContext = `Hiện tại hệ thống chưa có thư mục nào. Bạn hãy tự động tạo thư mục và tag mới tối ưu nhất dựa trên nội dung tài liệu.`;
    }

    return `Bạn là trợ lý AI chuyên phân loại tài liệu giáo dục.

Hãy đọc nội dung tài liệu sau và phân tích:
---
${text.substring(0, 4000)}
---
${foldersContext}

Trả về các trường:
- subject: Tên môn học (VD: Toán, Vật lý, Hóa học, Sinh học, Lịch sử, Địa lý, Ngữ văn, Tiếng Anh...)
- chapter: Tên chương/bài cụ thể
- grade: Khối lớp (VD: 10, 11, 12)
- folder_name: Tên Môn / Tên Chương (Bắt buộc trùng khớp tên thư mục có sẵn nếu chọn phân loại vào thư mục đó)
- summary: Tóm tắt nội dung trong 2 câu ngắn gọn
- tags: Mảng 3-5 tag ngắn`;
  },

  // Classify image
  classifyImage: (existingFolders = []) => {
    let foldersContext = "";
    if (existingFolders && existingFolders.length > 0) {
      foldersContext = `
Dưới đây là danh sách các THƯ MỤC HIỆN CÓ trong hệ thống:
${JSON.stringify(existingFolders, null, 2)}

QUY TẮC PHÂN LOẠI:
A) MERGE vào thư mục có sẵn CHỈ KHI subject TRÙNG CHÍNH XÁC và chapter cùng chủ đề tổng quát.
B) TẠO THƯ MỤC MỚI nếu subject khác hẳn, hoặc không chắc chắn.
CẢNH BÁO: KHÔNG được merge tài liệu vào thư mục có subject khác hẳn. Cùng grade hoặc vài tag rời rạc KHÔNG đủ để merge.
`;
    } else {
      foldersContext = `Hiện tại hệ thống chưa có thư mục nào. Bạn hãy tự động tạo thư mục và tag mới tối ưu nhất dựa trên hình ảnh tài liệu.`;
    }

    return `Bạn là trợ lý AI chuyên phân loại tài liệu giáo dục.

Hãy xem hình ảnh tài liệu này và phân tích nội dung.
${foldersContext}

Trả về các trường: subject, chapter, grade, folder_name, summary (2 câu), tags (3-5 tag).`;
  },

  // Cheat Sheet Generator - JSON structured output
  generateCheatSheet: (allTexts) => `Bạn là một thủ khoa xuất sắc đang tạo phao cứu cấp TOÀN DIỆN cho kỳ thi.

Đọc TOÀN BỘ tài liệu dưới đây và tổng hợp kiến thức trọng tâm thành phao cứu cấp có cấu trúc:

---TOÀN BỘ TÀI LIỆU---
${allTexts.substring(0, 100000)}
---HẾT TÀI LIỆU---

YÊU CẦU CẤU TRÚC:
- title: Tiêu đề ngắn gọn (VD: "Phao Cứu Cấp - Tin học THPTQG")
- sections: Mảng các phần. Mỗi phần có heading và mảng blocks
- Mỗi block có 1 trong 5 type:
  * "formula": Công thức / cú pháp / quy tắc. content là LaTeX HỢP LỆ hoặc code thuần (KHÔNG bọc $ hay $$). caption là tên.
    VD: { type: "formula", content: "F = ma", caption: "Định luật II Newton", term: null, items: null }
  * "definition": Định nghĩa / thuật ngữ. term là từ khóa, content là định nghĩa.
    VD: { type: "definition", term: "Vận tốc tức thời", content: "Đạo hàm bậc nhất của tọa độ theo thời gian", caption: null, items: null }
  * "list": Danh sách. items là mảng các điểm. content là mô tả ngắn (có thể "").
    VD: { type: "list", content: "Các bước giải bài toán", items: ["Phân tích lực", "Áp dụng định luật II"], term: null, caption: null }
  * "example": Ví dụ minh họa. content là đề bài + lời giải / đoạn code ngắn.
  * "note": Mẹo ghi nhớ / lưu ý quan trọng / dễ nhầm lẫn.

QUY TẮC SỐNG CÒN — ĐỌC KỸ:
1. **PHẢI BAO PHỦ TOÀN BỘ tài liệu, KHÔNG được bỏ sót chủ đề nào quan trọng**. Đây là phao THI nên thiếu kiến thức = học sinh trượt. Nếu tài liệu nhắc đến HTML, CSS, Python, SQL, mạng máy tính, thuật toán, cơ sở dữ liệu... thì TẤT CẢ những chủ đề đó phải có riêng 1 section.
2. **Đếm số chủ đề lớn trong tài liệu trước khi viết**. Sau đó tạo SỐ SECTION = SỐ CHỦ ĐỀ. Tối thiểu 6 sections cho tài liệu trung bình, 10+ sections cho tài liệu dài (>30 trang).
3. **Tổng số blocks tối thiểu 30**, tỷ lệ thuận với độ dài tài liệu. Tài liệu dài 100 trang thì có thể 60-80 blocks.
4. **Mỗi section có 3-8 blocks** — không section nào quá lèo tèo 1-2 blocks.
5. LUÔN điền đủ 5 field cho mỗi block: type, content, term, items, caption. Field không dùng set null.
6. Code mẫu (HTML/Python/SQL...) đặt vào "example" hoặc "formula", giữ syntax chính xác.
7. Viết bằng tiếng Việt, ngắn gọn nhưng KHÔNG HỜI HỢT — đủ chi tiết để học sinh hiểu khi xem lại.

CẢNH BÁO: KHÔNG được dừng sớm. Tài liệu càng dài, phao càng dày. Đừng tóm tắt chỉ 3-4 mục đầu rồi bỏ phần còn lại.`,

  // Podcast Script Generator
  generatePodcastScript: (allTexts) => `Bạn là biên kịch Podcast giáo dục. Viết kịch bản nói chuyện giữa 2 MC:
- MC_A (Nam, tên là Minh): Người hỏi, tò mò, hay đặt câu hỏi thú vị
- MC_B (Nữ, tên là Lan): Người giải thích, hóm hỉnh, dùng ví dụ đời thường dễ hiểu

Nội dung dựa trên tài liệu:
---
${allTexts.substring(0, 20000)}
---

YÊU CẦU QUAN TRỌNG ĐỂ CÓ GIỌNG ĐỌC TỰ NHIÊN:
- Hai MC xưng hô với nhau là Minh / Lan (hoặc cậu / tớ). TUYỆT ĐỐI KHÔNG gọi nhau là "A" hay "B".
- Với CHỮ VIẾT TẮT tiếng Anh (MC, GPA, STEM, IELTS...), phiên âm sang cách đọc tiếng Việt ("em xi", "G P A", "xì tem", "ai eo") để máy TTS không đánh vần từng chữ.
- Với TỪ / CỤM TỪ tiếng Anh hoàn chỉnh (VD: "Personal Statement", "Depth over Ambition") GIỮ NGUYÊN tiếng Anh, không phiên âm — TTS sẽ tự phát âm chuẩn.
- Kịch bản SÁNG TẠO, lôi cuốn, có màn tung hứng / phản biện / ví dụ hài hước.
- Kiến thức (đặc biệt Lịch sử, Khoa học) phải CHÍNH XÁC TUYỆT ĐỐI và ĐẦY ĐỦ các ý quan trọng từ tài liệu.
- Số lượt thoại LINH HOẠT (10-30 lượt) phù hợp dung lượng tài liệu gốc.
- Mỗi câu thoại tự nhiên như nói chuyện đời thường, vui vẻ, gần gũi.

Trả về object có field "lines" là mảng các lượt thoại, mỗi item có speaker ("MC_A" hoặc "MC_B") và text.`,

  // Two-step podcast: step 1 — extract knowledge as a faithful summary
  summarizeForPodcast: (allTexts) => `Hãy đọc tài liệu học tập sau và trích xuất TOÀN BỘ kiến thức, sự kiện, khái niệm cốt lõi. Đảm bảo tính chính xác tuyệt đối về mặt học thuật (đặc biệt với Lịch sử, Khoa học). Độ dài bản tóm tắt tỉ lệ thuận với lượng kiến thức trong tài liệu gốc — không giới hạn từ, đảm bảo ĐÚNG và ĐỦ:

${allTexts.substring(0, 30000)}`,

  // Learning Resource Recommender
  recommendResources: (allTexts) => `Bạn là chuyên gia tư vấn học thuật. Đọc nội dung tài liệu dưới đây và gợi ý các nguồn tài nguyên học tập phù hợp nhất.

---TÀI LIỆU---
${allTexts.substring(0, 15000)}
---HẾT TÀI LIỆU---

YÊU CẦU:
1. Phân tích chủ đề chính, môn học, các khái niệm quan trọng trong tài liệu.
2. Gợi ý 6-8 nguồn tài nguyên học tập gồm video YouTube, podcast, bài viết / khóa học online.
3. Chia đều: 3-4 nguồn Tiếng Việt + 3-4 nguồn Tiếng Anh.
4. Mỗi gợi ý có từ khóa tìm kiếm YouTube CỤ THỂ và CHÍNH XÁC.

Mỗi item có 7 field: title, type (video/podcast/article), language (vi/en), search_query, description (1-2 câu vì sao hữu ích), topic_match (chủ đề cụ thể trong tài liệu nguồn này bao phủ), source_hint (tên kênh / nguồn gợi ý, VD: "Khan Academy", "TED-Ed", "ĐH Bách Khoa"...).`,

  // Handwriting Analysis - choose closest Google Font handwriting style
  analyzeHandwriting: () => `Bạn là chuyên gia phân tích kiểu chữ viết tay.

Hãy xem ảnh chữ viết tay này (có thể là tiếng Việt) và phân tích đặc điểm:
- Độ nghiêng (slant): upright (đứng), slight-right (nghiêng nhẹ phải), strong-right (nghiêng mạnh phải), left (nghiêng trái)
- Độ dày (weight): thin (mảnh), regular (vừa), bold (đậm)

Sau đó CHỌN 1 trong 5 font Google Fonts handwriting sau, font nào GIỐNG NHẤT phong cách chữ viết:

1. **Caveat**: Chữ viết casual, nghiêng nhẹ phải, dày vừa, nét cong tự nhiên — phù hợp người viết bình thường, hơi nhanh.
2. **Patrick Hand**: Chữ in tay khá đứng, nét đều, đậm vừa, rõ ràng — phù hợp người viết cẩn thận, ngay ngắn.
3. **Dancing Script**: Chữ thư pháp nối liền, nghiêng mạnh phải, nét mảnh — phù hợp người viết bay bướm, có nét nối.
4. **Pacifico**: Chữ tròn trịa, đậm, mềm mại, nghiêng vừa — phù hợp người viết tròn đầy, vui tươi.
5. **Be Vietnam Pro Italic**: Chữ italic kiểu sách giáo khoa, đứng đắn, nghiêng nhẹ — phù hợp người viết chuẩn mực, đều tăm tắp.

Trả về:
- font_family: Tên font đã chọn (chính xác như trên)
- reasoning: Giải thích ngắn vì sao chọn (1-2 câu, tiếng Việt)
- slant: Một trong upright/slight-right/strong-right/left
- weight: Một trong thin/regular/bold`,

  // Convert legacy markdown cheat sheet to JSON structure
  migrateMarkdownToJson: (markdown) => `Bạn nhận được một phao cứu cấp dạng Markdown cũ. Hãy chuyển nó thành cấu trúc JSON mới.

---MARKDOWN GỐC---
${markdown.substring(0, 20000)}
---HẾT---

YÊU CẦU CẤU TRÚC:
- title: Lấy tiêu đề chính từ markdown
- sections: Mỗi heading ## hoặc ### thành một section
- blocks trong section: phân loại nội dung thành 5 type (formula/definition/list/example/note)
  * Dòng có $...$ hoặc $$...$$ hoặc dấu = thường → "formula" (lấy LaTeX bên trong, BỎ dấu $ hay $$)
  * Dòng có dạng "Thuật ngữ: định nghĩa" hoặc "**Term**: ..." → "definition"
  * Danh sách gạch đầu dòng (- hoặc *) → "list" với items là các điểm
  * Đoạn có "ví dụ" / "VD" → "example"
  * Đoạn có "Mẹo" / "Lưu ý" / "Ghi nhớ" → "note"
  * Đoạn còn lại → "note"
- LUÔN điền đủ 5 field type/content/term/items/caption (set null cho field không dùng).
- Giữ nguyên ngôn ngữ tiếng Việt.`
};

module.exports = PROMPTS;
