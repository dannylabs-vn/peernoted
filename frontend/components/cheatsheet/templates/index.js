import AcademicBlue from './AcademicBlue'
import ModernCard from './ModernCard'
import SketchNotebook from './SketchNotebook'
import Minimalist from './Minimalist'
import NeoBrutalism from './NeoBrutalism'

export const TEMPLATES = {
  'neo-brutalism': {
    label: 'Neo Brutalism',
    description: 'Phong cách viền đen đậm, màu sắc nổi bật, mạnh mẽ',
    Component: NeoBrutalism,
    icon: '🟨'
  },
  'academic-blue': {
    label: 'Học thuật Blue',
    description: 'Đa cột cổ điển, header xanh đậm — kiểu cheat sheet lập trình',
    Component: AcademicBlue,
    icon: '📘'
  },
  'modern-card': {
    label: 'Card hiện đại',
    description: 'Mỗi block 1 card, màu pastel chia theo section',
    Component: ModernCard,
    icon: '🎴'
  },
  'sketch-notebook': {
    label: 'Sổ tay viết tay',
    description: 'Font handwriting, paper texture, xoay nhẹ — cảm giác chép tay',
    Component: SketchNotebook,
    icon: '✍️'
  },
  'minimalist': {
    label: 'Tối giản',
    description: 'Đen trắng, serif, focus nội dung',
    Component: Minimalist,
    icon: '⬜'
  }
}

export const TEMPLATE_KEYS = Object.keys(TEMPLATES)
