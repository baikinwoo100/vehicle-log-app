'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function LogWrite({ vehicles, onSaved }: { vehicles: any[], onSaved: () => void }) {
  const [formData, setFormData] = useState({
    vehicle: vehicles.length > 0 ? vehicles[0].plate : '',
    date: '', purpose: '', startTime: '', endTime: '', driveDist: '', accDist: '', 
    gasLiter: '', gasPrice: '', repairDetail: '', repairPrice: '', signature: ''
  });

  useEffect(() => {
    if (vehicles.length > 0 && !formData.vehicle) {
      setFormData(prev => ({ ...prev, vehicle: vehicles[0].plate }));
    }
  }, [vehicles]);

  const selectedVehicleObj = vehicles.find(v => v.plate === formData.vehicle);
  const isNotNormal = selectedVehicleObj && selectedVehicleObj.status !== '정상';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCalculateDist = async () => {
    if (!formData.vehicle) return alert('차량을 먼저 선택해주세요.');
    if (!formData.accDist) return alert('현재 누적거리를 먼저 입력해주세요.');

    const { data, error } = await supabase
      .from('logs').select('acc_dist').eq('vehicle_plate', formData.vehicle)
      .order('date', { ascending: false }).order('start_time', { ascending: false }).limit(1);

    if (error) return alert('이전 기록을 불러오는 데 실패했습니다.');

    if (data && data.length > 0) {
      const prevAcc = data[0].acc_dist;
      const currentAcc = Number(formData.accDist);
      const diff = currentAcc - prevAcc;
      if (diff < 0) {
        alert(`입력하신 누적거리(${currentAcc}km)가 이전 기록(${prevAcc}km)보다 작습니다.`);
      } else {
        setFormData(prev => ({ ...prev, driveDist: parseFloat(diff.toFixed(1)).toString() }));
      }
    } else {
      alert('이전 운행 기록이 없어 자동 계산을 할 수 없습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 🚨 [핵심 기능] 기입 오류 확인 절차 (누적/이동거리 교차 검증)
    const { data: prevLog, error: prevError } = await supabase
      .from('logs')
      .select('acc_dist')
      .eq('vehicle_plate', formData.vehicle)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(1);

    if (!prevError && prevLog && prevLog.length > 0) {
      const prevAcc = prevLog[0].acc_dist;
      const currentAcc = Number(formData.accDist);
      const currentDrive = Number(formData.driveDist);

      // 1) 기입한 누적거리가 과거 기록보다 적으면 완전 차단
      if (currentAcc < prevAcc) {
        return alert(`🚨 기입 오류: 누적거리(${currentAcc}km)가 직전 누적거리(${prevAcc}km)보다 작을 수 없습니다!\n계기판을 다시 확인해 주세요.`);
      }

      // 2) 계산된 주행거리와 입력한 주행거리가 일치하지 않으면 경고 후 선택
      const expectedDrive = parseFloat((currentAcc - prevAcc).toFixed(1));
      if (currentDrive !== expectedDrive) {
         const confirmProceed = window.confirm(`⚠️ 주의: 입력한 운행거리(${currentDrive}km)가 실제 계산된 거리(${expectedDrive}km)와 다릅니다.\n이대로 저장하시겠습니까?`);
         if (!confirmProceed) return; // '취소'를 누르면 저장 중단
      }
    }

    const { error } = await supabase.from('logs').insert([{
      vehicle_plate: formData.vehicle, date: formData.date, purpose: formData.purpose,
      start_time: formData.startTime, end_time: formData.endTime,
      drive_dist: Number(formData.driveDist), acc_dist: Number(formData.accDist),
      gas_liter: formData.gasLiter ? Number(formData.gasLiter) : null,
      gas_price: formData.gasPrice ? Number(formData.gasPrice) : null,
      repair_detail: formData.repairDetail || null,
      repair_price: formData.repairPrice ? Number(formData.repairPrice) : null,
      signature: formData.signature
    }]);

    if (error) return alert('저장 오류: ' + error.message);
    
    alert('저장되었습니다.');
    setFormData(prev => ({ ...prev, date: '', purpose: '', startTime: '', endTime: '', driveDist: '', accDist: '', gasLiter: '', gasPrice: '', repairDetail: '', repairPrice: '', signature: '' }));
    onSaved();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto mt-4 animate-fadeIn">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">차량 선택</label>
          <select name="vehicle" value={formData.vehicle} onChange={handleChange} className="w-full border-2 border-gray-200 p-2.5 rounded-xl text-sm font-bold bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-colors">
            {vehicles.map(v => <option key={v.id} value={v.plate}>{v.plate}</option>)}
          </select>
          {isNotNormal && (
            <p className="text-xs text-red-600 font-extrabold mt-2 bg-red-50 p-2.5 rounded-lg border border-red-200">
              🚨 현재 차량 상태: [{selectedVehicleObj.status}]<br/><span className="font-medium text-gray-600">(일지 기록은 정상적으로 가능합니다)</span>
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">일자</label>
          <input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full border-2 border-gray-200 p-2.5 rounded-xl text-sm font-bold bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-colors" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">운행목적지 및 내용</label>
        <input type="text" name="purpose" value={formData.purpose} onChange={handleChange} required className="w-full border-2 border-gray-200 p-2.5 rounded-xl text-sm font-bold bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-colors" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">출발시간</label>
          <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required className="w-full border-2 border-gray-200 p-2.5 rounded-xl text-sm font-bold bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">도착시간</label>
          <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} required className="w-full border-2 border-gray-200 p-2.5 rounded-xl text-sm font-bold bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-colors" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">운행거리(km)</label>
          <input type="number" step="0.1" name="driveDist" value={formData.driveDist} onChange={handleChange} required placeholder="직접 입력 또는 자동계산" className="w-full border-2 border-blue-200 p-2.5 rounded-xl text-sm font-bold bg-blue-50 focus:bg-white focus:border-blue-500 outline-none transition-colors" />
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-bold text-gray-700">누적거리(km)</label>
            <button type="button" onClick={handleCalculateDist} className="text-xs bg-indigo-100 text-indigo-700 font-extrabold px-2.5 py-1 rounded-lg hover:bg-indigo-200 transition-colors shadow-sm">
              거리 자동계산
            </button>
          </div>
          <input type="number" step="0.1" name="accDist" value={formData.accDist} onChange={handleChange} required className="w-full border-2 border-gray-200 p-2.5 rounded-xl text-sm font-bold bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-colors" />
        </div>
      </div>
      <div className="border-2 border-gray-100 p-5 rounded-2xl space-y-4 bg-white shadow-sm">
        <h3 className="font-extrabold text-sm text-gray-800 border-b-2 border-gray-50 pb-2">⛽ 주유 및 🔧 정비사항 (선택)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">주유량(L)</label>
            <input type="number" step="0.1" name="gasLiter" value={formData.gasLiter} onChange={handleChange} className="w-full border-2 border-gray-100 p-2 rounded-xl text-sm font-bold bg-gray-50 focus:bg-white focus:border-blue-400 outline-none transition-colors" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">주유금액(원)</label>
            <input type="number" name="gasPrice" value={formData.gasPrice} onChange={handleChange} className="w-full border-2 border-gray-100 p-2 rounded-xl text-sm font-bold bg-gray-50 focus:bg-white focus:border-blue-400 outline-none transition-colors" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">정비내역</label>
            <input type="text" name="repairDetail" value={formData.repairDetail} onChange={handleChange} className="w-full border-2 border-gray-100 p-2 rounded-xl text-sm font-bold bg-gray-50 focus:bg-white focus:border-blue-400 outline-none transition-colors" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">정비금액(원)</label>
            <input type="number" name="repairPrice" value={formData.repairPrice} onChange={handleChange} className="w-full border-2 border-gray-100 p-2 rounded-xl text-sm font-bold bg-gray-50 focus:bg-white focus:border-blue-400 outline-none transition-colors" />
          </div>
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">운행자 성명</label>
        <input type="text" name="signature" value={formData.signature} onChange={handleChange} required placeholder="이름을 입력하세요" className="w-full border-2 border-gray-200 p-2.5 rounded-xl text-sm font-bold bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-colors" />
      </div>
      <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-extrabold text-lg hover:bg-blue-700 shadow-lg hover:-translate-y-0.5 transition-all mt-6">
        일지 DB에 저장하기
      </button>
    </form>
  );
}
