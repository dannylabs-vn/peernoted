"use client"

import { useState, useEffect, useCallback } from 'react'
import { getSpacedRepetitionItems, reviewSpacedRepetition } from '@/lib/api'
import { Brain, CheckCircle2, RotateCcw, XCircle, Lightbulb, Trophy } from 'lucide-react'
import confetti from 'canvas-confetti'

const MOCK_ITEMS = [
  {
    id: "mock1",
    quiz_attempts: {
      topic_tag: "Toán Đại Số",
      question_text: "Đạo hàm của hàm số y = x^3 là gì?",
      correct_answer: "y' = 3x^2",
      explanation: "Theo công thức đạo hàm cơ bản của lũy thừa: (x^n)' = n * x^(n-1). Do đó (x^3)' = 3 * x^2."
    }
  },
  {
    id: "mock2",
    quiz_attempts: {
      topic_tag: "Vật Lý 12",
      question_text: "Công thức tính chu kỳ dao động của con lắc đơn là gì?",
      correct_answer: "T = 2π√(l/g)",
      explanation: "Trong đó l là chiều dài dây treo, g là gia tốc trọng trường. Chu kỳ T không phụ thuộc vào khối lượng vật nặng."
    }
  },
  {
    id: "mock3",
    quiz_attempts: {
      topic_tag: "Tiếng Anh",
      question_text: "Sự khác biệt giữa 'Affect' và 'Effect' là gì?",
      correct_answer: "Affect là động từ (ảnh hưởng), Effect là danh từ (kết quả/hiệu ứng).",
      explanation: "Mẹo nhớ: 'A' là Action (Hành động - Động từ). Ví dụ: The weather affected my mood. The effect was bad."
    }
  }
]

