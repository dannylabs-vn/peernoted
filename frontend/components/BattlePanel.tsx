'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Swords, Sparkles, Loader2, Play, Users, Crown, Clock, Trophy,
  Triangle, Diamond, Circle, Square, Check, X, RotateCcw, Zap, Award,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  getSocket, battleCreate, battleJoin, battleStart, battleAnswer,
} from '@/lib/socket';
import { getFolders } from '@/lib/api';

// ---------- types ----------
type Phase = 'idle' | 'generating' | 'lobby' | 'question' | 'reveal' | 'finished';

interface BattleUser { id?: string; _id?: string; userId?: string; name?: string; avatar?: string }
interface Player { user: BattleUser; score?: number }
interface LeaderRow { user: BattleUser; score: number; lastCorrect?: boolean }
interface Folder { _id: string; id?: string; name: string; subject?: string; fileCount?: number }
interface CurrentQuestion {
  index: number; total: number; question: string; options: string[]; timePerQ: number;
}

// ---------- helpers ----------
const uid = (u?: BattleUser): string => String(u?.id ?? u?._id ?? u?.userId ?? '');

// Kahoot-style answer color config (Google palette)
const ANSWER_STYLES = [
  { bg: '#EA4335', Icon: Triangle }, // red
  { bg: '#4285F4', Icon: Diamond },  // blue
  { bg: '#FBBC05', Icon: Circle },   // yellow
  { bg: '#34A853', Icon: Square },   // green
];

