'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function ReservationBoard({ vehicles }: { vehicles: any[] }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [reservations, setReservations] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  
  const [resForm, setResForm] = useState({
    vehicle: '',
    startTime: '09:00',
    endTime: '12:00',
    reserverName: ''
  });

  useEffect(() => {
    const todayStr = new Date().toLocaleDateString('ko-KR', { 
      year: 'numeric', month: '2-digit', day: '2-digit' 
    }).replace(/\. /g, '-').replace('.', '');
    
    setSelectedDate(todayStr);
  }, []);

  // 🚨 [핵심 기능] QR코드로 접속 시 주소창에서 차량 번호를 읽어와서 자동 선택함
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qVehicle = params.get('vehicle');
    
    if (qVehicle && vehicles.some(v => v.plate === qVehicle)) {
      setResForm(prev => ({ ...prev, vehicle: qVehicle }));
    } else if (vehicles.length > 0 && !resForm.vehicle) {
      setResForm(prev => ({ ...prev, vehicle: vehicles[0].plate }));
    }
  }, [vehicles]);

  useEffect(() => {
    if (selectedDate) fetchReservations();
  }, [selectedDate]);

  const fetchReservations = async () => {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('date', selectedDate)
      .order('start_time', { ascending: true });
    if (!error && data) setReservations(data);
  };

  const handleAddReservation = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🚨 [핵심 기능] 시간 중복 검사 로직 (기존 예약과 시간이 겹치면 차단)
    const isOverlap = reservations.some(r => {
      if (r.vehicle_plate === resForm.vehicle) {
        return resForm.startTime < r.end_time && resForm.endTime > r.start_time;
      }
      return false;
    });

    if (isOverlap) {
      return alert('🚨 중복 예약 오류: 해당 차량은 이 시간에 이미 예약이 있습니다. 기존 예약을 확인 후 시간을 변경해 주세요.');
    }

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

  if (!selectedDate) return null;

  return (
    <div className="space-y-6 mt-4 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-5 rounded-2xl border shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <span className="font-extrabold text-gray-800 text-lg">📅 예약 날짜</span>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            className="border-2 p-2.5 rounded-xl font-bold text-blue-700 outline-none hover:border-blue-400 focus:border-blue-500 transition-colors"
          />
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-extrabold hover:bg-blue-700 transition hover:-translate-y-0.5 shadow-md w-full sm:w-auto"
        >
          + 새 예약하기
        </button>
      </div>

      <div className="space-y-4">
        {vehicles.map(v => {
          const vReservations = reservations.filter(r => r.vehicle_plate === v.plate);
          return (
            <div key={v.id} className="border-2 border-gray-100 rounded-2xl p-5 bg-white shadow-sm hover:border-blue-200 transition-colors">
              <div className="flex items-center gap-2 mb-4 border-b-2 border-gray-50 pb-3">
                <span className="font-extrabold text-lg text-gray-800">🚗 {v.plate}</span>
                {v.status !== '정상' && (
                  <span className="text-xs bg-red-100 text-red-600 px-2.5 py-1 rounded-full font-bold">
                    {v.status}
                  </span>
                )}
              </div>
              
              {vReservations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                  <span className="text-2xl mb-1">✨</span>
                  <p className="text-sm font-bold text-gray-400">등록된 예약 없음 (종일 사용 가능)</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {vReservations.map(r => (
                    <div key={r.id} className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-xl text-sm flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
                      <span className="font-extrabold text-base tracking-tight">{r.start_time.slice(0,5)} ~ {r.end_time.slice(0,5)}</span>
                      <span className="text-gray-800 bg-white px-3 py-1 rounded-lg border border-blue-100 font-bold shadow-sm">{r.reserver_name}</span>
                      <span className="text-[11px] text-gray-500 font-medium">
                        (등록: {new Date(r.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })})
                      </span>
                      <button onClick={() => handleDelete(r.id)} className="ml-auto bg-red-100 text-red-500 hover:bg-red-500 hover:text-white rounded-full w-7 h-7 flex items-center justify-center font-bold text-lg leading-none transition-colors" title="예약 취소">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full transform transition-all scale-100">
            <h3 className="text-xl font-extrabold mb-2 text-gray-800">새 차량 예약하기</h3>
            <p className="text-sm font-bold text-blue-600 mb-6 pb-4 border-b-2 border-gray-100">선택한 날짜: {selectedDate}</p>
            
            <form onSubmit={handleAddReservation} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">이용할 차량</label>
                <select value={resForm.vehicle} onChange={e => setResForm({...resForm, vehicle: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm font-bold bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-colors">
                  {vehicles.map(v => (
                    <option key={v.id} value={v.plate}>
                      {v.plate} {v.status !== '정상' ? `(${v.status})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">시작 시간</label>
                  <input type="time" required value={resForm.startTime} onChange={e => setResForm({...resForm, startTime: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm font-bold bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">종료 시간</label>
                  <input type="time" required value={resForm.endTime} onChange={e => setResForm({...resForm, endTime: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm font-bold bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-colors" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5">예약자 성명</label>
                <input type="text" required value={resForm.reserverName} onChange={e => setResForm({...resForm, reserverName: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm font-bold bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-colors" placeholder="예: 백인우" />
              </div>
              
              <div className="flex gap-3 mt-8 pt-6 border-t-2 border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 text-gray-700 py-3.5 rounded-xl font-bold hover:bg-gray-200 transition-colors">취소</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-extrabold shadow-lg hover:bg-blue-700 hover:-translate-y-0.5 transition-all">예약 완료</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
