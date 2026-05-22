const PROMPTS = {
  // Smart Organizer - Classify file content
  classifyFile: (text, existingFolders = [], filename = "") => {
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

Tên file: ${filename || 'Không rõ'}

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
  generateCheatSheet: (allTexts, folderName = "") => `Bạn là một thủ khoa xuất sắc. Nhiệm vụ của bạn là tạo Phao Cứu Cấp cho chủ đề: ${folderName || 'Không rõ'}

---TÀI LIỆU THAM KHẢO---
${allTexts.substring(0, 30000)}
---HẾT TÀI LIỆU---

YÊU CẦU:
1. Trích xuất TẤT CẢ công thức trọng tâm, bắt buộc dùng ký tự LaTeX (bọc trong $...$ hoặc $$...$$)
2. Liệt kê các định nghĩa quan trọng, thuật ngữ dễ nhầm lẫn
3. Các mốc sự kiện/dữ liệu xương máu (nếu có)
4. Mẹo ghi nhớ nhanh

LƯU Ý QUAN TRỌNG: Nếu nội dung "TÀI LIỆU THAM KHẢO" ở trên bị trống, toàn số thứ tự, hoặc không có ý nghĩa, HÃY SỬ DỤNG KIẾN THỨC CỦA CHÍNH BẠN để tạo ra một bản tóm tắt công thức và kiến thức trọng tâm cực kỳ chi tiết cho chủ đề "${folderName}", tuyệt đối không được từ chối trả lời!

Trả về định dạng MARKDOWN phân cấp mạch lạc với heading ##, ###, danh sách gạch đầu dòng.
Viết ngắn gọn, súc tích - đây là tài liệu ôn tập nhanh trước giờ thi.`,

  // Podcast Script Generator
  generatePodcastScript: (allTexts, folderName = "") => `Bạn là biên kịch Podcast giáo dục. Viết kịch bản nói chuyện giữa 2 MC về chủ đề: ${folderName || 'Không rõ'}
- MC_A (Nam, tên là Minh): Người hỏi, tò mò, hay đặt câu hỏi thú vị
- MC_B (Nữ, tên là Lan): Người giải thích, hóm hỉnh, dùng ví dụ đời thường dễ hiểu

Nội dung dựa trên tài liệu:
---
${allTexts.substring(0, 15000)}
---

YÊU CẦU QUAN TRỌNG ĐỂ CÓ GIỌNG ĐỌC TỰ NHIÊN:
- Xưng hô với nhau là Minh và Lan (hoặc cậu/tớ), TUYỆT ĐỐI KHÔNG gọi nhau là A hay B.
- Kịch bản phải SÁNG TẠO, lôi cuốn, có những màn tung hứng, phản biện hoặc ví dụ hài hước để kích thích tư duy.
- Kiến thức (đặc biệt là môn Lịch sử, Khoa học) phải ĐẢM BẢO CHÍNH XÁC 100%, đúng sự thật lịch sử và ĐẦY ĐỦ các ý quan trọng từ tài liệu.
- Số lượng lượt thoại từ 10 đến 16 lượt để nội dung cô đọng.

LƯU Ý QUAN TRỌNG: Nếu nội dung tài liệu tham khảo ở trên bị trống hoặc vô nghĩa, hãy TỰ BIÊN KỊCH một tập podcast cực hay bằng kiến thức của chính bạn về chủ đề "${folderName}"!

TUYỆT ĐỐI TUÂN THỦ ĐỊNH DẠNG SAU (KHÔNG DÙNG JSON):
MC_A|||Nội dung thoại của MC A
MC_B|||Nội dung thoại của MC B

Ví dụ:
MC_A|||Chào Lan, hôm nay mình có chủ đề gì thú vị vậy?
MC_B|||Chào Minh! Hôm nay mình sẽ nói về một thứ rất hay, đó là Personal Statement!

Chú ý: Không xuất ra bất kỳ cái gì khác ngoài các dòng định dạng trên.`,

  // Learning Resource Recommender
  recommendResources: (allTexts, folderName = "") => `Bạn là chuyên gia tư vấn học thuật. Hãy đọc nội dung tài liệu dưới đây và gợi ý các nguồn tài nguyên học tập phù hợp nhất cho chủ đề: ${folderName || 'Không rõ'}

---TÀI LIỆU---
${allTexts.substring(0, 15000)}
---HẾT TÀI LIỆU---

YÊU CẦU:
1. Phân tích chủ đề chính, môn học, và các khái niệm quan trọng trong tài liệu
2. Gợi ý 6-8 nguồn tài nguyên học tập bao gồm:
   - Video bài giảng trên YouTube (ưu tiên kênh giáo dục uy tín như Khan Academy, Bài giảng ĐH, TED-Ed...)
   - Podcast giáo dục
   - Bài viết / khóa học trực tuyến
3. Chia đều: 3-4 nguồn Tiếng Việt + 3-4 nguồn Tiếng Anh
4. Mỗi gợi ý phải có từ khóa tìm kiếm YouTube cụ thể, chính xác

LƯU Ý QUAN TRỌNG: Nếu tài liệu tham khảo bị trống hoặc không rõ nghĩa, hãy tự đưa ra gợi ý xuất sắc nhất dựa trên chủ đề "${folderName}".

Trả về JSON (KHÔNG có markdown code block, CHỈ JSON thuần):
[
  {
    "title": "Tên bài giảng/video/podcast gợi ý",
    "type": "video",
    "language": "vi",
    "search_query": "từ khóa tìm kiếm YouTube chính xác",
    "description": "Mô tả 1-2 câu vì sao bài này hữu ích cho người học",
    "topic_match": "Chủ đề cụ thể trong tài liệu mà nguồn này bao phủ",
    "source_hint": "Tên kênh/nguồn gợi ý (VD: Khan Academy, TED-Ed, ĐH Bách Khoa...)"
  }
]

Lưu ý về type:
- "video" = Video bài giảng
- "podcast" = Podcast âm thanh
- "article" = Bài viết / Khóa học online`
};

module.exports = PROMPTS;
