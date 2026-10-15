'use client';
import { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import { supabase } from '../utils/supabase';

export default function LogList({ vehicles }: { vehicles: any[] }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState('전체');
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [selectedVehicleFilter]);

  const fetchLogs = async () => {
    let query = supabase.from('logs').select('*').order('date', { ascending: false }).order('created_at', { ascending: false });
    if (selectedVehicleFilter !== '전체') query = query.eq('vehicle_plate', selectedVehicleFilter);
    const { data } = await query;
    if (data) setLogs(data);
  };

  const handleDeleteLog = async (id: string, createdAt: string) => {
    const logTime = new Date(createdAt).getTime();
    const nowTime = new Date().getTime();
    if ((nowTime - logTime) / (1000 * 60 * 60) > 24) return alert('24시간이 지난 내역은 일반 권한으로 삭제할 수 없습니다.');
    if (window.confirm('정말 삭제하시겠습니까?')) {
      const { error } = await supabase.from('logs').delete().eq('id', id);
      if (!error) fetchLogs();
    }
  };

  const handleExportExcel = async () => {
    if (logs.length === 0) return alert('출력할 데이터가 없습니다.');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('운행일지');
    sheet.columns = [
      { header: '일자', key: 'date', width: 12 }, { header: '차량', key: 'vehicle_plate', width: 15 },
      { header: '목적지', key: 'purpose', width: 25 }, { header: '출발', key: 'start_time', width: 10 },
      { header: '도착', key: 'end_time', width: 10 }, { header: '운행거리', key: 'drive_dist', width: 12 },
      { header: '누적거리', key: 'acc_dist', width: 12 }, { header: '주유/정비', key: 'maintenance', width: 30 },
      { header: '운행자', key: 'signature', width: 15 }, { header: '구간 실연비', key: 'efficiency', width: 20 }
    ];
    
    logs.forEach((l, idx) => {
      const maint = [];
      let efficiency = '-';
      
      if (l.gas_liter) {
        maint.push(`주유: ${l.gas_liter}L (${l.gas_price?.toLocaleString() || 0}원)`);
        const prevFuelLog = logs.slice(idx + 1).find(x => x.vehicle_plate === l.vehicle_plate && x.gas_liter > 0);
        if (prevFuelLog) {
          const distDiff = l.acc_dist - prevFuelLog.acc_dist;
          efficiency = distDiff > 0 ? `${(distDiff / l.gas_liter).toFixed(1)} km/L` : '오류(거리증가없음)';
        } else {
          efficiency = '최초 주유(비교불가)';
        }
      }
      
      if (l.repair_detail) maint.push(`정비: ${l.repair_detail} (${l.repair_price?.toLocaleString() || 0}원)`);
      
      sheet.addRow({
        date: l.date, vehicle_plate: l.vehicle_plate, purpose: l.purpose,
        start_time: l.start_time?.slice(0,5), end_time: l.end_time?.slice(0,5),
        drive_dist: l.drive_dist, acc_dist: l.acc_dist,
        maintenance: maint.join(' / ') || '-', signature: l.signature,
        efficiency: efficiency
      });
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `차량운행일지.xlsx`; a.click();
  };

  const getEfficiencyData = (detail: any) => {
    if (!detail || !detail.gas_liter) return null;
    const idx = logs.findIndex(x => x.id === detail.id);
    const prevFuelLog = logs.slice(idx + 1).find(x => x.vehicle_plate === detail.vehicle_plate && x.gas_liter > 0);
    
    if (prevFuelLog) {
      const distDiff = detail.acc_dist - prevFuelLog.acc_dist;
      if (distDiff > 0) {
        return { value: `${(distDiff / detail.gas_liter).toFixed(1)} km/L`, desc: `직전 주유 후 ${distDiff}km 주행` };
      }
      return { value: '오류', desc: '누적거리 증가 없음' };
    }
    return { value: '계산 불가', desc: '이전 주유 기록 없음 (최초 주유)' };
  };

  const effData = selectedDetail ? getEfficiencyData(selectedDetail) : null;

  return (
    <div className="space-y-4 mt-4 animate-fadeIn">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">
        <div className="flex gap-3 items-center">
          <span className="text-sm font-extrabold text-gray-800">차량 필터</span>
          <select value={selectedVehicleFilter} onChange={e => setSelectedVehicleFilter(e.target.value)} className="border-2 border-gray-200 p-2 rounded-xl text-sm font-bold bg-gray-50 focus:bg-white focus:border-blue-400 outline-none transition-colors">
            <option value="전체">모든 차량</option>
            {vehicles.map(v => <option key={v.id} value={v.plate}>{v.plate}</option>)}
          </select>
        </div>
        <button onClick={handleExportExcel} className="bg-green-600 text-white px-4 py-2.5 rounded-xl text-sm font-extrabold shadow hover:bg-green-700 hover:-translate-y-0.5 transition-all">엑셀 다운로드</button>
      </div>
      
      <div className="overflow-x-auto border-2 border-gray-100 rounded-2xl shadow-sm bg-white">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead className="bg-gray-50 border-b-2 border-gray-100">
            <tr>
              <th className="p-4 font-extrabold text-gray-800">일자</th><th className="p-4 font-extrabold text-gray-800">차량</th><th className="p-4 font-extrabold text-gray-800">목적</th>
              <th className="p-4 font-extrabold text-gray-800">시간</th><th className="p-4 font-extrabold text-gray-800">거리(운행/누적)</th><th className="p-4 font-extrabold text-gray-800 text-center">주유/정비</th>
              <th className="p-4 font-extrabold text-gray-800">운행자</th><th className="p-4 font-extrabold text-gray-800 text-center">관리</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => {
              const isDeletable = (new Date().getTime() - new Date(log.created_at).getTime()) / 3600000 <= 24;
              
              // 🚨 [핵심] 리스트 렌더링 시 계산 오류가 있는지 실시간으로 검사
              const prevLog = logs.slice(idx + 1).find(x => x.vehicle_plate === log.vehicle_plate);
              let isCalcError = false;
              let expectedDist = 0;

              if (prevLog) {
                expectedDist = parseFloat((log.acc_dist - prevLog.acc_dist).toFixed(1));
                if (log.drive_dist !== expectedDist) {
                  isCalcError = true;
                }
              }

              return (
                <tr key={log.id} className={`border-b last:border-0 transition-colors text-sm ${isCalcError ? 'bg-red-50/50 hover:bg-red-100' : 'hover:bg-blue-50/50'}`}>
                  <td className="p-4 font-bold text-gray-900">{log.date}</td>
                  <td className="p-4 font-bold text-gray-900">{log.vehicle_plate}</td>
                  <td className="p-4 text-gray-700">{log.purpose}</td>
                  <td className="p-4 text-gray-700">{log.start_time.slice(0,5)}~{log.end_time.slice(0,5)}</td>
                  
                  <td className="p-4 text-gray-700">
                    {/* 🚨 [추가] 계산이 틀린 행은 빨간색으로 하이라이트하고 마우스 올리면 원인 툴팁 표시 */}
                    {isCalcError ? (
                      <div className="inline-flex items-center gap-1 text-red-600 font-extrabold cursor-help bg-red-100 px-2 py-1 rounded-lg border border-red-200" title={`🚨 계산 오류!\n이전 누적거리(${prevLog?.acc_dist})를 기준으로 하면\n올바른 운행거리는 [ ${expectedDist}km ] 입니다.`}>
                        ⚠️ <span>{log.drive_dist}</span> / {log.acc_dist}
                      </div>
                    ) : (
                      <><span className="text-blue-600 font-bold">{log.drive_dist}</span> / {log.acc_dist}</>
                    )}
                  </td>
                  
                  <td className="p-4 text-center">
                    {(log.gas_liter || log.repair_detail) ? (
                      <button onClick={() => setSelectedDetail(log)} className="bg-white border-2 border-gray-200 px-3 py-1.5 rounded-full text-xs font-bold text-gray-700 shadow-sm hover:border-blue-400 hover:text-blue-600 transition-colors">
                        {log.gas_liter ? '⛽ ' : ''}{log.repair_detail ? '🔧 ' : ''}상세보기
                      </button>
                    ) : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="p-4 font-bold text-gray-800">{log.signature}</td>
                  <td className="p-4 text-center">
                    {isDeletable ? <button onClick={() => handleDeleteLog(log.id, log.created_at)} className="bg-red-100 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">삭제</button> : <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">불가</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      
      {selectedDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full transform transition-all scale-100">
            <h3 className="text-xl font-extrabold mb-4 pb-3 border-b-2 border-gray-100 text-gray-800">🔍 상세 내역</h3>
            
            {selectedDetail.gas_liter && (
              <div className="bg-blue-50 p-5 rounded-2xl mb-4 border border-blue-100 shadow-sm">
                <p className="font-extrabold text-blue-900 mb-3 flex items-center gap-2">⛽ 주유 내역</p>
                <div className="space-y-1.5 text-sm text-gray-700">
                  <p>주유량: <span className="font-bold">{selectedDetail.gas_liter} L</span></p>
                  <p>금액: <span className="font-bold">{selectedDetail.gas_price?.toLocaleString()} 원</span></p>
                </div>
                
                {effData && (
                  <div className="mt-4 pt-3 border-t border-blue-200">
                    <p className="text-sm font-bold text-blue-900">
                      진짜 구간 실연비: 
                      <span className="text-xl font-extrabold ml-2">{effData.value}</span>
                    </p>
                    <p className="text-[11px] text-blue-600 mt-1 font-medium">{effData.desc}</p>
                  </div>
                )}
              </div>
            )}
            
            {selectedDetail.repair_detail && (
              <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 shadow-sm">
                <p className="font-extrabold text-orange-900 mb-3 flex items-center gap-2">🔧 정비 내역</p>
                <div className="space-y-1.5 text-sm text-gray-700">
                  <p>내역: <span className="font-bold">{selectedDetail.repair_detail}</span></p>
                  <p>금액: <span className="font-bold">{selectedDetail.repair_price?.toLocaleString()} 원</span></p>
                </div>
              </div>
            )}
            
            <button onClick={() => setSelectedDetail(null)} className="mt-6 w-full bg-gray-800 text-white py-3.5 rounded-xl font-extrabold shadow-md hover:bg-gray-900 transition-colors">닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}
