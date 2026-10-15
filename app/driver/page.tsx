'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabase';
import ReservationBoard from '../../components/ReservationBoard';
import LogWrite from '../../components/LogWrite';
import LogList from '../../components/LogList';

export default function DriverPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'reserve' | 'write' | 'view'>('reserve');
  const [vehicles, setVehicles] = useState<any[]>([]);

  useEffect(() => {
    fetchVehicles();
    
    // 🚨 [추가] 주소창에 차량 번호가 있으면 자동으로 '일지 작성' 탭을 먼저 띄워줌
    const params = new URLSearchParams(window.location.search);
    if (params.get('vehicle')) {
      setActiveTab('write');
    }
  }, []);

  const fetchVehicles = async () => {
    const { data, error } = await supabase.from('vehicles').select('*').order('created_at');
    if (!error && data) {
      setVehicles(data);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 text-black">
      <div className="max-w-5xl mx-auto bg-white p-6 rounded-lg shadow-md">
        
        {/* 3단 탭 메뉴 */}
        <div className="flex border-b mb-6 text-center text-sm sm:text-base">
          <button
            className={`flex-1 py-3 font-bold transition-colors ${
              activeTab === 'reserve' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('reserve')}
          >
            📅 차량 예약
          </button>
          <button
            className={`flex-1 py-3 font-bold transition-colors ${
              activeTab === 'write' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('write')}
          >
            📝 일지 작성
          </button>
          <button
            className={`flex-1 py-3 font-bold transition-colors ${
              activeTab === 'view' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('view')}
          >
            🔍 내역 조회
          </button>
        </div>

        {/* 선택된 탭에 따라 컴포넌트 렌더링 */}
        {activeTab === 'reserve' && <ReservationBoard vehicles={vehicles} />}
        {activeTab === 'write' && <LogWrite vehicles={vehicles} onSaved={() => setActiveTab('view')} />}
        {activeTab === 'view' && <LogList vehicles={vehicles} />}

        <button 
          onClick={() => router.push('/')} 
          className="mt-10 w-full bg-gray-200 text-gray-700 py-3 rounded-md hover:bg-gray-300 font-bold"
        >
          로그아웃 (메인 화면으로)
        </button>
      </div>
    </div>
  );
}
