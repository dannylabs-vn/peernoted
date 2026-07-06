"use client"

import { useState, useEffect, useCallback } from 'react'
import { getTutorAnalysis, generateTutorRoadmap } from '@/lib/api'
import {
  Stethoscope,
  Rocket,
  Target,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Loader2,
  Sparkles,
  PenLine,
  Flame,
} from 'lucide-react'

// ===== Types =====
interface TopicStat {
  topic: string
  total: number
  correct: number
  wrong: number
  accuracy: number // 0-100
}

interface Stats {
  totalAttempts: number
  topics: TopicStat[]
}

interface Weakness {
  topic: string
  severity: 'cao' | 'trung bình' | 'thấp' | string
  evidence: string
}

interface RoadmapWeek {
  week: number
  focus: string
  actions: string[]
  goal: string
}

interface Roadmap {
  summary: string
  weaknesses: Weakness[]
  roadmap: RoadmapWeek[]
  tips: string[]
}

interface RoadmapResult {
  stats: Stats
  roadmap: Roadmap
}

// ===== Helpers =====
function accuracyColor(acc: number): string {
  if (acc >= 80) return '#34A853'
  if (acc >= 50) return '#FBBC05'
  return '#EA4335'
}

function severityStyle(sev: string) {
  const s = (sev || '').toLowerCase().trim()
  if (s === 'cao') {
    return { bg: '#EA4335', text: 'text-white', label: 'Mức độ: Cao', icon: '🔴' }
  }
  if (s === 'trung bình' || s === 'trung binh') {
    return { bg: '#FBBC05', text: 'text-black', label: 'Mức độ: Trung bình', icon: '🟡' }
  }
  return { bg: '#34A853', text: 'text-white', label: 'Mức độ: Thấp', icon: '🟢' }
}

// Accent colors cycled across the weekly timeline (Google palette)
const WEEK_COLORS = ['#4285F4', '#EA4335', '#34A853', '#FBBC05']

