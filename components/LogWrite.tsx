'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

export default function LogWrite({ vehicles, onSaved }: { vehicles: any[], onSaved: () => void }) {
  const [formData, setFormData] = useState({
    vehicle: vehicles.length > 0 ? vehicles[0].plate : '',
    date: '', purpose: '', startTime: '', endTime: '', driveDist: '', accDist: '', 
    gasLiter: '', gasPrice: '', repairDetail: '', repairPrice: '', signature: ''
  });

  // 🚨 [핵심] 차량별 직전 누적거리 상태 저장
  const [prevRecord, setPrevRecord] = useState<{ acc_dist: number } | null>(null);

  useEffect(() => {
    if (vehicles.length > 0 && !formData.vehicle) {
      setFormData(prev => ({ ...prev, vehicle: vehicles[0].plate }));
    }
  }, [vehicles]);

  // 🚨 [추가] 차량을 선택할 때마다 DB에서 직전 누적거리 미리 불러오기 (실시간 검증용)
  useEffect(() => {
    const fetchPrevRecord = async () => {
      if (!formData.vehicle) return;
      const { data, error } = await supabase
        .from('logs').select('acc_dist').eq('vehicle_plate', formData.vehicle)
        .order('date', { ascending: false }).order('start_time', { ascending: false }).limit(1);
      
      if (!error && data && data.length > 0) {
        setPrevRecord(data[0]);
      } else {
        setPrevRecord(null);
      }
    };
    fetchPrevRecord();
  }, [formData.vehicle]);

  const selectedVehicleObj = vehicles.find(v => v.plate === formData.vehicle);
  const isNotNormal = selectedVehicleObj && selectedVehicleObj.status !== '정상';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCalculateDist = () => {
    if (!formData.vehicle) return alert('차량을 먼저 선택해주세요.');
    if (!formData.accDist) return alert('현재 누적거리를 먼저 입력해주세요.');

    if (prevRecord) {
      const prevAcc = prevRecord.acc_dist;
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

    if (prevRecord && formData.accDist) {
      const prevAcc = prevRecord.acc_dist;
      const currentAcc = Number(formData.accDist);
      const currentDrive = Number(formData.driveDist);

      // 1) 누적거리가 과거 기록보다 적으면 완전 차단
      if (currentAcc < prevAcc) {
        return alert(`🚨 기입 오류: 누적거리(${currentAcc}km)가 직전 누적거리(${prevAcc}km)보다 작을 수 없습니다!\n계기판을 다시 확인해 주세요.`);
      }

      // 2) 계산된 주행거리와 입력 주행거리가 다르면 경고창 띄우고 선택권 줌
      if (formData.driveDist) {
        const expectedDrive = parseFloat((currentAcc - prevAcc).toFixed(1));
        if (currentDrive !== expectedDrive) {
           const confirmProceed = window.confirm(`⚠️ 주의: 입력한 운행거리(${currentDrive}km)가 실제 계산된 거리(${expectedDrive}km)와 다릅니다.\n이대로 저장하시겠습니까?`);
           if (!confirmProceed) return; 
        }
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

  // 🚨 [추가] 실시간 계산 및 에러 검출 로직
  let distanceErrorMsg = '';
  let isDistanceError = false;

  if (prevRecord && formData.accDist) {
    const prevAcc = prevRecord.acc_dist;
    const currentAcc = Number(formData.accDist);
    
    if (currentAcc < prevAcc) {
      isDistanceError = true;
      distanceErrorMsg = `기입 오류: 직전 누적거리(${prevAcc}km)보다 작을 수 없습니다.`;
    } else if (formData.driveDist) {
      const currentDrive = Number(formData.driveDist);
      const expectedDrive = parseFloat((currentAcc - prevAcc).toFixed(1));
      if (currentDrive !== expectedDrive) {
        isDistanceError = true;
        distanceErrorMsg = `계산 오류: 올바른 운행거리는 ${expectedDrive}km 입니다.`;
      }
    }
  }

  // 공통 및 에러 시 인풋 스타일 지정
  const defaultInputStyle = "w-full border-2 border-gray-200 p-2.5 rounded-xl text-sm font-bold bg-gray-50 focus:bg-white focus:border-blue-500 outline-none transition-colors";
  const errorInputStyle = "w-full border-2 border-red-500 p-2.5 rounded-xl text-sm font-bold bg-red-50 text-red-700 focus:bg-white focus:border-red-600 outline-none transition-colors cursor-help";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto mt-4 animate-fadeIn">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">차량 선택</label>
          <select name="vehicle" value={formData.vehicle} onChange={handleChange} className={defaultInputStyle}>
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
          <input type="date" name="date" value={formData.date} onChange={handleChange} required className={defaultInputStyle} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">운행목적지 및 내용</label>
        <input type="text" name="purpose" value={formData.purpose} onChange={handleChange} required className={defaultInputStyle} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">출발시간</label>
          <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required className={defaultInputStyle} />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">도착시간</label>
          <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} required className={defaultInputStyle} />
        </div>
      </div>
      
      {/* 🚨 [핵심] 이동거리 & 누적거리 입력부 (에러 하이라이트 적용) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="relative group">
          <label className="block text-sm font-bold text-gray-700 mb-1">운행거리(km)</label>
          <input 
            type="number" step="0.1" name="driveDist" value={formData.driveDist} onChange={handleChange} required placeholder="직접 입력 또는 자동계산" 
            className={isDistanceError ? errorInputStyle : "w-full border-2 border-blue-200 p-2.5 rounded-xl text-sm font-bold bg-blue-50 focus:bg-white focus:border-blue-500 outline-none transition-colors"} 
            title={isDistanceError ? distanceErrorMsg : ''}
          />
        </div>
        <div className="relative group">
          <div className="flex justify-between items-center mb-1">
            <label className="block text-sm font-bold text-gray-700">누적거리(km)</label>
            <button type="button" onClick={handleCalculateDist} className="text-xs bg-indigo-100 text-indigo-700 font-extrabold px-2.5 py-1 rounded-lg hover:bg-indigo-200 transition-colors shadow-sm">
              거리 자동계산
            </button>
          </div>
          <input 
            type="number" step="0.1" name="accDist" value={formData.accDist} onChange={handleChange} required 
            className={isDistanceError ? errorInputStyle : defaultInputStyle} 
            title={isDistanceError ? distanceErrorMsg : ''}
          />
        </div>
      </div>
      
      {/* 🚨 [추가] 모바일에서도 잘 보이게 인풋 바로 아래에 붉은색 경고 문구 표시 */}
      {isDistanceError && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-3 py-2 rounded-lg text-xs font-bold animate-pulse">
          ⚠️ {distanceErrorMsg}
        </div>
      )}

      <div className="border-2 border-gray-100 p-5 rounded-2xl space-y-4 bg-white shadow-sm">
        <h3 className="font-extrabold text-sm text-gray-800 border-b-2 border-gray-50 pb-2">⛽ 주유 및 🔧 정비사항 (선택)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">주유량(L)</label>
            <input type="number" step="0.1" name="gasLiter" value={formData.gasLiter} onChange={handleChange} className={defaultInputStyle} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">주유금액(원)</label>
            <input type="number" name="gasPrice" value={formData.gasPrice} onChange={handleChange} className={defaultInputStyle} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">정비내역</label>
            <input type="text" name="repairDetail" value={formData.repairDetail} onChange={handleChange} className={defaultInputStyle} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">정비금액(원)</label>
            <input type="number" name="repairPrice" value={formData.repairPrice} onChange={handleChange} className={defaultInputStyle} />
          </div>
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1">운행자 성명</label>
        <input type="text" name="signature" value={formData.signature} onChange={handleChange} required placeholder="이름을 입력하세요" className={defaultInputStyle} />
      </div>
      <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-extrabold text-lg hover:bg-blue-700 shadow-lg hover:-translate-y-0.5 transition-all mt-6">
        일지 DB에 저장하기
      </button>
    </form>
  );
}
