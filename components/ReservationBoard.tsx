'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function ReservationBoard({ vehicles }: { vehicles: any[] }) {
  // 초기값을 빈 문자열로 설정하여 서버 렌더링 에러 방지
  const [selectedDate, setSelectedDate] = useState('');
  const [reservations, setReservations] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  const [resForm, setResForm] = useState({
    vehicle: '',
    startTime: '09:00',
    endTime: '12:00',
    reserverName: ''
  });

  // 컴포넌트가 브라우저에 마운트된 후(클라이언트 측) 오늘 날짜 계산
  useEffect(() => {
    const todayStr = new Date().toLocaleDateString('ko-KR', { 
      year: 'numeric', month: '2-digit', day: '2-digit' 
    }).replace(/\. /g, '-').replace('.', '');
    
    setSelectedDate(todayStr);
  }, []);

  useEffect(() => {
    if (vehicles.length > 0 && !resForm.vehicle) {
      setResForm(prev => ({ ...prev, vehicle: vehicles[0].plate }));
    }
  }, [vehicles]);

  useEffect(() => {
    if (selectedDate) {
      fetchReservations();
    }
  }, [selectedDate]);

  const fetchReservations = async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('date', selectedDate)
      .order('start_time', { ascending: true });
    if (!error && data) {
      setReservations(data);
    }
  };

  const handleAddReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('reservations').insert([
      {
        vehicle_plate: resForm.vehicle,
        date: selectedDate,
        start_time: resForm.startTime,
        end_time: resForm.endTime,
        reserver_name: resForm.reserverName
      }
    ]);
    if (error) {
      alert('예약 실패: ' + error.message);
    } else {
      alert('예약이 성공적으로 등록되었습니다.');
      setShowModal(false);
      setResForm(prev => ({ ...prev, reserverName: '' }));
      fetchReservations();
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('이 예약을 정말 취소하시겠습니까?')) {
      const { error } = await supabase.from('reservations').delete().eq('id', id);
      if (!error) fetchReservations();
    }
  };

  // 날짜가 계산되기 전에는 빈 화면 렌더링 (깜빡임 방지)
  if (!selectedDate) return null;

  return (
    <div className="space-y-6 mt-4">
      {/* 날짜 선택 및 예약 버튼 */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-gray-50 p-4 rounded-md border gap-4">
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-700">📅 예약 날짜:</span>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            className="border p-2 rounded-md font-semibold text-blue-700 outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-5 py-2 rounded-md font-bold hover:bg-blue-700 transition shadow-sm w-full sm:w-auto"
        >
          + 새 예약하기
        </button>
      </div>

      {/* 차량별 예약 리스트 (일간 현황판) */}
      <div className="space-y-4">
        {vehicles.map(v => {
          const vReservations = reservations.filter(r => r.vehicle_plate === v.plate);
          return (
            <div key={v.id} className="border rounded-lg p-4 bg-white shadow-sm hover:border-blue-300 transition">
              <div className="flex items-center gap-2 mb-3 border-b pb-2">
                <span className="font-bold text-lg text-gray-800">{v.plate}</span>
                {v.status !== '정상' && (
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold">
                    {v.status}
                  </span>
                )}
              </div>
              
              {vReservations.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">✨ 등록된 예약 없음 (종일 사용 가능)</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {vReservations.map(r => (
                    <div key={r.id} className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded-md text-sm flex items-center gap-2 shadow-sm">
                      <span className="font-bold">{r.start_time.slice(0,5)} ~ {r.end_time.slice(0,5)}</span>
                      <span className="text-gray-700 bg-white px-2 rounded-full border border-blue-100">{r.reserver_name}</span>
                      <button onClick={() => handleDelete(r.id)} className="ml-1 text-red-400 hover:text-red-600 font-bold text-lg leading-none" title="예약 취소">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 새 예약 모달창 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4 border-b pb-2 text-blue-800">새 차량 예약하기</h3>
            <p className="text-sm text-gray-500 mb-4 font-medium">선택한 날짜: {selectedDate}</p>
            
            <form onSubmit={handleAddReservation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">이용할 차량</label>
                <select value={resForm.vehicle} onChange={e => setResForm({...resForm, vehicle: e.target.value})} className="w-full border p-2 rounded-md mt-1 font-medium">
                  {vehicles.map(v => (
                    <option key={v.id} value={v.plate}>
                      {v.plate} {v.status !== '정상' ? `(${v.status})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">시작 시간</label>
                  <input type="time" required value={resForm.startTime} onChange={e => setResForm({...resForm, startTime: e.target.value})} className="w-full border p-2 rounded-md mt-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">종료 시간</label>
                  <input type="time" required value={resForm.endTime} onChange={e => setResForm({...resForm, endTime: e.target.value})} className="w-full border p-2 rounded-md mt-1" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">예약자 성명</label>
                <input type="text" required value={resForm.reserverName} onChange={e => setResForm({...resForm, reserverName: e.target.value})} className="w-full border p-2 rounded-md mt-1" placeholder="예: 백인우" />
              </div>
              
              <div className="flex gap-2 mt-6 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 text-gray-800 py-2.5 rounded-md font-bold hover:bg-gray-300">취소</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2.5 rounded-md font-bold hover:bg-blue-700 shadow-sm">예약 완료</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
