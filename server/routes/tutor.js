const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { protect } = require('../middleware/auth');
const { generateTutorRoadmap } = require('../services/aiService');

// Gom quiz_attempts của user → thống kê đúng/sai theo topic_tag.
// Đây là "bản đồ khuyết điểm" nuôi tính năng Vá lỗi.
async function buildStats(req, userId) {
  const { data: attempts, error } = await (req.supabase || supabase)
    .from('quiz_attempts')
    .select('topic_tag, is_correct, created_at, folder_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;

  const byTopic = {};
  for (const a of attempts || []) {
    const tag = (a.topic_tag || 'Khác').trim();
    if (!byTopic[tag]) byTopic[tag] = { topic: tag, total: 0, correct: 0, wrong: 0 };
    byTopic[tag].total++;
    if (a.is_correct) byTopic[tag].correct++;
    else byTopic[tag].wrong++;
  }
  const topics = Object.values(byTopic)
    .map(t => ({ ...t, accuracy: t.total ? Math.round((t.correct / t.total) * 100) : 0 }))
    .sort((a, b) => b.wrong - a.wrong);

  return { totalAttempts: (attempts || []).length, topics };
}

// ===========================================================================
// GET /api/tutor/analysis — thống kê điểm yếu từ lịch sử quiz
// ===========================================================================
router.get('/analysis', protect, async (req, res) => {
  try {
    const stats = await buildStats(req, req.user.id);
    res.json(stats);
  } catch (error) {
    console.error('[Tutor /analysis]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// POST /api/tutor/roadmap — AI viết lộ trình học 4 tuần "vá lỗi"
// Body: { user_note?: string } — điểm yếu user tự mô tả (optional)
// ===========================================================================
router.post('/roadmap', protect, async (req, res) => {
  try {
    const { user_note = '' } = req.body;
    const stats = await buildStats(req, req.user.id);

    if (stats.totalAttempts === 0 && !user_note.trim()) {
      return res.status(400).json({
        error: 'Chưa có dữ liệu quiz và chưa mô tả điểm yếu. Hãy làm vài bài quiz hoặc nhập điểm yếu của bạn trước.'
      });
    }

    const statsSummary = stats.topics.length === 0
      ? 'Chưa có dữ liệu quiz.'
      : stats.topics.map(t =>
          `- ${t.topic}: làm ${t.total} câu, đúng ${t.correct}, SAI ${t.wrong} (độ chính xác ${t.accuracy}%)`
        ).join('\n');

    const roadmap = await generateTutorRoadmap(statsSummary, user_note);
    res.json({ stats, roadmap });
  } catch (error) {
    console.error('[Tutor /roadmap]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
