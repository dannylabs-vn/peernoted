const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { protect } = require('../middleware/auth');
const { generateQuiz } = require('../services/aiService');

// Helper to get folder texts (copied from ai.js for simplicity, or we could export it)
async function getAllTextsForFolder(req, folderId) {
  const { data, error } = await (req.supabase || supabase).from('files')
    .select('extracted_text')
    .eq('folder_id', folderId);
  if (error) throw error;
  return data
    .map(f => f.extracted_text)
    .filter(t => t && t.trim().length > 0)
    .join('\n\n---\n\n');
}

// ===========================================================================
// POST /api/quiz/generate/:folderId — generate a quiz using AI
// ===========================================================================
router.post('/generate/:folderId', protect, async (req, res) => {
  try {
    const { folderId } = req.params;
    
    // Get folder name
    const { data: folder, error: folderErr } = await (req.supabase || supabase).from('folders')
      .select('name')
      .eq('id', folderId)
      .maybeSingle();
      
    if (folderErr) throw folderErr;
    if (!folder) return res.status(404).json({ error: 'Thư mục không tồn tại' });

    const allTexts = await getAllTextsForFolder(req, folderId);
    if (!allTexts || allTexts.trim().length < 20) {
      return res.status(400).json({ error: 'Không đủ nội dung văn bản để tạo Quiz' });
    }

    const questions = await generateQuiz(allTexts, folder.name);
    res.json({ questions });
  } catch (error) {
    console.error('[Quiz Generate Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// POST /api/quiz/submit — submit answers, save attempts & SR items
// ===========================================================================
router.post('/submit', protect, async (req, res) => {
  try {
    const { folderId, answers } = req.body;
    // answers is an array of: { question_text, options, correct_answer, user_answer, is_correct, topic_tag, explanation }
    const userId = req.user.id;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ error: 'Không có dữ liệu trả lời' });
    }

    let correctCount = 0;
    const attemptsToInsert = [];

    // Calculate score and build attempts data
    for (const ans of answers) {
      if (ans.is_correct) correctCount++;
      attemptsToInsert.push({
        user_id: userId,
        folder_id: folderId,
        question_text: ans.question_text,
        options: ans.options,
        correct_answer: ans.correct_answer,
        user_answer: ans.user_answer,
        is_correct: ans.is_correct,
        topic_tag: ans.topic_tag || 'Khác',
        explanation: ans.explanation || ''
      });
    }

    // Insert attempts
    const { data: insertedAttempts, error: attemptErr } = await (req.supabase || supabase).from('quiz_attempts')
      .insert(attemptsToInsert)
      .select('*');

    if (attemptErr) throw attemptErr;

    // Create spaced repetition items for WRONG answers
    const srItemsToInsert = insertedAttempts
      .filter(a => !a.is_correct)
      .map(a => {
        const nextReview = new Date();
        nextReview.setHours(nextReview.getHours() + 24); // next review in 24 hours
        return {
          user_id: userId,
          quiz_attempt_id: a.id,
          next_review_at: nextReview.toISOString(),
          interval_hours: 24,
          status: 'pending'
        };
      });

    if (srItemsToInsert.length > 0) {
      const { error: srErr } = await (req.supabase || supabase).from('spaced_repetition_items')
        .insert(srItemsToInsert);
      if (srErr) throw srErr;
    }

    res.json({
      score: correctCount,
      total: answers.length,
      message: `Lưu thành công. Có ${srItemsToInsert.length} câu đưa vào danh sách Cứu trợ.`
    });
  } catch (error) {
    console.error('[Quiz Submit Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// GET /api/quiz/stats — get spider chart stats
// ===========================================================================
router.get('/stats', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    // Get all attempts for this user
    const { data: attempts, error } = await (req.supabase || supabase).from('quiz_attempts')
      .select('topic_tag, is_correct')
      .eq('user_id', userId);

    if (error) throw error;

    // Aggregate by topic_tag
    const statsMap = {};
    let totalQuestions = 0;
    let totalCorrect = 0;

    for (const a of attempts) {
      const tag = a.topic_tag || 'Khác';
      if (!statsMap[tag]) {
        statsMap[tag] = { total: 0, correct: 0 };
      }
      statsMap[tag].total++;
      if (a.is_correct) {
        statsMap[tag].correct++;
        totalCorrect++;
      }
      totalQuestions++;
    }

    // Convert to array for Recharts Spider Chart
    // format: { subject: 'Topic', A: 80, fullMark: 100 }
    const chartData = Object.keys(statsMap).map(tag => {
      const { total, correct } = statsMap[tag];
      const percentage = Math.round((correct / total) * 100);
      return {
        subject: tag,
        A: percentage,
        fullMark: 100
      };
    });

    // Predict exam score (out of 10)
    let predictedScore = 0;
    let weakestTopic = 'Chưa có dữ liệu';
    
    if (totalQuestions > 0) {
      const overallPercentage = totalCorrect / totalQuestions;
      // Formula: simple mapping from percentage to 10-point scale
      predictedScore = (overallPercentage * 10).toFixed(1);

      // Find weakest topic
      let minScore = 101;
      for (const item of chartData) {
        if (item.A < minScore && statsMap[item.subject].total >= 2) { // only count topics with at least 2 questions
          minScore = item.A;
          weakestTopic = item.subject;
        }
      }
      // If none found with >= 2 questions, fallback to absolute min
      if (minScore === 101 && chartData.length > 0) {
         let tempMin = chartData[0];
         for (const item of chartData) {
           if (item.A < tempMin.A) tempMin = item;
         }
         weakestTopic = tempMin.subject;
      }
    }

    res.json({
      chartData,
      predictedScore,
      weakestTopic,
      totalQuestions,
      totalCorrect
    });
  } catch (error) {
    console.error('[Quiz Stats Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// GET /api/quiz/spaced-repetition — get items due for review
// ===========================================================================
router.get('/spaced-repetition', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    // Get pending items where next_review_at is in the past
    const now = new Date().toISOString();
    
    // We need to join with quiz_attempts to get the question and explanation
    const { data: srItems, error } = await (req.supabase || supabase).from('spaced_repetition_items')
      .select(`
        id,
        next_review_at,
        interval_hours,
        status,
        quiz_attempts (
          question_text,
          options,
          correct_answer,
          topic_tag,
          explanation
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lte('next_review_at', now)
      .order('next_review_at', { ascending: true });

    if (error) throw error;
    res.json({ items: srItems });
  } catch (error) {
    console.error('[SR Fetch Error]', error);
    res.status(500).json({ error: error.message });
  }
});

// ===========================================================================
// POST /api/quiz/spaced-repetition/review/:id — submit SR answer
// ===========================================================================
router.post('/spaced-repetition/review/:id', protect, async (req, res) => {
  try {
    const srItemId = req.params.id;
    const { is_correct } = req.body; // true if the user remembered/got it right again

    // Get current item
    const { data: srItem, error: fetchErr } = await (req.supabase || supabase).from('spaced_repetition_items')
      .select('*')
      .eq('id', srItemId)
      .single();

    if (fetchErr) throw fetchErr;

    let updateData = {};

    if (is_correct) {
      // If correct, simple SuperMemo-like step: increase interval
      // e.g. 24h -> 3 days (72h) -> 7 days (168h) -> mastered
      if (srItem.interval_hours === 24) {
        const nextReview = new Date();
        nextReview.setHours(nextReview.getHours() + 72);
        updateData = {
          interval_hours: 72,
          next_review_at: nextReview.toISOString()
        };
      } else if (srItem.interval_hours === 72) {
        const nextReview = new Date();
        nextReview.setHours(nextReview.getHours() + 168);
        updateData = {
          interval_hours: 168,
          next_review_at: nextReview.toISOString()
        };
      } else {
        // Mastered!
        updateData = {
          status: 'mastered'
        };
      }
    } else {
      // If wrong, reset to 24h
      const nextReview = new Date();
      nextReview.setHours(nextReview.getHours() + 24);
      updateData = {
        interval_hours: 24,
        next_review_at: nextReview.toISOString()
      };
    }

    const { data: updated, error: updateErr } = await (req.supabase || supabase).from('spaced_repetition_items')
      .update(updateData)
      .eq('id', srItemId)
      .select('*')
      .single();

    if (updateErr) throw updateErr;

    res.json({ success: true, item: updated });
  } catch (error) {
    console.error('[SR Review Error]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
