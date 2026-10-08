'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'driver' | 'admin'>('driver');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');

  const handleDriverLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '1234') {
      router.push('/driver'); 
    } else {
      alert('비밀번호가 틀렸습니다.');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'admin@test.com' && password === 'admin1234') {
      router.push('/admin');
    } else {
      alert('관리자 정보가 틀렸습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md w-full max-w-md overflow-hidden text-black">
        <div className="flex border-b text-center">
          <button
            className={`flex-1 py-3 font-semibold transition-colors ${
              activeTab === 'driver' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => { setActiveTab('driver'); setPassword(''); }}
          >
            일반 운전자
          </button>
          <button
            className={`flex-1 py-3 font-semibold transition-colors ${
              activeTab === 'admin' ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => { setActiveTab('admin'); setPassword(''); setEmail(''); }}
          >
            관리자 로그인
          </button>
        </div>

        <div className="p-6">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
            차량 운행일지 시스템
          </h2>

          {activeTab === 'driver' ? (
            <form onSubmit={handleDriverLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">공용 접속 비밀번호</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="비밀번호를 입력하세요 (임시: 1234)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">
                접속하기
              </button>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">관리자 이메일</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-800"
                  placeholder="admin@test.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gray-800"
                  placeholder="임시: admin1234"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="w-full bg-gray-800 text-white py-2 rounded-md hover:bg-gray-900 transition">
                관리자 로그인
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}