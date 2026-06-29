import React, { useState, useEffect } from 'react';
import { getSpacedRepetitionItems, reviewSpacedRepetition } from '../utils/api';
import './QuizView.css'; // Reusing some quiz styles

export default function SpacedRepetitionView() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await getSpacedRepetitionItems();
      setItems(res.items || []);
    } catch (err) {
      console.error(err);
      alert("Lỗi khi tải danh sách Cứu trợ");
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (isCorrect) => {
    setSubmitting(true);
    try {
      const item = items[currentIdx];
      await reviewSpacedRepetition(item.id, isCorrect);
      
      // Move to next item
      setShowAnswer(false);
      setCurrentIdx(prev => prev + 1);
    } catch (err) {
      alert("Lỗi khi gửi kết quả: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="quiz-view loading">
        <div className="spinner"></div>
        <p>Đang tải danh sách lỗ hổng kiến thức...</p>
      </div>
    );
  }

  if (items.length === 0 || currentIdx >= items.length) {
    return (
      <div className="quiz-view error">
        <h3>🎉 Chúc mừng!</h3>
        <p>Bạn không có lỗ hổng kiến thức nào cần ôn tập hôm nay.</p>
        <p className="prediction-action-hint">Hãy làm thêm các bài Quiz để AI tìm ra những điểm yếu của bạn nhé.</p>
      </div>
    );
  }

  const currentItem = items[currentIdx];
  const questionData = currentItem.quiz_attempts;

  return (
    <div className="quiz-view">
      <div className="quiz-header">
        <h2>Cứu trợ / Ôn tập (Spaced Repetition)</h2>
        <div className="quiz-progress">
          Còn lại: {items.length - currentIdx} câu
        </div>
      </div>

      <div className="quiz-content">
        <div className="quiz-card">
          <div className="quiz-topic-tag">{questionData.topic_tag}</div>
          <h3 className="quiz-question-text">{questionData.question_text}</h3>
          
          {!showAnswer ? (
            <div className="quiz-options">
              {/* Do not show options in Spaced Repetition, force active recall */}
              <div style={{ textAlign: 'center', margin: '2rem 0' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Hãy tự nhớ lại câu trả lời trong đầu trước khi xem đáp án. (Active Recall)
                </p>
                <button className="btn btn-primary" onClick={() => setShowAnswer(true)}>
                  Hiển thị đáp án & Giải thích
                </button>
              </div>
            </div>
          ) : (
            <div className="sr-answer-section">
              <div className="prediction-score" style={{ marginBottom: '1rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                <strong>Đáp án đúng:</strong> {questionData.correct_answer}
              </div>
              <div className="review-exp">
                <strong>Giải thích từ AI:</strong> {questionData.explanation}
              </div>

              <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <p style={{ marginBottom: '1rem', fontWeight: '600' }}>Bạn có nhớ câu này không?</p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button 
                    className="btn btn-secondary" 
                    style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}
                    onClick={() => handleReview(false)}
                    disabled={submitting}
                  >
                    Quên (Làm lại sau 24h)
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ background: 'var(--success-color)' }}
                    onClick={() => handleReview(true)}
                    disabled={submitting}
                  >
                    Đã nhớ (Giãn khoảng cách ôn tập)
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
