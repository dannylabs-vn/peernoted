"use client"

import { useEffect, useState, useCallback } from 'react'
import { getFolders, generateQuiz, submitQuiz } from '@/lib/api'
import {
  Target, Sparkles, FolderOpen, FileText, ArrowRight, RotateCcw,
  CheckCircle2, XCircle, Lightbulb, Trophy, AlertTriangle, Zap, BookOpen
} from 'lucide-react'
import confetti from 'canvas-confetti'

// Palette dùng lại từ hệ thống thiết kế neo-brutalist
const ACCENTS = ['#4285F4', '#EA4335', '#34A853', '#FBBC05']

type Question = {
  question: string
  options: string[]
  answer: string
  explanation: string
  topic_tag: string
}

type Answer = {
  question: string
  options: string[]
  answer: string
  user_answer: string
  is_correct: boolean
  topic_tag: string
  explanation: string
}

type Phase = 'picker' | 'generating' | 'quiz' | 'result' | 'error'

export default function QuizPage() {
  const [loading, setLoading] = useState(true)
  const [folders, setFolders] = useState<any[]>([])
  const [phase, setPhase] = useState<Phase>('picker')

  const [selectedFolder, setSelectedFolder] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [responses, setResponses] = useState<Answer[]>([])
  const [submitting, setSubmitting] = useState(false)

  // ===== Tải danh sách folder =====
  const loadFolders = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getFolders()
      const list = (res.data || []).filter(
        (f: any) => (f.name || '').toLowerCase() !== 'hình ảnh'
      )
      setFolders(list)
    } catch (err) {
      console.error(err)
      setFolders([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFolders()
  }, [loadFolders])

  const triggerConfetti = () => {
    confetti({
      particleCount: 160,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#4285F4', '#EA4335', '#34A853', '#FBBC05', '#9B51E0']
    })
  }

  // ===== Bắt đầu 1 lượt quiz cho folder =====
  const startQuiz = async (folder: any) => {
    setSelectedFolder(folder)
    setPhase('generating')
    setQuestions([])
    setResponses([])
    setCurrentIdx(0)
    setSelectedOption(null)

    const folderId = folder._id || folder.id
    try {
      const res = await generateQuiz(folderId)
      const qs: Question[] = (res && res.questions) || []

      // Backend có thể trả về 1 câu "lỗi hệ thống" khi AI thất bại
      const isDummyError =
        qs.length === 0 ||
        (qs.length === 1 && qs[0].topic_tag === 'Lỗi hệ thống')

      if (isDummyError) {
        setPhase('error')
        return
      }

      setQuestions(qs)
      setPhase('quiz')
    } catch (err) {
      console.error(err)
      setPhase('error')
    }
  }

  // ===== Chọn 1 đáp án =====
  const handleSelect = (opt: string) => {
    if (selectedOption !== null) return
    const q = questions[currentIdx]
    const isCorrect = opt === q.answer
    setSelectedOption(opt)
    setResponses((prev) => [
      ...prev,
      {
        question: q.question,
        options: q.options,
        answer: q.answer,
        user_answer: opt,
        is_correct: isCorrect,
        topic_tag: q.topic_tag,
        explanation: q.explanation
      }
    ])
  }

  // ===== Câu tiếp / Kết thúc =====
  const handleNext = async () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1)
      setSelectedOption(null)
      return
    }
    // Đã xong -> tính điểm, ăn mừng, lưu kết quả
    setPhase('result')
    const score = responses.filter((r) => r.is_correct).length
    const pct = Math.round((score / responses.length) * 100)
    if (pct >= 80) triggerConfetti()

    setSubmitting(true)
    try {
      await submitQuiz({
        folder_id: selectedFolder._id || selectedFolder.id,
        answers: responses
      })
    } catch (err) {
      console.error('submitQuiz failed', err)
    } finally {
      setSubmitting(false)
    }
  }

  const resetToPicker = () => {
    setPhase('picker')
    setSelectedFolder(null)
    setQuestions([])
    setResponses([])
    setCurrentIdx(0)
    setSelectedOption(null)
  }

  // ============================================================
  // 1. LOADING FOLDERS
  // ============================================================
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <div className="w-20 h-20 border-[4px] border-black border-t-[#4285F4] rounded-full animate-spin shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6" />
        <p className="font-black text-xl">Đang tải thư viện của bạn...</p>
      </div>
    )
  }

  // ============================================================
  // 2. GENERATING QUIZ (AI)
  // ============================================================
  if (phase === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center px-4">
        <div className="relative mb-8">
          <div className="w-24 h-24 border-[5px] border-black border-t-[#FBBC05] rounded-full animate-spin shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" />
          <Sparkles className="w-9 h-9 text-[#FBBC05] absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="font-black text-2xl mb-2">AI đang soạn đề từ tài liệu của bạn...</p>
        <p className="font-bold text-gray-500">Việc này mất khoảng 10-20 giây, chờ xíu nhé ⚡</p>
        {selectedFolder && (
          <div className="mt-6 inline-flex items-center gap-2 bg-[#4285F4] text-white border-[3px] border-black px-5 py-2 rounded-xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <FolderOpen className="w-5 h-5" /> {selectedFolder.name}
          </div>
        )}
      </div>
    )
  }

  // ============================================================
  // 3. ERROR STATE
  // ============================================================
  if (phase === 'error') {
    return (
      <div className="max-w-[700px] mx-auto pt-12 px-4">
        <div className="bg-white border-[4px] border-black rounded-3xl p-6 sm:p-10 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="w-20 h-20 bg-[#EA4335] border-[4px] border-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <AlertTriangle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mb-3">Rất tiếc, AI chưa soạn được đề 😢</h1>
          <p className="font-bold text-gray-600 mb-8">
            Có thể tài liệu trong thư mục này quá ngắn hoặc hệ thống đang bận.
            Bạn thử lại hoặc chọn một thư mục khác nhé!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => selectedFolder && startQuiz(selectedFolder)}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-[#FBBC05] text-black border-[4px] border-black rounded-2xl font-black text-lg hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all"
            >
              <RotateCcw className="w-5 h-5" /> Thử lại
            </button>
            <button
              onClick={resetToPicker}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-white text-black border-[4px] border-black rounded-2xl font-black text-lg hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all"
            >
              <FolderOpen className="w-5 h-5" /> Chọn thư mục khác
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // 4. QUIZ STATE
  // ============================================================
  if (phase === 'quiz' && questions.length > 0) {
    const q = questions[currentIdx]
    const total = questions.length
    const answered = selectedOption !== null
    const isCorrect = answered && selectedOption === q.answer
    const progressPct = Math.round(((currentIdx + (answered ? 1 : 0)) / total) * 100)
    const scoreSoFar = responses.filter((r) => r.is_correct).length

    return (
      <div className="max-w-[900px] mx-auto pb-12">
        {/* Progress header */}
        <div className="bg-white border-[3px] border-black p-5 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 font-black text-lg">
              <Target className="w-6 h-6 text-[#EA4335]" />
              Câu {currentIdx + 1}/{total}
            </div>
            <div className="bg-[#34A853] text-white border-[3px] border-black px-4 py-1 rounded-xl font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              Điểm: {scoreSoFar}
            </div>
          </div>
          <div className="w-full h-4 bg-gray-100 border-[3px] border-black rounded-full overflow-hidden">
            <div
              className="h-full bg-[#4285F4] transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="relative">
          <div className="absolute inset-0 bg-[#FBBC05] border-[4px] border-black rounded-3xl translate-x-3 translate-y-3" />
          <div className="relative bg-white border-[4px] border-black rounded-3xl p-6 sm:p-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#4285F4] text-white border-[3px] border-black rounded-lg font-black text-xs uppercase tracking-wider mb-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <BookOpen className="w-4 h-4" /> {q.topic_tag}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black mb-8 leading-snug">
              {q.question}
            </h2>

            {/* Options */}
            <div className="grid gap-4">
              {q.options.map((opt, i) => {
                const letter = String.fromCharCode(65 + i)
                const isCorrectOpt = opt === q.answer
                const isPicked = opt === selectedOption

                let cls =
                  'bg-white hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-pointer'
                let badge = 'bg-[#FBBC05] text-black'
                if (answered) {
                  if (isCorrectOpt) {
                    cls = 'bg-[#34A853] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                    badge = 'bg-white text-[#34A853]'
                  } else if (isPicked) {
                    cls = 'bg-[#EA4335] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'
                    badge = 'bg-white text-[#EA4335]'
                  } else {
                    cls = 'bg-gray-50 opacity-60'
                    badge = 'bg-gray-200 text-gray-500'
                  }
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleSelect(opt)}
                    disabled={answered}
                    className={`flex items-center gap-4 text-left px-5 py-4 border-[3px] border-black rounded-2xl font-black text-lg transition-all disabled:cursor-default ${cls}`}
                  >
                    <span
                      className={`flex-shrink-0 w-9 h-9 flex items-center justify-center border-[2px] border-black rounded-lg text-base ${badge}`}
                    >
                      {letter}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {answered && isCorrectOpt && (
                      <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                    )}
                    {answered && isPicked && !isCorrectOpt && (
                      <XCircle className="w-6 h-6 flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Explanation + Next */}
            {answered && (
              <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 border-[3px] border-black rounded-xl font-black mb-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                    isCorrect ? 'bg-[#34A853] text-white' : 'bg-[#EA4335] text-white'
                  }`}
                >
                  {isCorrect ? (
                    <>
                      <Zap className="w-5 h-5" /> Chính xác! 🎉
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" /> Chưa đúng rồi!
                    </>
                  )}
                </div>

                <div className="bg-[#FBBC05]/15 border-[3px] border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-[#FBBC05] border-[2px] border-black rounded-full flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <Lightbulb className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black mb-1">💡 Cứu trợ:</h4>
                      <p className="font-bold text-gray-700 leading-relaxed">
                        {q.explanation}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  className="mt-6 w-full flex items-center justify-center gap-2 px-8 py-5 bg-[#4285F4] text-white border-[4px] border-black rounded-2xl font-black text-xl hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all"
                >
                  {currentIdx + 1 < total ? (
                    <>
                      Câu tiếp <ArrowRight className="w-6 h-6" />
                    </>
                  ) : (
                    <>
                      Xem kết quả <Trophy className="w-6 h-6" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // 5. RESULT STATE
  // ============================================================
  if (phase === 'result') {
    const total = responses.length
    const score = responses.filter((r) => r.is_correct).length
    const pct = total > 0 ? Math.round((score / total) * 100) : 0
    const passed = pct >= 80

    // Gom nhóm theo topic_tag để feed tính năng "Vá lỗi"
    const topicMap: Record<string, { correct: number; total: number }> = {}
    responses.forEach((r) => {
      if (!topicMap[r.topic_tag]) topicMap[r.topic_tag] = { correct: 0, total: 0 }
      topicMap[r.topic_tag].total += 1
      if (r.is_correct) topicMap[r.topic_tag].correct += 1
    })
    const topics = Object.entries(topicMap).sort(
      (a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total
    )
    const weakTopics = topics.filter(([, v]) => v.correct < v.total)

    let verdict = 'Cần cố gắng thêm nhé! 💪'
    let verdictColor = '#EA4335'
    if (pct >= 80) {
      verdict = 'Xuất sắc! Bạn nắm rất chắc 🏆'
      verdictColor = '#34A853'
    } else if (pct >= 50) {
      verdict = 'Khá ổn! Vá thêm vài lỗ hổng là ngon 👍'
      verdictColor = '#FBBC05'
    }

    return (
      <div className="max-w-[820px] mx-auto pb-12 px-1">
        {/* Score hero */}
        <div className="relative mb-8">
          <div
            className="absolute inset-0 border-[4px] border-black rounded-3xl translate-x-3 translate-y-3"
            style={{ background: verdictColor }}
          />
          <div className="relative bg-white border-[4px] border-black rounded-3xl p-8 sm:p-10 text-center">
            <div
              className="w-20 h-20 border-[4px] border-black rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              style={{ background: verdictColor }}
            >
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <p className="font-black text-lg uppercase tracking-wider text-gray-500 mb-2">
              Kết quả của bạn
            </p>
            <div className="flex items-end justify-center gap-2 mb-2">
              <span
                className="text-7xl sm:text-8xl font-black leading-none"
                style={{ textShadow: '4px 4px 0px #000', color: verdictColor }}
              >
                {score}
              </span>
              <span className="text-4xl font-black text-gray-400 mb-2">/ {total}</span>
            </div>
            <div className="inline-block bg-black text-white px-5 py-2 rounded-xl font-black text-2xl mb-4">
              {pct}%
            </div>
            <p className="font-black text-xl">{verdict}</p>
            {submitting && (
              <p className="mt-3 text-sm font-bold text-gray-400">Đang lưu kết quả...</p>
            )}
          </div>
        </div>

        {/* Topic breakdown */}
        <div className="bg-white border-[3px] border-black rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-8">
          <h3 className="font-black text-xl mb-1 flex items-center gap-2">
            <Target className="w-6 h-6 text-[#EA4335]" /> Phân tích theo chủ đề
          </h3>
          <p className="font-bold text-gray-500 text-sm mb-5">
            {weakTopics.length > 0
              ? `Có ${weakTopics.length} chủ đề cần "Vá lỗi" — vào mục Cứu trợ để ôn lại nhé!`
              : 'Tuyệt vời, bạn không bỏ sót chủ đề nào! ✨'}
          </p>

          <div className="space-y-3">
            {topics.map(([tag, v], i) => {
              const allRight = v.correct === v.total
              const barColor = allRight
                ? '#34A853'
                : v.correct === 0
                ? '#EA4335'
                : '#FBBC05'
              return (
                <div
                  key={tag}
                  className="border-[3px] border-black rounded-2xl p-4"
                  style={{ background: allRight ? 'rgba(52,168,83,0.08)' : 'rgba(234,67,53,0.06)' }}
                >
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <span className="font-black flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full border-[2px] border-black flex-shrink-0"
                        style={{ background: ACCENTS[i % ACCENTS.length] }}
                      />
                      {tag}
                    </span>
                    <span
                      className="font-black text-sm px-3 py-1 rounded-lg border-[2px] border-black text-white flex-shrink-0"
                      style={{ background: barColor }}
                    >
                      {v.correct}/{v.total} đúng
                    </span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 border-[2px] border-black rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${Math.round((v.correct / v.total) * 100)}%`,
                        background: barColor
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => selectedFolder && startQuiz(selectedFolder)}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#FBBC05] text-black border-[4px] border-black rounded-2xl font-black text-lg hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all"
          >
            <RotateCcw className="w-5 h-5" /> Làm lại
          </button>
          <button
            onClick={resetToPicker}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#4285F4] text-white border-[4px] border-black rounded-2xl font-black text-lg hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all"
          >
            <FolderOpen className="w-5 h-5" /> Chọn folder khác
          </button>
        </div>
      </div>
    )
  }

  // ============================================================
  // 1 (default). FOLDER PICKER
  // ============================================================
  return (
    <div className="max-w-[1200px] mx-auto pb-12">
      {/* Header */}
      <div className="bg-[#4285F4] border-[4px] border-black rounded-3xl p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white relative overflow-hidden mb-8">
        <div className="absolute -right-6 -top-6 w-40 h-40 bg-[#FBBC05]/30 rounded-full" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider bg-white text-[#4285F4] w-fit px-3 py-1 rounded-lg border-[2px] border-black mb-4">
            <Sparkles className="w-4 h-4" /> AI Quiz
          </div>
          <h1 className="text-3xl sm:text-5xl font-black mb-3" style={{ textShadow: '3px 3px 0px #000' }}>
            Luyện Quiz 🎯
          </h1>
          <p className="text-lg font-bold bg-white text-black inline-block px-4 py-2 border-[2px] border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            Chọn một thư mục, AI sẽ ra đề trắc nghiệm từ chính tài liệu của bạn!
          </p>
        </div>
      </div>

      {folders.length === 0 ? (
        // Empty state
        <div className="bg-white border-[4px] border-black rounded-3xl p-12 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <div className="w-20 h-20 bg-[#FBBC05] border-[4px] border-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <FolderOpen className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black mb-3">Chưa có tài liệu nào 📚</h2>
          <p className="font-bold text-gray-600">
            Hãy tải tài liệu lên thư viện trước, rồi quay lại luyện quiz nhé!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {folders.map((f, i) => {
            const accent = ACCENTS[i % ACCENTS.length]
            return (
              <button
                key={f._id || f.id}
                onClick={() => startQuiz(f)}
                className="group text-left bg-white border-[3px] border-black rounded-2xl p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                <div
                  className="w-14 h-14 border-[3px] border-black rounded-xl flex items-center justify-center mb-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  style={{ background: accent }}
                >
                  <FolderOpen className="w-7 h-7 text-white" />
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-1">
                  {f.subject || 'MÔN HỌC'}
                </div>
                <h3 className="text-xl font-black mb-3 leading-tight line-clamp-2">
                  {f.name}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-500">
                    <FileText className="w-4 h-4" /> {f.fileCount || 0} tài liệu
                  </span>
                  <span
                    className="inline-flex items-center gap-1 font-black text-sm px-3 py-1.5 rounded-lg border-[2px] border-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:gap-2 transition-all"
                    style={{ background: accent }}
                  >
                    Luyện <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