export default function TutorPage() {
  const [loadingAnalysis, setLoadingAnalysis] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)

  const [userNote, setUserNote] = useState('')
  const [generating, setGenerating] = useState(false)
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [error, setError] = useState('')

  const loadAnalysis = useCallback(async () => {
    setLoadingAnalysis(true)
    try {
      const res = await getTutorAnalysis()
      setStats(res)
    } catch (err) {
      console.error(err)
      setStats({ totalAttempts: 0, topics: [] })
    } finally {
      setLoadingAnalysis(false)
    }
  }, [])

  useEffect(() => {
    loadAnalysis()
  }, [loadAnalysis])

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    try {
      const res: RoadmapResult = await generateTutorRoadmap(userNote)
      setRoadmap(res.roadmap)
      if (res.stats) setStats(res.stats)
      // Scroll result into view after render
      setTimeout(() => {
        document.getElementById('roadmap-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Đã có lỗi xảy ra. Vui lòng thử lại.'
      setError(msg)
    } finally {
      setGenerating(false)
    }
  }

  const totalAttempts = stats?.totalAttempts ?? 0
  const topics = stats?.topics ?? []

  return (
    <div className="max-w-[960px] mx-auto pb-16">
      {/* ===== Header ===== */}
      <div className="flex items-center gap-4 mb-8 bg-white border-[3px] border-black p-6 rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="w-14 h-14 bg-[#EA4335] border-[3px] border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex-shrink-0">
          <Stethoscope className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-4xl font-black leading-tight">Vá Lỗi — Gia Sư AI 🩹</h1>
          <p className="text-gray-500 font-bold mt-1">
            Phân tích điểm yếu từ lịch sử làm quiz và lập lộ trình học cá nhân hóa
          </p>
        </div>
      </div>

      {/* ===== Bản đồ khuyết điểm ===== */}
      <div className="bg-white border-[3px] border-black rounded-2xl p-6 sm:p-8 mb-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#4285F4] border-[3px] border-black rounded-lg flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-black">Bản đồ khuyết điểm</h2>
        </div>

        {loadingAnalysis ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 border-[4px] border-black border-t-[#4285F4] rounded-full animate-spin shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4" />
            <p className="font-black text-lg">Đang quét lịch sử làm quiz...</p>
          </div>
        ) : totalAttempts === 0 ? (
          <div className="bg-[#FBBC05]/20 border-[3px] border-dashed border-black rounded-2xl p-8 text-center">
            <div className="text-5xl mb-4">🗺️</div>
            <p className="font-black text-lg leading-relaxed max-w-xl mx-auto">
              Bạn chưa làm quiz nào — hãy làm vài bài Quiz để AI phân tích điểm yếu, hoặc tự mô tả
              điểm yếu bên dưới.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="inline-block bg-[#4285F4] text-white border-[3px] border-black px-4 py-2 rounded-xl font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] mb-2">
              Tổng số lần làm bài: <span className="text-[#FBBC05] ml-1">{totalAttempts}</span>
            </div>
            {topics.map((t, idx) => {
              const color = accuracyColor(t.accuracy)
              return (
                <div key={idx} className="bg-gray-50 border-[3px] border-black rounded-2xl p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center justify-between mb-2 gap-3">
                    <span className="font-black text-base sm:text-lg truncate">{t.topic}</span>
                    <span className="font-black text-sm whitespace-nowrap px-3 py-1 border-[2px] border-black rounded-lg text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" style={{ backgroundColor: color }}>
                      {Math.round(t.accuracy)}%
                    </span>
                  </div>
                  <div className="w-full h-6 bg-white border-[3px] border-black rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out border-r-[3px] border-black"
                      style={{ width: `${Math.max(t.accuracy, 4)}%`, backgroundColor: color }}
                    />
                  </div>
                  <p className="font-bold text-gray-600 text-sm mt-2">
                    đúng {t.correct}/{t.total} câu · sai {t.wrong} câu
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ===== Tự mô tả điểm yếu + nút tạo lộ trình ===== */}
      <div className="bg-white border-[3px] border-black rounded-2xl p-6 sm:p-8 mb-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <label htmlFor="userNote" className="flex items-center gap-2 text-xl font-black mb-3">
          <PenLine className="w-6 h-6 text-[#EA4335]" />
          Tự mô tả điểm yếu của bạn <span className="text-gray-400 font-bold text-base">(tùy chọn)</span>
        </label>
        <textarea
          id="userNote"
          value={userNote}
          onChange={(e) => setUserNote(e.target.value)}
          disabled={generating}
          rows={4}
          placeholder="VD: Em hay quên công thức đạo hàm, không hiểu giới hạn vô định..."
          className="w-full border-[3px] border-black rounded-2xl p-4 font-bold text-base resize-none focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(66,133,244,1)] transition-all disabled:opacity-60 placeholder:text-gray-400"
        />

        {error && (
          <div className="mt-4 flex items-start gap-3 bg-[#EA4335]/10 border-[3px] border-[#EA4335] rounded-2xl p-4">
            <AlertTriangle className="w-6 h-6 text-[#EA4335] flex-shrink-0 mt-0.5" />
            <p className="font-black text-[#EA4335]">{error}</p>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="mt-5 w-full flex items-center justify-center gap-3 px-8 py-5 bg-[#FBBC05] text-black border-[4px] border-black rounded-2xl font-black text-xl hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          {generating ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Gia sư AI đang phân tích và viết lộ trình...
            </>
          ) : (
            <>
              <Rocket className="w-6 h-6" />
              🚀 Tạo lộ trình học
            </>
          )}
        </button>
        {generating && (
          <p className="text-center font-bold text-gray-500 mt-3 animate-pulse">
            Quá trình này có thể mất 10-20 giây, bạn chờ chút nhé...
          </p>
        )}
      </div>

      {/* ===== Kết quả lộ trình ===== */}
      {roadmap && (
        <div id="roadmap-result" className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
          {/* Summary intro card */}
          <div className="relative">
            <div className="absolute inset-0 bg-[#34A853] border-[4px] border-black rounded-3xl translate-x-3 translate-y-3" />
            <div className="relative bg-white border-[4px] border-black rounded-3xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[#34A853] border-[3px] border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black">Lộ trình của bạn đã sẵn sàng!</h2>
              </div>
              <p className="font-bold text-lg leading-relaxed text-gray-800">{roadmap.summary}</p>
            </div>
          </div>

          {/* Weaknesses */}
          {roadmap.weaknesses && roadmap.weaknesses.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-[#EA4335] border-[3px] border-black rounded-lg flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-black">Điểm yếu cần vá</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {roadmap.weaknesses.map((w, idx) => {
                  const sev = severityStyle(w.severity)
                  return (
                    <div key={idx} className="bg-white border-[3px] border-black rounded-2xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-black text-lg leading-tight">{w.topic}</h3>
                        <span className={`whitespace-nowrap px-3 py-1 border-[2px] border-black rounded-lg font-black text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${sev.text}`} style={{ backgroundColor: sev.bg }}>
                          {sev.icon} {sev.label}
                        </span>
                      </div>
                      <p className="font-bold text-gray-600 leading-relaxed">{w.evidence}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Roadmap timeline */}
          {roadmap.roadmap && roadmap.roadmap.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#4285F4] border-[3px] border-black rounded-lg flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-black">Lộ trình 4 tuần</h2>
              </div>

              <div className="relative pl-6 sm:pl-8">
                {/* vertical timeline line */}
                <div className="absolute left-[10px] sm:left-[14px] top-3 bottom-3 w-[3px] bg-black" />

                <div className="space-y-6">
                  {roadmap.roadmap.map((wk, idx) => {
                    const color = WEEK_COLORS[idx % WEEK_COLORS.length]
                    return (
                      <div key={idx} className="relative">
                        {/* timeline node */}
                        <div
                          className="absolute -left-6 sm:-left-8 top-5 w-6 h-6 sm:w-7 sm:h-7 rounded-full border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          style={{ backgroundColor: color }}
                        />
                        <div className="bg-white border-[3px] border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                          <div
                            className="px-5 py-3 border-b-[3px] border-black flex items-center justify-between gap-3"
                            style={{ backgroundColor: color }}
                          >
                            <span className="font-black text-white text-lg sm:text-xl" style={{ textShadow: '2px 2px 0px rgba(0,0,0,0.4)' }}>
                              Tuần {wk.week}
                            </span>
                            <span className="bg-white text-black border-[2px] border-black px-3 py-1 rounded-lg font-black text-sm">
                              {wk.focus}
                            </span>
                          </div>
                          <div className="p-5">
                            <ul className="space-y-3 mb-4">
                              {wk.actions.map((action, aIdx) => (
                                <li key={aIdx} className="flex items-start gap-3">
                                  <span className="w-6 h-6 flex-shrink-0 bg-[#34A853] border-[2px] border-black rounded-md flex items-center justify-center mt-0.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                                    <CheckCircle2 className="w-4 h-4 text-white" />
                                  </span>
                                  <span className="font-bold text-gray-800 leading-relaxed">{action}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="bg-[#FBBC05]/20 border-[2px] border-black rounded-xl px-4 py-3 flex items-start gap-2">
                              <Target className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
                              <p className="font-black text-gray-900">
                                🎯 Mục tiêu: <span className="font-bold">{wk.goal}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tips */}
          {roadmap.tips && roadmap.tips.length > 0 && (
            <div className="bg-[#9B51E0] border-[4px] border-black rounded-3xl p-6 sm:p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 bg-white border-[3px] border-black rounded-xl flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Lightbulb className="w-7 h-7 text-[#FBBC05]" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white" style={{ textShadow: '2px 2px 0px #000' }}>
                  💡 Mẹo học
                </h2>
              </div>
              <ul className="space-y-3">
                {roadmap.tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-3 bg-white border-[3px] border-black rounded-xl p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <span className="w-7 h-7 flex-shrink-0 bg-[#FBBC05] border-[2px] border-black rounded-full flex items-center justify-center font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-gray-800 leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Regenerate */}
          <div className="flex justify-center pt-2">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-white text-black border-[4px] border-black rounded-2xl font-black text-lg hover:-translate-y-1 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" /> Đang tạo lại...
                </>
              ) : (
                <>
                  <RefreshCw className="w-6 h-6" /> Tạo lại lộ trình
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
