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
  generateCheatSheet: (allTexts) => `Bạn là một thủ khoa xuất sắc đang tạo phao cứu cấp cho kỳ thi.

Đọc toàn bộ tài liệu dưới đây và tổng hợp kiến thức trọng tâm thành phao cứu cấp có cấu trúc:

---TOÀN BỘ TÀI LIỆU---
${allTexts.substring(0, 30000)}
---HẾT TÀI LIỆU---

YÊU CẦU CẤU TRÚC:
- title: Tiêu đề ngắn gọn (VD: "Phao Cứu Cấp - Dao Động Cơ")
- sections: Mảng các phần (3-6 phần), mỗi phần có heading và mảng blocks
- Mỗi block có 1 trong 5 type:
  * "formula": Công thức. content phải là LaTeX HỢP LỆ (KHÔNG bọc $ hay $$). caption là tên công thức.
    VD: { type: "formula", content: "F = ma", caption: "Định luật II Newton", term: null, items: null }
  * "definition": Định nghĩa/thuật ngữ. term là từ khóa, content là định nghĩa.
    VD: { type: "definition", term: "Vận tốc tức thời", content: "Đạo hàm bậc nhất của tọa độ theo thời gian", caption: null, items: null }
  * "list": Danh sách. items là mảng các điểm. content là mô tả ngắn (có thể là chuỗi rỗng "").
    VD: { type: "list", content: "Các bước giải bài toán", items: ["Phân tích lực", "Áp dụng định luật II", "..."], term: null, caption: null }
  * "example": Ví dụ minh họa. content là đề bài + lời giải ngắn.
    VD: { type: "example", content: "Vật m=2kg chịu lực F=10N thì a = F/m = 5 m/s²", term: null, items: null, caption: "Bài tập áp dụng" }
  * "note": Mẹo ghi nhớ / lưu ý quan trọng. content là nội dung.
    VD: { type: "note", content: "Nhớ: hai lực cân bằng tác dụng lên CÙNG một vật, hai lực trực đối tác dụng lên HAI vật khác nhau", term: null, items: null, caption: null }

QUY TẮC QUAN TRỌNG:
- LUÔN điền đủ 5 field cho mỗi block: type, content, term, items, caption. Field không dùng thì set null (term/caption) hoặc null (items).
- Công thức LaTeX KHÔNG bọc $ hay $$ — chỉ ghi nội dung LaTeX thuần (VD: "\\\\frac{1}{2}mv^2").
- Viết bằng tiếng Việt, ngắn gọn súc tích.
- Bao phủ TẤT CẢ kiến thức trọng tâm trong tài liệu: công thức, định nghĩa, mẹo, ví dụ điển hình.
- Tối thiểu 3 sections, tối thiểu 8 blocks tổng cộng.`,

  // Podcast Script Generator
  generatePodcastScript: (allTexts) => `Bạn là biên kịch Podcast giáo dục. Viết kịch bản nói chuyện giữa 2 MC:
- MC_A (Nam): Người hỏi, tò mò, hay đặt câu hỏi thú vị
- MC_B (Nữ): Người giải thích, hóm hỉnh, dùng ví dụ đời thường dễ hiểu

Nội dung dựa trên tài liệu:
---
${allTexts.substring(0, 20000)}
---

YÊU CẦU:
- Trả về object có field "lines" là mảng các lượt thoại
- Mỗi lượt thoại có speaker ("MC_A" hoặc "MC_B") và text
- Mỗi câu thoại ngắn (1-3 câu), tự nhiên như nói chuyện
- Giọng điệu vui vẻ, gần gũi học sinh
- Bao phủ các kiến thức quan trọng nhất
- Khoảng 15-25 lượt thoại`,

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
