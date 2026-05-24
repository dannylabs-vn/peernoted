import { useState } from 'react';
import { login, register, loginWithGoogle } from '../utils/api';
import { GoogleLogin } from '@react-oauth/google';
import './Login.css';

export default function Login({ onLoginSuccess, onBack }) {
  const [isLoginView, setIsLoginView] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    school: ''
  });
  const [isOtherSchool, setIsOtherSchool] = useState(false);
  const [customSchool, setCustomSchool] = useState('');

  const handleChange = (e) => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLoginView) {
        // Login
        const res = await login({ email: formData.email, password: formData.password });
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data));
        onLoginSuccess(res.data);
      } else {
        // Register
        const res = await register(formData);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data));
        onLoginSuccess(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <button className="btn-back-floating" onClick={onBack}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Quay lại
      </button>

      <div className="login-container glass">
        {/* Left Side: Branding / Illustration */}
        <div className="login-brand">
          <div className="brand-content">
            <div className="brand-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src="/logo.png" alt="PeerNoted Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', background: '#fff', padding: '4px', borderRadius: '8px' }} />
              PeerNoted
            </div>
            <h1>Học tập thông minh hơn với AI</h1>
            <p>Khám phá cách mạng hóa việc tự học và quản lý tài liệu. Biến ghi chú thành podcast, flashcards, và bài kiểm tra chỉ với một click.</p>
          </div>
          
          <div className="brand-decorative">
            <div className="deco-circle circle-1"></div>
            <div className="deco-circle circle-2"></div>
            <div className="deco-circle circle-3"></div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="login-form-wrapper">
          <div className="login-form-header">
            <h2>{isLoginView ? 'Đăng nhập' : 'Tạo tài khoản mới'}</h2>
            <p>{isLoginView ? 'Chào mừng bạn quay trở lại với PeerNoted' : 'Bắt đầu hành trình học tập cùng AI'}</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            {!isLoginView && (
              <>
                <div className="form-group">
                  <label htmlFor="name">Họ và Tên</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Nguyễn Văn A"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="schoolSelect">Đại học / Trường</label>
                  <select
                    id="schoolSelect"
                    name="schoolSelect"
                    className="school-select"
                    value={isOtherSchool ? 'other' : formData.school}
                    onChange={handleChange}
                  >
                    <option value="" disabled>Chọn trường của bạn...</option>
                    <option value="ĐH Bách Khoa TP.HCM">ĐH Bách Khoa TP.HCM</option>
                    <option value="ĐH Khoa học Tự nhiên TP.HCM">ĐH Khoa học Tự nhiên TP.HCM</option>
                    <option value="ĐH Công nghệ Thông tin TP.HCM">ĐH Công nghệ Thông tin TP.HCM</option>
                    <option value="ĐH Khoa học Xã hội và Nhân văn TP.HCM">ĐH Khoa học Xã hội và Nhân văn TP.HCM</option>
                    <option value="ĐH Kinh tế TP.HCM (UEH)">ĐH Kinh tế TP.HCM (UEH)</option>
                    <option value="ĐH RMIT">ĐH RMIT</option>
                    <option value="ĐH UTS">ĐH UTS</option>
                    <option value="ĐH Quốc tế TP.HCM">ĐH Quốc tế TP.HCM</option>
                    <option value="ĐH Ngoại thương">ĐH Ngoại thương</option>
                    <option value="ĐH FPT">ĐH FPT</option>
                    <option value="other">Khác...</option>
                  </select>
                </div>

                {isOtherSchool && (
                  <div className="form-group" style={{ marginTop: '-8px' }}>
                    <input
                      type="text"
                      name="customSchool"
                      placeholder="Nhập tên trường của bạn..."
                      value={customSchool}
                      onChange={handleChange}
                      required
                    />
                  </div>
                )}
              </>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="name@student.edu.vn"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <div className="label-row">
                <label htmlFor="password">Mật khẩu</label>
                {isLoginView && <a href="#" className="forgot-password">Quên mật khẩu?</a>}
              </div>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? (
                <span className="spinner"></span>
              ) : (
                isLoginView ? 'Đăng nhập' : 'Đăng ký'
              )}
            </button>
          </form>

          {/* Only render Google login when a real client ID is configured */}
          {import.meta.env.VITE_GOOGLE_CLIENT_ID &&
           !import.meta.env.VITE_GOOGLE_CLIENT_ID.startsWith('dummy-') && (
            <>
              <div className="auth-divider">
                <span>hoặc</span>
              </div>
              <div className="google-login-wrapper" style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                <GoogleLogin
                  onSuccess={async (credentialResponse) => {
                    try {
                      setLoading(true);
                      const res = await loginWithGoogle({ credential: credentialResponse.credential });
                      localStorage.setItem('token', res.data.token);
                      localStorage.setItem('user', JSON.stringify(res.data));
                      onLoginSuccess(res.data);
                    } catch (err) {
                      setError(err.response?.data?.error || 'Đăng nhập Google thất bại.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  onError={() => {
                    setError('Đăng nhập Google bị lỗi.');
                  }}
                  theme="outline"
                  size="large"
                  width="380"
                  text="continue_with"
                />
              </div>
            </>
          )}

          <p className="auth-toggle-text">
            {isLoginView ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
            <span className="auth-toggle-link" onClick={() => { setIsLoginView(!isLoginView); setError(null); }}>
              {isLoginView ? 'Đăng ký ngay' : 'Đăng nhập'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