// ---------- panel shell (module-level so it keeps a stable identity across re-renders) ----------
function PanelShell({
  toast,
  children,
}: {
  toast: { msg: string; kind: 'good' | 'bad' } | null;
  children: React.ReactNode;
}) {
  return (
    <div className="relative border-[3px] border-black rounded-2xl bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-5 overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl border-[3px] border-black bg-[#FBBC05] flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <Swords className="w-5 h-5 text-black" />
        </div>
        <h3 className="font-black text-lg tracking-tight">Thách Đấu Quiz</h3>
      </div>
      {children}
      {/* toast */}
      {toast && (
        <div
          className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl border-[3px] border-black font-black text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
            toast.kind === 'good' ? 'bg-[#34A853] text-white' : 'bg-[#EA4335] text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ---------- avatar ----------
function Avatar({ user, size = 40 }: { user: BattleUser; size?: number }) {
  const name = user?.name || '?';
  return (
    <div
      className="rounded-full border-[3px] border-black overflow-hidden flex items-center justify-center bg-white shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
      style={{ width: size, height: size }}
    >
      {user?.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatar} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-black" style={{ fontSize: size * 0.42 }}>
          {name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export default function BattlePanel({ roomId, myUserId }: { roomId: string; myUserId: string }) {
  // ----- core state -----
  const [phase, setPhase] = useState<Phase>('idle');
  const [battleId, setBattleId] = useState<string>('');
  const [isHost, setIsHost] = useState(false);

  // idle / folder picker
  const [showPicker, setShowPicker] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<number>(15);
  const [creating, setCreating] = useState(false);
  const [incoming, setIncoming] = useState(false); // another host's battle available

  // battle meta
  const [folderName, setFolderName] = useState('');
  const [questionCount, setQuestionCount] = useState(0);
  const [hostUser, setHostUser] = useState<BattleUser | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);

  // question
  const [currentQuestion, setCurrentQuestion] = useState<CurrentQuestion | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [myAnswer, setMyAnswer] = useState<number | null>(null);
  const [gained, setGained] = useState<number | null>(null);

  // reveal
  const [correctAnswer, setCorrectAnswer] = useState<number | string | null>(null);
  const [explanation, setExplanation] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);

  // finished
  const [awards, setAwards] = useState<{ userId: string; points: number }[]>([]);

  // ux
  const [toast, setToast] = useState<{ msg: string; kind: 'good' | 'bad' } | null>(null);
  const [socketTick, setSocketTick] = useState(0);

  const showToast = useCallback((msg: string, kind: 'good' | 'bad' = 'good') => {
    setToast({ msg, kind });
  }, []);

  // auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ---------- reset ----------
  const resetAll = useCallback(() => {
    setPhase('idle');
    setBattleId('');
    setIsHost(false);
    setShowPicker(false);
    setSelectedFolderId('');
    setCreating(false);
    setIncoming(false);
    setFolderName('');
    setQuestionCount(0);
    setHostUser(null);
    setPlayers([]);
    setCurrentQuestion(null);
    setTimeLeft(0);
    setHasAnswered(false);
    setMyAnswer(null);
    setGained(null);
    setCorrectAnswer(null);
    setExplanation('');
    setLeaderboard([]);
    setAwards([]);
  }, []);

  // ---------- socket listeners ----------
  useEffect(() => {
    const s = getSocket();
    if (!s) {
      // socket not ready yet — retry shortly
      const t = setTimeout(() => setSocketTick((x) => x + 1), 500);
      return () => clearTimeout(t);
    }

    const onGenerating = (d: { by?: BattleUser | string }) => {
      const byId = typeof d?.by === 'string' ? d.by : uid(d?.by as BattleUser);
      if (byId && byId === myUserId) setPhase('generating');
    };

    const onCreated = (d: {
      battleId: string; host: BattleUser; folderName: string; questionCount: number;
      timePerQ: number; players: Player[];
    }) => {
      setBattleId(d.battleId);
      setFolderName(d.folderName || '');
      setQuestionCount(d.questionCount || 0);
      setSelectedTime(d.timePerQ || 15);
      setHostUser(d.host || null);
      setPlayers(d.players || []);
      const hostId = uid(d.host);
      if (hostId && hostId === myUserId) {
        setIsHost(true);
        setIncoming(false);
        setPhase('lobby');
      } else {
        setIsHost(false);
        setIncoming(true);   // hiện prompt "Có trận đấu! Tham gia"
        setShowPicker(false); // đóng picker nếu member đang tự mở → thấy prompt join
      }
    };

    const onLobby = (d: { battleId: string; players: Player[] }) => {
      setPlayers(d.players || []);
    };

    const onQuestion = (d: CurrentQuestion) => {
      setCurrentQuestion(d);
      setTimeLeft(d.timePerQ);
      setHasAnswered(false);
      setMyAnswer(null);
      setGained(null);
      setCorrectAnswer(null);
      setExplanation('');
      setIncoming(false);
      setPhase('question');
    };

    const onReveal = (d: {
      index: number; correctAnswer: number | string; explanation: string; leaderboard: LeaderRow[];
    }) => {
      setCorrectAnswer(d.correctAnswer ?? null);
      setExplanation(d.explanation || '');
      setLeaderboard(d.leaderboard || []);
      setPhase('reveal');
    };

    const onFinished = (d: { battleId: string; leaderboard: LeaderRow[]; folderName: string }) => {
      setLeaderboard(d.leaderboard || []);
      if (d.folderName) setFolderName(d.folderName);
      setPhase('finished');
    };

    const onAwards = (d: { awards: { userId: string; points: number }[] }) => {
      const list = d?.awards || [];
      setAwards(list);
      const mine = list.find((a) => String(a.userId) === myUserId);
      if (mine) showToast(`+${mine.points} PeerPoint! 🏆`, 'good');
    };

    const onError = (d: { error?: string }) => {
      showToast(d?.error || 'Có lỗi xảy ra trong trận đấu', 'bad');
    };

    s.on('battle-generating', onGenerating);
    s.on('battle-created', onCreated);
    s.on('battle-lobby', onLobby);
    s.on('battle-question', onQuestion);
    s.on('battle-reveal', onReveal);
    s.on('battle-finished', onFinished);
    s.on('battle-points-awarded', onAwards);
    s.on('battle-error', onError);

    return () => {
      s.off('battle-generating', onGenerating);
      s.off('battle-created', onCreated);
      s.off('battle-lobby', onLobby);
      s.off('battle-question', onQuestion);
      s.off('battle-reveal', onReveal);
      s.off('battle-finished', onFinished);
      s.off('battle-points-awarded', onAwards);
      s.off('battle-error', onError);
    };
  }, [myUserId, socketTick, showToast]);

  // ---------- countdown timer ----------
  useEffect(() => {
    if (phase !== 'question' || !currentQuestion) return;
    setTimeLeft(currentQuestion.timePerQ);
    const iv = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(iv);
  }, [phase, currentQuestion?.index]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- confetti for winner ----------
  useEffect(() => {
    if (phase !== 'finished') return;
    const winner = leaderboard[0];
    if (winner && uid(winner.user) === myUserId) {
      const fire = (opts: confetti.Options) =>
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, ...opts });
      fire({});
      setTimeout(() => fire({ angle: 60, origin: { x: 0, y: 0.65 } }), 200);
      setTimeout(() => fire({ angle: 120, origin: { x: 1, y: 0.65 } }), 400);
    }
  }, [phase, leaderboard, myUserId]);

  // ---------- actions ----------
  const openPicker = async () => {
    setShowPicker(true);
    if (folders.length === 0) {
      setLoadingFolders(true);
      try {
        const res = await getFolders();
        const list: Folder[] = (res?.data || res || []).filter(
          (f: Folder) => f?.name?.toLowerCase() !== 'hình ảnh'
        );
        setFolders(list);
        if (list[0]) setSelectedFolderId(list[0]._id || list[0].id || '');
      } catch {
        showToast('Không tải được danh sách thư mục', 'bad');
      } finally {
        setLoadingFolders(false);
      }
    }
  };

  const handleCreate = async () => {
    if (!selectedFolderId) {
      showToast('Hãy chọn một thư mục tài liệu', 'bad');
      return;
    }
    setCreating(true);
    setIsHost(true);
    setPhase('generating');
    try {
      await battleCreate(roomId, selectedFolderId, selectedTime);
      // backend emits battle-generating / battle-created async
    } catch (e: any) {
      const msg = e?.message || 'Không tạo được trận đấu';
      setPhase('idle');
      setIsHost(false);
      // Nếu phòng đã có trận khác → không tạo mới, mời họ JOIN thay vì báo lỗi
      if (/đang có trận|trận đấu khác/i.test(msg)) {
        setShowPicker(false);
        setIncoming(true);
        showToast('Phòng đã có trận đấu — bấm "Tham gia" nhé!', 'good');
      } else {
        showToast(msg, 'bad');
        setShowPicker(true);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!battleId) return;
    try {
      await battleJoin(battleId);
      setIsHost(false);
      setIncoming(false);
      setPhase('lobby');
    } catch (e: any) {
      showToast(e?.message || 'Không tham gia được trận đấu', 'bad');
    }
  };

  const handleStart = async () => {
    if (!battleId) return;
    try {
      await battleStart(battleId);
    } catch (e: any) {
      showToast(e?.message || 'Không bắt đầu được trận đấu', 'bad');
    }
  };

  // optionIndex = vị trí đáp án (0-3) để highlight UI.
  // battleAnswer PHẢI gửi QUESTION index (currentQuestion.index) — không phải
  // option index — nếu không backend so battle.currentIndex !== index → bỏ qua
  // câu trả lời → điểm không cộng + BXH không cập nhật.
  const handleAnswer = async (optionIndex: number, option: string) => {
    if (hasAnswered || !currentQuestion) return;
    setHasAnswered(true);
    setMyAnswer(optionIndex);
    try {
      const res = await battleAnswer(battleId, currentQuestion.index, option);
      if (res?.ok && typeof res.gained === 'number') setGained(res.gained);
    } catch {
      /* answer is best-effort */
    }
  };

  const isOptionCorrect = (i: number, text: string): boolean => {
    if (correctAnswer == null) return false;
    if (typeof correctAnswer === 'number') return correctAnswer === i;
    return String(correctAnswer).trim() === String(text).trim();
  };

  // ---------- shell ----------
  const socket = getSocket();

  // socket not connected
  if (!socket) {
    return (
      <PanelShell toast={toast}>
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#4285F4]" />
          <p className="font-black text-gray-600">Đang kết nối...</p>
        </div>
      </PanelShell>
    );
  }

  // ===================== IDLE =====================
  if (phase === 'idle') {
    return (
      <PanelShell toast={toast}>
        {!showPicker ? (
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <div className="text-5xl">⚔️</div>
            <p className="font-black text-xl leading-tight">
              Đấu Quiz kiểu Kahoot với cả phòng!
            </p>
            <p className="font-bold text-sm text-gray-500 max-w-xs">
              AI soạn câu hỏi từ tài liệu của bạn. Trả lời nhanh & đúng để leo top và ẵm PeerPoint.
            </p>

            {incoming && (
              <div className="w-full mt-1 rounded-2xl border-[3px] border-black bg-[#FBBC05] p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-left">
                  <Zap className="w-5 h-5 shrink-0" />
                  <div className="leading-tight">
                    <p className="font-black text-sm">Có trận đấu!</p>
                    <p className="font-bold text-xs">
                      {hostUser?.name ? `${hostUser.name} vừa mở phòng` : 'Tham gia ngay'}
                      {folderName ? ` · ${folderName}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleJoin}
                  className="shrink-0 px-4 py-2 rounded-xl border-[3px] border-black bg-white font-black text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
                >
                  Tham gia
                </button>
              </div>
            )}

            {!incoming && (
              <button
                onClick={openPicker}
                className="mt-2 px-6 py-3 rounded-2xl border-[3px] border-black bg-[#4285F4] text-white font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
              >
                <Swords className="w-5 h-5" /> Tạo phòng đấu
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <p className="font-black text-sm mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#FBBC05]" /> Chọn thư mục tài liệu
              </p>
              {loadingFolders ? (
                <div className="flex items-center gap-2 py-6 justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-[#4285F4]" />
                  <span className="font-bold text-sm text-gray-500">Đang tải thư mục...</span>
                </div>
              ) : folders.length === 0 ? (
                <p className="font-bold text-sm text-gray-500 py-4 text-center">
                  Chưa có thư mục nào. Hãy tạo tài liệu trước nhé!
                </p>
              ) : (
                <div className="max-h-52 overflow-y-auto flex flex-col gap-2 pr-1">
                  {folders.map((f) => {
                    const fid = f._id || f.id || '';
                    const active = fid === selectedFolderId;
                    return (
                      <button
                        key={fid}
                        onClick={() => setSelectedFolderId(fid)}
                        className={`text-left px-3 py-2.5 rounded-xl border-[3px] border-black font-bold text-sm transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                          active ? 'bg-[#34A853] text-white' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-black">{f.name}</span>
                          {typeof f.fileCount === 'number' && (
                            <span
                              className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-black ${
                                active ? 'bg-white text-black' : 'bg-[#FBBC05]'
                              }`}
                            >
                              {f.fileCount} tệp
                            </span>
                          )}
                        </div>
                        {f.subject && (
                          <span className={`text-[11px] font-bold ${active ? 'text-white/90' : 'text-gray-500'}`}>
                            {f.subject}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <p className="font-black text-sm mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#EA4335]" /> Thời gian mỗi câu
              </p>
              <div className="flex gap-2">
                {[10, 15, 20].map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTime(t)}
                    className={`flex-1 py-2.5 rounded-xl border-[3px] border-black font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all ${
                      selectedTime === t ? 'bg-[#4285F4] text-white' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowPicker(false)}
                className="px-4 py-3 rounded-2xl border-[3px] border-black bg-white font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !selectedFolderId}
                className="flex-1 px-4 py-3 rounded-2xl border-[3px] border-black bg-[#34A853] text-white font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                Bắt đầu soạn đề
              </button>
            </div>
          </div>
        )}
      </PanelShell>
    );
  }

  // ===================== GENERATING =====================
  if (phase === 'generating') {
    return (
      <PanelShell toast={toast}>
        <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl border-[3px] border-black bg-[#FBBC05] flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse">
              <Sparkles className="w-8 h-8" />
            </div>
            <Loader2 className="w-6 h-6 animate-spin text-[#4285F4] absolute -bottom-2 -right-2" />
          </div>
          <p className="font-black text-lg">AI đang soạn câu hỏi từ tài liệu...</p>
          <p className="font-bold text-sm text-gray-500">Chờ chút thôi, đề xịn đang tới! 🔥</p>
        </div>
      </PanelShell>
    );
  }

  // ===================== LOBBY =====================
  if (phase === 'lobby') {
    return (
      <PanelShell toast={toast}>
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border-[3px] border-black bg-[#4285F4] text-white p-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-black text-lg leading-tight">{folderName || 'Phòng đấu'}</p>
            <div className="flex items-center gap-3 mt-1 font-bold text-sm">
              <span className="flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> {questionCount} câu hỏi
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" /> {selectedTime}s / câu
              </span>
            </div>
          </div>

          <div>
            <p className="font-black text-sm mb-2 flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Người chơi ({players.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {players.length === 0 && (
                <p className="font-bold text-sm text-gray-500">Đang chờ người chơi tham gia...</p>
              )}
              {players.map((p) => {
                const isHostPlayer = hostUser && uid(p.user) === uid(hostUser);
                const isMe = uid(p.user) === myUserId;
                return (
                  <div
                    key={uid(p.user)}
                    className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border-[3px] border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <Avatar user={p.user} size={32} />
                    <span className="font-black text-sm">
                      {p.user?.name || 'Ẩn danh'}
                      {isMe ? ' (Bạn)' : ''}
                    </span>
                    {isHostPlayer && <Crown className="w-4 h-4 text-[#FBBC05]" fill="#FBBC05" />}
                  </div>
                );
              })}
            </div>
          </div>

          {isHost ? (
            <button
              onClick={handleStart}
              disabled={players.length === 0}
              className="w-full px-4 py-3 rounded-2xl border-[3px] border-black bg-[#EA4335] text-white font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" fill="currentColor" /> Bắt đầu
            </button>
          ) : (
            <div className="w-full px-4 py-3 rounded-2xl border-[3px] border-black bg-[#FBBC05] font-black text-center flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <Loader2 className="w-5 h-5 animate-spin" /> Đang chờ host bắt đầu...
            </div>
          )}
        </div>
      </PanelShell>
    );
  }

  // ===================== QUESTION / REVEAL =====================
  if ((phase === 'question' || phase === 'reveal') && currentQuestion) {
    const revealing = phase === 'reveal';
    const pct = currentQuestion.timePerQ > 0 ? (timeLeft / currentQuestion.timePerQ) * 100 : 0;

    return (
      <PanelShell toast={toast}>
        <div className="flex flex-col gap-3">
          {/* progress row */}
          <div className="flex items-center justify-between font-black text-sm">
            <span className="px-2.5 py-1 rounded-full border-[3px] border-black bg-[#4285F4] text-white">
              Câu {currentQuestion.index + 1}/{currentQuestion.total}
            </span>
            {!revealing && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full border-[3px] border-black bg-white">
                <Clock className="w-4 h-4" /> {timeLeft}s
              </span>
            )}
          </div>

          {/* timer bar */}
          {!revealing && (
            <div className="h-3 w-full rounded-full border-[3px] border-black bg-white overflow-hidden">
              <div
                className="h-full transition-all duration-1000 ease-linear"
                style={{
                  width: `${pct}%`,
                  background: pct > 50 ? '#34A853' : pct > 25 ? '#FBBC05' : '#EA4335',
                }}
              />
            </div>
          )}

          {/* question text */}
          <div className="rounded-2xl border-[3px] border-black bg-[#FBBC05] p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <p className="font-black text-base leading-snug">{currentQuestion.question}</p>
          </div>

          {/* options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {currentQuestion.options.map((opt, i) => {
              const { bg, Icon } = ANSWER_STYLES[i % 4];
              const correct = revealing && isOptionCorrect(i, opt);
              const wrongPick = revealing && myAnswer === i && !correct;
              const picked = myAnswer === i;

              let stateClass = 'text-white';
              let style: React.CSSProperties = { background: bg };
              if (revealing) {
                if (correct) {
                  style = { background: '#34A853' };
                } else if (wrongPick) {
                  style = { background: '#EA4335' };
                } else {
                  style = { background: '#9CA3AF' };
                  stateClass = 'text-white opacity-70';
                }
              }

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i, opt)}
                  disabled={hasAnswered || revealing}
                  style={style}
                  className={`relative flex items-center gap-2.5 text-left px-3 py-3 rounded-xl border-[3px] border-black font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all ${stateClass} ${
                    !hasAnswered && !revealing ? 'hover:-translate-y-0.5' : ''
                  } ${picked && !revealing ? 'ring-4 ring-black ring-offset-1' : ''} disabled:cursor-default`}
                >
                  <span className="w-7 h-7 shrink-0 rounded-lg border-2 border-black bg-white/90 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-black" fill="black" />
                  </span>
                  <span className="flex-1 leading-tight">{opt}</span>
                  {correct && <Check className="w-5 h-5 shrink-0" />}
                  {wrongPick && <X className="w-5 h-5 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* answered / gained banner */}
          {!revealing && hasAnswered && (
            <div className="rounded-xl border-[3px] border-black bg-[#34A853] text-white p-3 font-black text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {gained != null ? (
                <span className="flex items-center justify-center gap-1.5">
                  <Zap className="w-5 h-5" fill="currentColor" /> +{gained} điểm! Chờ mọi người...
                </span>
              ) : (
                'Đã trả lời, chờ mọi người...'
              )}
            </div>
          )}

          {/* reveal: explanation + mini leaderboard */}
          {revealing && (
            <div className="flex flex-col gap-3">
              {explanation && (
                <div className="rounded-xl border-[3px] border-black bg-[#4285F4] text-white p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <p className="font-black text-xs uppercase mb-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Giải thích
                  </p>
                  <p className="font-bold text-sm leading-snug">{explanation}</p>
                </div>
              )}
              {leaderboard.length > 0 && (
                <div className="rounded-xl border-[3px] border-black bg-white p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <p className="font-black text-xs uppercase mb-2 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-[#FBBC05]" /> Bảng xếp hạng
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {leaderboard.slice(0, 5).map((row, idx) => {
                      const isMe = uid(row.user) === myUserId;
                      return (
                        <div
                          key={uid(row.user)}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border-2 border-black ${
                            isMe ? 'bg-[#FBBC05]' : 'bg-gray-50'
                          }`}
                        >
                          <span className="font-black w-5 text-center">{idx + 1}</span>
                          <Avatar user={row.user} size={26} />
                          <span className="font-black text-sm flex-1 truncate">
                            {row.user?.name || 'Ẩn danh'}
                            {isMe ? ' (Bạn)' : ''}
                          </span>
                          {row.lastCorrect && <Check className="w-4 h-4 text-[#34A853]" />}
                          <span className="font-black text-sm">{row.score}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </PanelShell>
    );
  }

  // ===================== FINISHED =====================
  if (phase === 'finished') {
    const podium = leaderboard.slice(0, 3);
    const medals = ['🥇', '🥈', '🥉'];
    // podium display order: 2nd, 1st, 3rd
    const order = [podium[1], podium[0], podium[2]];
    const heights = ['h-20', 'h-28', 'h-16'];
    const podiumColors = ['#4285F4', '#FBBC05', '#EA4335'];
    const rankOfSlot = [2, 1, 3];
    const iWon = leaderboard[0] && uid(leaderboard[0].user) === myUserId;

    return (
      <PanelShell toast={toast}>
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <p className="font-black text-2xl flex items-center justify-center gap-2">
              <Trophy className="w-7 h-7 text-[#FBBC05]" fill="#FBBC05" /> Kết Thúc!
            </p>
            <p className="font-bold text-sm text-gray-500">
              {iWon ? 'Bạn là nhà vô địch! 🎉' : folderName || 'Trận đấu đã xong'}
            </p>
          </div>

          {/* podium */}
          <div className="flex items-end justify-center gap-2">
            {order.map((row, slot) =>
              row ? (
                <div key={uid(row.user)} className="flex flex-col items-center gap-1 flex-1 max-w-[110px]">
                  <div className="text-2xl">{medals[rankOfSlot[slot] - 1]}</div>
                  <Avatar user={row.user} size={44} />
                  <span className="font-black text-xs text-center truncate w-full">
                    {row.user?.name || 'Ẩn danh'}
                  </span>
                  <div
                    className={`w-full ${heights[slot]} rounded-t-xl border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}
                    style={{ background: podiumColors[slot] }}
                  >
                    <span className="font-black text-white text-lg">{row.score}</span>
                  </div>
                </div>
              ) : (
                <div key={`empty-${slot}`} className="flex-1 max-w-[110px]" />
              )
            )}
          </div>

          {/* full leaderboard */}
          {leaderboard.length > 3 && (
            <div className="rounded-xl border-[3px] border-black bg-white p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {leaderboard.slice(3).map((row, idx) => {
                  const isMe = uid(row.user) === myUserId;
                  const award = awards.find((a) => String(a.userId) === uid(row.user));
                  return (
                    <div
                      key={uid(row.user)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border-2 border-black ${
                        isMe ? 'bg-[#FBBC05]' : 'bg-gray-50'
                      }`}
                    >
                      <span className="font-black w-6 text-center">{idx + 4}</span>
                      <Avatar user={row.user} size={26} />
                      <span className="font-black text-sm flex-1 truncate">
                        {row.user?.name || 'Ẩn danh'}
                        {isMe ? ' (Bạn)' : ''}
                      </span>
                      {award && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-black bg-[#34A853] text-white">
                          +{award.points}
                        </span>
                      )}
                      <span className="font-black text-sm">{row.score}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* awards summary */}
          {awards.length > 0 && (
            <div className="rounded-xl border-[3px] border-black bg-[#34A853] text-white p-3 font-black text-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2">
              <Award className="w-5 h-5" />
              {(() => {
                const mine = awards.find((a) => String(a.userId) === myUserId);
                return mine ? `Bạn nhận +${mine.points} PeerPoint!` : 'PeerPoint đã được trao thưởng!';
              })()}
            </div>
          )}

          <button
            onClick={resetAll}
            className="w-full px-4 py-3 rounded-2xl border-[3px] border-black bg-[#4285F4] text-white font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-transform flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" /> Chơi lại
          </button>
        </div>
      </PanelShell>
    );
  }

  // fallback (should not hit)
  return (
    <PanelShell toast={toast}>
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#4285F4]" />
      </div>
    </PanelShell>
  );
}
