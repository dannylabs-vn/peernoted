import React, { useState, useEffect } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { generateQuiz, submitQuiz, getQuizStats } from '../utils/api';
import './QuizView.css';

export default function QuizView({ folderId, folderName, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState([]);
  
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // idx -> selected option
  
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null); // { score, total, message }
  const [stats, setStats] = useState(null); // { chartData, predictedScore, weakestTopic }

  useEffect(() => {
    loadQuiz();
  }, [folderId]);

  const loadQuiz = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await generateQuiz(folderId);
      if (res.questions && res.questions.length > 0) {
        setQuestions(res.questions);
      } else {
        setError('Không thể tạo câu hỏi lúc này.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (option) => {
    if (isSubmitted) return;
    setAnswers(prev => ({
      ...prev,
      [currentIdx]: option
    }));
  };

  const handleSubmit = async () => {
    // Check if all answered
    if (Object.keys(answers).length < questions.length) {
      alert("Vui lòng trả lời tất cả các câu hỏi trước khi nộp bài!");
      return;
    }

    setSubmitting(true);
    try {
      // Build answers array
      const answersPayload = questions.map((q, idx) => {
        const userAns = answers[idx];
        const isCorrect = userAns === q.answer;
        return {
          question_text: q.question,
          options: q.options,
          correct_answer: q.answer,
          user_answer: userAns,
          is_correct: isCorrect,
          topic_tag: q.topic_tag,
          explanation: q.explanation
        };
      });

      const resSubmit = await submitQuiz({ folderId, answers: answersPayload });
      setSubmitResult(resSubmit);
      setIsSubmitted(true);

      // Fetch stats for spider chart
      const resStats = await getQuizStats();
      setStats(resStats);
    } catch (err) {
      alert("Lỗi khi nộp bài: " + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="quiz-view loading">
        <div className="spinner"></div>
        <p>AI đang phân tích tài liệu và soạn đề thi...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-view error">
        <h3>Lỗi Tạo Quiz</h3>
        <p>{error}</p>
        <button className="btn btn-secondary" onClick={onBack}>Quay lại</button>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const isLastQuestion = currentIdx === questions.length - 1;
  const isFirstQuestion = currentIdx === 0;

  return (
    <div className="quiz-view">
      <div className="quiz-header">
        <button className="btn-icon" onClick={onBack}>← Trở lại</button>
        <h2>Bài kiểm tra: {folderName}</h2>
        <div className="quiz-progress">
          Câu {currentIdx + 1} / {questions.length}
        </div>
      </div>

      {!isSubmitted ? (
        <div className="quiz-content">
          <div className="quiz-card">
            <div className="quiz-topic-tag">{currentQuestion.topic_tag}</div>
            <h3 className="quiz-question-text">{currentQuestion.question}</h3>
            
            <div className="quiz-options">
              {currentQuestion.options.map((opt, i) => (
                <button
                  key={i}
                  className={`quiz-option-btn ${answers[currentIdx] === opt ? 'selected' : ''}`}
                  onClick={() => handleSelectOption(opt)}
                >
                  <span className="opt-letter">{String.fromCharCode(65 + i)}</span>
                  <span className="opt-text">{opt}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="quiz-navigation">
            <button 
              className="btn btn-secondary" 
              disabled={isFirstQuestion}
              onClick={() => setCurrentIdx(prev => prev - 1)}
            >
              Câu trước
            </button>
            
            {isLastQuestion ? (
              <button 
                className="btn btn-primary" 
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Đang nộp...' : 'Nộp bài'}
              </button>
            ) : (
              <button 
                className="btn btn-primary"
                onClick={() => setCurrentIdx(prev => prev + 1)}
              >
                Câu tiếp theo
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="quiz-results">
          <div className="results-summary">
            <h3>Kết Quả Bài Thi</h3>
            <div className="score-display">
              <span className="score-correct">{submitResult?.score}</span>
              <span className="score-separator">/</span>
              <span className="score-total">{submitResult?.total}</span>
            </div>
            <p className="results-msg">{submitResult?.message}</p>
          </div>

          {stats && (
            <div className="stats-dashboard">
              <div className="spider-chart-container">
                <h4>Phân tích Năng lực (Radar Chart)</h4>
                {stats.chartData && stats.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={stats.chartData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar name="Proficiency" dataKey="A" stroke="var(--primary-color)" fill="var(--primary-color)" fillOpacity={0.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <p>Chưa đủ dữ liệu biểu đồ.</p>
                )}
              </div>
              
              <div className="prediction-box">
                <h4>Dự đoán AI</h4>
                <div className="prediction-score">
                  Điểm thi dự kiến: <strong>{stats.predictedScore}</strong> / 10
                </div>
                <div className="prediction-warning">
                  Bạn đang mất điểm nhiều nhất ở phần: <strong>{stats.weakestTopic}</strong>
                </div>
                <p className="prediction-action-hint">
                  Hệ thống đã gom các câu sai vào danh sách Cứu trợ (Lặp lại ngắt quãng). Hãy vào mục "Ôn tập" ngày mai để vá lỗ hổng nhé!
                </p>
                <button className="btn btn-primary" onClick={onBack}>Hoàn tất</button>
              </div>
            </div>
          )}

          <div className="review-answers">
            <h4>Xem lại câu trả lời</h4>
            {questions.map((q, idx) => {
              const userAns = answers[idx];
              const isCorrect = userAns === q.answer;
              return (
                <div key={idx} className={`review-card ${isCorrect ? 'correct' : 'wrong'}`}>
                  <p className="review-q"><strong>Câu {idx + 1}:</strong> {q.question}</p>
                  <p className="review-a">Đáp án của bạn: <span className={isCorrect ? 'text-success' : 'text-danger'}>{userAns}</span></p>
                  {!isCorrect && <p className="review-ca">Đáp án đúng: <span className="text-success">{q.answer}</span></p>}
                  <div className="review-exp">
                    <strong>Giải thích từ AI:</strong> {q.explanation}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
