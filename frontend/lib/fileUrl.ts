// Resolve storage_url về URL dùng được:
// - URL tuyệt đối (http... — Supabase Storage) → giữ nguyên
// - Path /uploads/... (file cũ lưu local disk backend) → prepend origin backend
//   (từ NEXT_PUBLIC_API_URL bỏ /api). Lưu ý: file local trên Render bị xóa khi
//   restart nên vẫn có thể 404 — user cần re-upload để lên Supabase.
export function resolveFileUrl(url?: string | null): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';
  const origin = apiBase.replace(/\/api\/?$/, '');
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}
