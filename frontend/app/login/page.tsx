"use client"

import { useState, useEffect } from 'react';
import { login, register, loginWithGoogle } from '@/lib/api';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isLoginView, setIsLoginView] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      router.push('/dashboard');
    }
  }, [router]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    school: ''
  });
  const [isOtherSchool, setIsOtherSchool] = useState(false);
  const [customSchool, setCustomSchool] = useState('');

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    if (name === 'schoolSelect') {
      if (value === 'other') {
        setIsOtherSchool(true);
        setFormData(prev => ({ ...prev, school: customSchool }));
      } else {
        setIsOtherSchool(false);
        setFormData(prev => ({ ...prev, school: value }));
      }
      return;
    }
    
    if (name === 'customSchool') {
      setCustomSchool(value);
      if (isOtherSchool) {
        setFormData(prev => ({ ...prev, school: value }));
      }
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLoginView) {
        const res = await login({ email: formData.email, password: formData.password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data));
        // Push to dashboard
        router.push('/dashboard');
      } else {
        const res = await register(formData);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data));
        // Push to dashboard
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setLoading(true);
      const res = await loginWithGoogle(credentialResponse.credential);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Đăng nhập Google thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'dummy-client-id'}>
      <main className="min-h-screen bg-[#F1F0EE] flex">
        {/* Left Side: Neo-brutalism Artwork */}
        <div className="hidden lg:flex lg:w-1/2 bg-[#FFC224] border-r-[4px] border-black p-12 flex-col relative overflow-hidden">
          <div className="flex justify-between items-start z-10 w-full relative">
            <Link href="/" className="inline-flex items-center gap-2 bg-white border-4 border-black px-4 py-2 rounded-xl hover:bg-black hover:text-white transition-colors font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Quay lại trang chủ
            </Link>
            
            {/* New Animation Top Right */}
            <div className="w-[300px] h-[300px] relative pointer-events-none mt-[-20px] mr-[-20px]">
              <Image src="/images/floating-books.svg" alt="Artwork" fill className="object-contain drop-shadow-[8px_8px_0px_rgba(0,0,0,1)]" />
            </div>
          </div>
          
          <div className="z-10 my-auto w-full flex justify-center lg:justify-start">
            <div className="inline-block bg-white border-4 border-black p-8 lg:p-10 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transform -rotate-2 hover:rotate-0 transition-transform duration-300">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight text-black">
                Việc học dễ dàng<br/>với vài cú 'click'
              </h1>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 md:p-16 lg:p-24 bg-white">
          <div className="max-w-md w-full mx-auto">
            {/* Mobile Back Button */}
            <Link href="/" className="lg:hidden inline-flex items-center gap-2 mb-8 font-bold hover:underline">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Trang chủ
            </Link>

            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-white border-4 border-black flex items-center justify-center">
                <Image src="/logo.png" alt="PeerNoted Logo" width={40} height={40} className="object-contain w-7 h-7" />
              </div>
              <h2 className="text-3xl font-black tracking-tight">PeerNoted</h2>
            </div>

            <div className="mb-8">
              <h3 className="text-2xl font-bold mb-2">{isLoginView ? 'Đăng nhập' : 'Tạo tài khoản mới'}</h3>
              <p className="text-gray-600 font-medium">{isLoginView ? 'Chào mừng bạn quay trở lại với hệ thống' : 'Bắt đầu hành trình học tập cùng AI'}</p>
            </div>

            {error && (
              <div className="bg-[#FF4A60] text-white p-4 rounded-xl border-4 border-black font-bold mb-6 flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLoginView && (
                <>
                  <div>
                    <label className="block font-bold mb-2 text-sm" htmlFor="name">Họ và Tên</label>
                    <input type="text" id="name" name="name" placeholder="Nguyễn Văn A" value={formData.name} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border-4 border-black focus:outline-none focus:ring-4 focus:ring-[#1C92FF]/50 transition-all font-medium placeholder:text-gray-400" />
                  </div>
                  
                  <div>
                    <label className="block font-bold mb-2 text-sm" htmlFor="schoolSelect">Đại học / Trường</label>
                    <select id="schoolSelect" name="schoolSelect" value={isOtherSchool ? 'other' : formData.school} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border-4 border-black focus:outline-none focus:ring-4 focus:ring-[#1C92FF]/50 transition-all font-medium bg-white">
                      <option value="" disabled>Chọn trường của bạn...</option>
                      <option value="ĐH Bách Khoa TP.HCM">ĐH Bách Khoa TP.HCM</option>
                      <option value="ĐH Khoa học Tự nhiên TP.HCM">ĐH Khoa học Tự nhiên TP.HCM</option>
                      <option value="ĐH Công nghệ Thông tin TP.HCM">ĐH Công nghệ Thông tin TP.HCM</option>
                      <option value="ĐH Khoa học Xã hội và Nhân văn TP.HCM">ĐH Khoa học Xã hội và Nhân văn TP.HCM</option>
                      <option value="ĐH Kinh tế TP.HCM (UEH)">ĐH Kinh tế TP.HCM (UEH)</option>
                      <option value="ĐH RMIT">ĐH RMIT</option>
                      <option value="ĐH Quốc tế TP.HCM">ĐH Quốc tế TP.HCM</option>
                      <option value="ĐH Ngoại thương">ĐH Ngoại thương</option>
                      <option value="ĐH FPT">ĐH FPT</option>
                      <option value="other">Khác...</option>
                    </select>
                  </div>

                  {isOtherSchool && (
                    <div className="mt-2">
                      <input type="text" name="customSchool" placeholder="Nhập tên trường của bạn..." value={customSchool} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border-4 border-black focus:outline-none focus:ring-4 focus:ring-[#1C92FF]/50 transition-all font-medium placeholder:text-gray-400" />
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block font-bold mb-2 text-sm" htmlFor="email">Email</label>
                <input type="email" id="email" name="email" placeholder="name@student.edu.vn" value={formData.email} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border-4 border-black focus:outline-none focus:ring-4 focus:ring-[#1C92FF]/50 transition-all font-medium placeholder:text-gray-400" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-bold text-sm" htmlFor="password">Mật khẩu</label>
                  {isLoginView && <a href="#" className="text-sm font-bold text-[#1C92FF] hover:underline">Quên mật khẩu?</a>}
                </div>
                <input type="password" id="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border-4 border-black focus:outline-none focus:ring-4 focus:ring-[#1C92FF]/50 transition-all font-medium placeholder:text-gray-400" />
              </div>

              <button type="submit" disabled={loading} className="w-full py-4 bg-[#1C92FF] text-white font-black text-lg rounded-xl border-4 border-black hover:bg-[#1571C6] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4">
                {loading ? 'Đang xử lý...' : (isLoginView ? 'Đăng nhập' : 'Đăng ký')}
              </button>
            </form>

            <div className="my-8 flex items-center gap-4">
              <div className="flex-1 h-1 bg-black"></div>
              <span className="font-bold">hoặc</span>
              <div className="flex-1 h-1 bg-black"></div>
            </div>

            {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.startsWith('dummy-') && (
              <div className="flex justify-center border-4 border-black p-2 rounded-xl hover:bg-gray-50 transition-colors">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Đăng nhập Google bị lỗi.')}
                  theme="outline"
                  size="large"
                  text="continue_with"
                  width="300"
                />
              </div>
            )}

            <p className="mt-8 text-center font-bold">
              {isLoginView ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
              <button onClick={() => { setIsLoginView(!isLoginView); setError(null); }} className="text-[#FF4A60] hover:underline ml-1">
                {isLoginView ? 'Đăng ký ngay' : 'Đăng nhập'}
              </button>
            </p>
          </div>
        </div>
      </main>
    </GoogleOAuthProvider>
  );
}