export default function SpacedRepetitionPage() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<any[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const loadItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getSpacedRepetitionItems()
      if (res && res.items && res.items.length > 0) {
        setItems(res.items)
      } else {
        // Fallback to mock data if API returns 0 items for testing UI
        setItems(MOCK_ITEMS)
      }
    } catch (err) {
      console.error(err)
      setItems(MOCK_ITEMS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFC224', '#9B51E0', '#3C73ED', '#10B981', '#EA4335']
    })
  }

  const handleReview = async (isCorrect: boolean) => {
    setSubmitting(true)
    try {
      const item = items[currentIdx]
      // Only call API if it's a real item (not mock)
      if (!item.id.toString().startsWith('mock')) {
        await reviewSpacedRepetition(item.id, isCorrect)
      }
      
      setShowAnswer(false)
      if (currentIdx + 1 >= items.length) {
        setIsDone(true)
        triggerConfetti()
      } else {
        setCurrentIdx(prev => prev + 1)
      }
    } catch (err: any) {
      alert("Lỗi khi gửi kết quả: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)]">
        <div className="w-20 h-20 border-[4px] border-black border-t-[#EA4335] rounded-full animate-spin shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6" />
        <p className="font-black text-xl">Đang quét lỗ hổng kiến thức...</p>
      </div>
    )
  }

  if (isDone || items.length === 0) {
    return (
      <div className="max-w-[800px] mx-auto pt-10">
        <div className="bg-[#10B981] border-[4px] border-black rounded-3xl p-8 sm:p-12 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-white">
          <div className="w-24 h-24 bg-white border-[4px] border-black rounded-full flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Trophy className="w-12 h-12 text-[#FFC224]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-4" style={{ textShadow: "3px 3px 0px #000" }}>Hoàn Thành!</h1>
          <p className="text-xl font-bold bg-white text-black px-6 py-3 rounded-xl border-[3px] border-black inline-block shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8">
            Bạn đã ôn tập xong tất cả lỗ hổng kiến thức hôm nay.
          </p>
          <div className="text-black bg-[#FFC224] border-[3px] border-black p-6 rounded-2xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            Hãy làm thêm các bài Quiz để AI tiếp tục phân tích và tìm ra những điểm yếu cần khắc phục nhé!
          </div>
        </div>
      </div>
    )
  }

  const currentItem = items[currentIdx]
  const questionData = currentItem.quiz_attempts

  return (
    <div className="max-w-[900px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 bg-white border-[3px] border-black p-6 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#EA4335] border-[3px] border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black">Cứu trợ / Ôn tập</h1>
            <p className="text-gray-500 font-bold">Spaced Repetition & Active Recall</p>
          </div>
        </div>
        
        <div className="bg-[#9B51E0] text-white border-[3px] border-black px-6 py-3 rounded-xl font-black text-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          Còn lại: <span className="text-[#FFC224] text-2xl ml-2">{items.length - currentIdx}</span>
        </div>
      </div>

      {/* Main Card */}
      <div className="relative">
        {/* Background decorative cards for depth */}
        <div className="absolute inset-0 bg-[#FFC224] border-[4px] border-black rounded-3xl translate-x-2 sm:translate-x-4 translate-y-2 sm:translate-y-4" />
        <div className="absolute inset-0 bg-[#3C73ED] border-[4px] border-black rounded-3xl translate-x-2 translate-y-2" />
        
        <div className="relative bg-white border-[4px] border-black rounded-3xl p-6 sm:p-12 min-h-[450px] flex flex-col items-center text-center">
          
          <div className="inline-block px-4 py-2 bg-[#EA4335] text-white border-[3px] border-black rounded-lg font-black text-sm uppercase tracking-wider mb-8 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {questionData.topic_tag}
          </div>
          
          <h2 className="text-2xl sm:text-4xl font-black mb-12 leading-tight">
            {questionData.question_text}
          </h2>

          {!showAnswer ? (
            <div className="mt-auto w-full max-w-md">
              <div className="bg-blue-50 border-[2px] border-blue-200 text-blue-800 p-4 rounded-xl font-bold mb-6 italic">
                💡 Nhắm mắt lại và thử tự nhớ câu trả lời trong đầu trước khi lật thẻ nhé!
              </div>
              <button 
                onClick={() => setShowAnswer(true)}
                className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-[#FFC224] text-black border-[4px] border-black rounded-2xl font-black text-xl hover:-translate-y-2 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                <RotateCcw className="w-6 h-6" /> Lật Thẻ (Xem đáp án)
              </button>
            </div>
          ) : (
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 flex flex-col items-center">
              
              <div className="w-full max-w-2xl bg-[#10B981]/10 border-[3px] border-[#10B981] rounded-2xl p-6 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#10B981] opacity-20 rounded-bl-[100px]" />
                <h3 className="text-lg font-black text-[#10B981] mb-2 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" /> ĐÁP ÁN ĐÚNG
                </h3>
                <p className="text-2xl font-black">{questionData.correct_answer}</p>
              </div>

              <div className="w-full max-w-2xl bg-gray-50 border-[3px] border-black rounded-2xl p-6 mb-10 text-left relative shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-[#FFC224] border-[2px] border-black rounded-full flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black mb-1">Giải thích từ AI:</h4>
                    <p className="font-bold text-gray-700 leading-relaxed">{questionData.explanation}</p>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-black mb-6">Bạn có nhớ câu này không?</h3>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl">
                <button 
                  onClick={() => handleReview(false)}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white text-[#EA4335] border-[4px] border-[#EA4335] rounded-2xl font-black text-lg hover:bg-red-50 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(234,67,53,1)] active:translate-y-0 active:shadow-none transition-all disabled:opacity-50"
                >
                  <XCircle className="w-6 h-6" /> Quên (Học lại sau)
                </button>
                <button 
                  onClick={() => handleReview(true)}
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-[#10B981] text-white border-[4px] border-black rounded-2xl font-black text-lg hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-6 h-6" /> Đã Nhớ!
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  )
}
