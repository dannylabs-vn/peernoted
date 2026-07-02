import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PeerNoted | Đăng nhập',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
