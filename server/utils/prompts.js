const PROMPTS = {
  // Smart Organizer - Classify file content
  classifyFile: (text, existingFolders = []) => {
    let foldersContext = "";
    if (existingFolders && existingFolders.length > 0) {
      foldersContext = `
Dưới đây là danh sách các THƯ MỤC HIỆN CÓ trong hệ thống học tập của người dùng:
${JSON.stringify(existingFolders, null, 2)}

YÊU CẦU QUAN TRỌNG VỀ PHÂN LOẠI:
1. Hãy đối chiếu cẩn thận tài liệu mới này với danh sách thư mục hiện có trên.
2. Nếu tài liệu mới có cùng Môn học (subject), Chương (chapter), Khối lớp (grade) hoặc chia sẻ nhiều từ khóa (tags)/chủ đề tương tự với một thư mục có sẵn, bạn BẮT BUỘC phải sắp xếp tài liệu này vào thư mục đó bằng cách trả về đúng "folder_name", "subject", "chapter", và "grade" của thư mục có sẵn đó. Cố gắng tái sử dụng các từ khóa có sẵn trong danh sách "tags" của thư mục đó nếu chúng phù hợp với tài liệu mới này.
3. Chỉ khi tài liệu mới nói về một chủ đề/môn học hoàn toàn khác và KHÔNG THỂ xếp chung vào bất kỳ thư mục có sẵn nào, bạn mới đề xuất tạo thư mục mới bằng cách trả về một "folder_name" mới, môn học mới, chương mới, khối lớp mới và các tag mới tương ứng.
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

Trả về JSON (KHÔNG có markdown code block, CHỈ JSON thuần):
{
  "subject": "Tên môn học (VD: Toán, Vật lý, Hóa học, Sinh học, Lịch sử, Địa lý, Ngữ văn, Tiếng Anh...)",
  "chapter": "Tên chương/bài cụ thể",
  "grade": "Khối lớp (VD: 10, 11, 12)",
  "folder_name": "Tên Môn / Tên Chương (Bắt buộc trùng khớp tên thư mục có sẵn nếu chọn phân loại vào thư mục đó)",
  "summary": "Tóm tắt nội dung trong 2 câu ngắn gọn",
  "tags": ["tag1", "tag2", "tag3"]
}`;
  },

  // Classify image
  classifyImage: (existingFolders = []) => {
    let foldersContext = "";
    if (existingFolders && existingFolders.length > 0) {
      foldersContext = `
Dưới đây là danh sách các THƯ MỤC HIỆN CÓ trong hệ thống học tập của người dùng:
${JSON.stringify(existingFolders, null, 2)}

YÊU CẦU QUAN TRỌNG VỀ PHÂN LOẠI:
1. Hãy đối chiếu cẩn thận hình ảnh tài liệu mới này với danh sách thư mục hiện có trên.
2. Nếu tài liệu mới có cùng Môn học (subject), Chương (chapter), Khối lớp (grade) hoặc chia sẻ nhiều từ khóa (tags)/chủ đề tương tự với một thư mục có sẵn, bạn BẮT BUỘC phải sắp xếp tài liệu này vào thư mục đó bằng cách trả về đúng "folder_name", "subject", "chapter", và "grade" của thư mục có sẵn đó. Cố gắng tái sử dụng các từ khóa có sẵn trong danh sách "tags" của thư mục đó nếu chúng phù hợp với tài liệu mới này.
3. Chỉ khi tài liệu mới nói về một chủ đề/môn học hoàn toàn khác và KHÔNG THỂ xếp chung vào bất kỳ thư mục có sẵn nào, bạn mới đề xuất tạo thư mục mới bằng cách trả về một "folder_name" mới, môn học mới, chương mới, khối lớp mới và các tag mới tương ứng.
`;
    } else {
      foldersContext = `Hiện tại hệ thống chưa có thư mục nào. Bạn hãy tự động tạo thư mục và tag mới tối ưu nhất dựa trên hình ảnh tài liệu.`;
    }

    return `Bạn là trợ lý AI chuyên phân loại tài liệu giáo dục.

Hãy xem hình ảnh tài liệu này và phân tích nội dung.
${foldersContext}

Trả về JSON (KHÔNG có markdown code block, CHỈ JSON thuần):
{
  "subject": "Tên môn học",
  "chapter": "Tên chương/bài cụ thể",
  "grade": "Khối lớp",
  "folder_name": "Tên Môn / Tên Chương (Bắt buộc trùng khớp tên thư mục có sẵn nếu chọn phân loại vào thư mục đó)",
  "summary": "Tóm tắt nội dung trong 2 câu ngắn gọn",
  "tags": ["tag1", "tag2", "tag3"]
}`;
  },

  // Cheat Sheet Generator
  generateCheatSheet: (allTexts) => `Bạn là một thủ khoa xuất sắc. Hãy đọc toàn bộ tài liệu dưới đây và trích xuất kiến thức trọng tâm.

---TOÀN BỘ TÀI LIỆU---
${allTexts.substring(0, 30000)}
---HẾT TÀI LIỆU---

YÊU CẦU:
1. Trích xuất TẤT CẢ công thức trọng tâm, bắt buộc dùng ký tự LaTeX (bọc trong $...$ hoặc $$...$$)
2. Liệt kê các định nghĩa quan trọng, thuật ngữ dễ nhầm lẫn
3. Các mốc sự kiện/dữ liệu xương máu (nếu có)
4. Mẹo ghi nhớ nhanh

Trả về định dạng MARKDOWN phân cấp mạch lạc với heading ##, ###, danh sách gạch đầu dòng.
Viết ngắn gọn, súc tích - đây là tài liệu ôn tập nhanh trước giờ thi.`,

  // Podcast Script Generator
  generatePodcastScript: (allTexts) => `Bạn là biên kịch Podcast giáo dục. Viết kịch bản nói chuyện giữa 2 MC:
- MC_A (Nam): Người hỏi, tò mò, hay đặt câu hỏi thú vị
- MC_B (Nữ): Người giải thích, hóm hỉnh, dùng ví dụ đời thường dễ hiểu

Nội dung dựa trên tài liệu:
---
${allTexts.substring(0, 20000)}
---

YÊU CẦU:
- Mỗi câu thoại ngắn (1-3 câu), tự nhiên như nói chuyện
- Giọng điệu vui vẻ, gần gũi học sinh
- Bao phủ các kiến thức quan trọng nhất
- Khoảng 15-25 lượt thoại

Trả về JSON (KHÔNG có markdown code block, CHỈ JSON thuần):
[
  {"speaker": "MC_A", "text": "Ê, hôm nay mình nói về..."},
  {"speaker": "MC_B", "text": "Ừ, cái này hay lắm..."},
  ...
]`
};

module.exports = PROMPTS;
