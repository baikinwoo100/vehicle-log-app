'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabase';

export default function DriverPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'write' | 'view'>('write');
  const [logs, setLogs] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    vehicle: '레이-164노 7792',
    date: '',
    purpose: '',
    startTime: '',
    endTime: '',
    driveDist: '',
    accDist: '',
    gasLiter: '',
    gasPrice: '',
    repairDetail: '',
    repairPrice: '',
    signature: ''
  });

  // 조회 탭을 누를 때마다 DB에서 실제 데이터를 불러온다
  useEffect(() => {
    if (activeTab === 'view') {
      fetchLogs();
    }
  }, [activeTab]);

  const fetchLogs = async () => {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('데이터 불러오기 실패:', error);
      return;
    }
    if (data) {
      setLogs(data);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // DB에 데이터 저장
    const { error } = await supabase.from('logs').insert([
      {
        vehicle_plate: formData.vehicle,
        date: formData.date,
        purpose: formData.purpose,
        start_time: formData.startTime,
        end_time: formData.endTime,
        drive_dist: Number(formData.driveDist),
        acc_dist: Number(formData.accDist),
        gas_liter: formData.gasLiter ? Number(formData.gasLiter) : null,
        gas_price: formData.gasPrice ? Number(formData.gasPrice) : null,
        repair_detail: formData.repairDetail || null,
        repair_price: formData.repairPrice ? Number(formData.repairPrice) : null,
        signature: formData.signature
      }
    ]);

    if (error) {
      alert('저장 중 오류가 발생했습니다: ' + error.message);
      return;
    }

    alert('운행일지가 DB에 성공적으로 저장되었습니다.');
    
    // 폼 초기화
    setFormData({
      vehicle: '레이-164노 7792',
      date: '',
      purpose: '',
      startTime: '',
      endTime: '',
      driveDist: '',
      accDist: '',
      gasLiter: '',
      gasPrice: '',
      repairDetail: '',
      repairPrice: '',
      signature: ''
    });

    setActiveTab('view'); // 저장 완료 후 조회 화면으로 이동
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 text-black">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
        
        {/* 상단 탭 메뉴 */}
        <div className="flex border-b mb-6 text-center">
          <button
            className={`flex-1 py-3 font-bold transition-colors ${
              activeTab === 'write' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('write')}
          >
            일지 작성
          </button>
          <button
            className={`flex-1 py-3 font-bold transition-colors ${
              activeTab === 'view' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('view')}
          >
            운행내역 전체 조회
          </button>
        </div>

        {activeTab === 'write' ? (
          /* --- 작성 폼 --- */
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">차량 선택</label>
                <select name="vehicle" value={formData.vehicle} onChange={handleChange} className="w-full mt-1 border p-2 rounded-md">
                  <option value="레이-164노 7792">레이-164노 7792</option>
                  <option value="스타리아-123가 4567">스타리아-123가 4567</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">일자</label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full mt-1 border p-2 rounded-md" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">운행목적지 및 내용</label>
              <input type="text" name="purpose" value={formData.purpose} onChange={handleChange} required className="w-full mt-1 border p-2 rounded-md" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">출발시간</label>
                <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required className="w-full mt-1 border p-2 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">도착시간</label>
                <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} required className="w-full mt-1 border p-2 rounded-md" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">운행거리(km)</label>
                <input type="number" name="driveDist" value={formData.driveDist} onChange={handleChange} required className="w-full mt-1 border p-2 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">누적거리(km)</label>
                <input type="number" name="accDist" value={formData.accDist} onChange={handleChange} required className="w-full mt-1 border p-2 rounded-md" />
              </div>
            </div>

            <div className="border border-gray-200 p-4 rounded-md space-y-4 bg-gray-50">
              <h3 className="font-semibold text-sm text-gray-700">주유 및 정비사항 (선택)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">주유량(L)</label>
                  <input type="number" name="gasLiter" value={formData.gasLiter} onChange={handleChange} className="w-full mt-1 border p-2 rounded-md" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">주유금액(원)</label>
                  <input type="number" name="gasPrice" value={formData.gasPrice} onChange={handleChange} className="w-full mt-1 border p-2 rounded-md" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">정비내역</label>
                  <input type="text" name="repairDetail" value={formData.repairDetail} onChange={handleChange} className="w-full mt-1 border p-2 rounded-md" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">정비금액(원)</label>
                  <input type="number" name="repairPrice" value={formData.repairPrice} onChange={handleChange} className="w-full mt-1 border p-2 rounded-md" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">운행자 성명 (서명 대체)</label>
              <input type="text" name="signature" value={formData.signature} onChange={handleChange} required placeholder="이름을 입력하세요" className="w-full mt-1 border p-2 rounded-md" />
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-md font-bold hover:bg-blue-700 transition mt-4">
              일지 DB에 저장하기
            </button>
          </form>
        ) : (
          /* --- 조회 화면 --- */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="p-3">일자</th>
                  <th className="p-3">차량</th>
                  <th className="p-3">목적</th>
                  <th className="p-3">시간</th>
                  <th className="p-3">운행거리</th>
                  <th className="p-3">누적거리</th>
                  <th className="p-3">운행자</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50 text-sm">
                    <td className="p-3 whitespace-nowrap">{log.date}</td>
                    <td className="p-3 whitespace-nowrap">{log.vehicle_plate}</td>
                    <td className="p-3">{log.purpose}</td>
                    <td className="p-3 whitespace-nowrap">{log.start_time.slice(0,5)} ~ {log.end_time.slice(0,5)}</td>
                    <td className="p-3">{log.drive_dist}km</td>
                    <td className="p-3">{log.acc_dist}km</td>
                    <td className="p-3">{log.signature}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center p-6 text-gray-500">아직 등록된 운행 내역이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <button 
          onClick={() => router.push('/')} 
          className="mt-8 w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300 font-semibold"
        >
          로그아웃 (메인 화면으로)
        </button>
      </div>
    </div>
  );
}