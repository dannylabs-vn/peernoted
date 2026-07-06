"use client"

import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Tự đóng sidebar mobile khi chuyển trang (tránh menu che nội dung sau khi bấm nav)
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Protect route and verify token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    import('@/lib/api').then(({ getMe }) => {
      getMe()
        .then(res => {
          if (res?.data) {
            localStorage.setItem('user', JSON.stringify(res.data));
            // Dispatch a storage event so Sidebar can update if it listens (optional)
            window.dispatchEvent(new Event('storage'));
          }
        })
        .catch(() => {
          // Token expired or invalid
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/login');
        });
    });
  }, [router]);

  return (
    <div className="flex h-screen bg-[#F8F9FA] overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar Wrapper */}
      <div className={`fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition duration-200 ease-in-out z-30 lg:z-20 h-full`}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-[#F8F9FA] p-3 sm:p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
