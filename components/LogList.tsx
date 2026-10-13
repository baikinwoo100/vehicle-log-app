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
      { header: '운행자', key: 'signature', width: 15 }
    ];
    logs.forEach(l => {
      const maint = [];
      if (l.gas_liter) maint.push(`주유: ${l.gas_liter}L (${l.gas_price?.toLocaleString() || 0}원)`);
      if (l.repair_detail) maint.push(`정비: ${l.repair_detail} (${l.repair_price?.toLocaleString() || 0}원)`);
      sheet.addRow({
        date: l.date, vehicle_plate: l.vehicle_plate, purpose: l.purpose,
        start_time: l.start_time?.slice(0,5), end_time: l.end_time?.slice(0,5),
        drive_dist: l.drive_dist, acc_dist: l.acc_dist,
        maintenance: maint.join(' / ') || '-', signature: l.signature
      });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `차량운행일지.xlsx`; a.click();
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center bg-gray-50 p-3 rounded-md border">
        <div className="flex gap-2 items-center">
          <span className="text-sm font-semibold">차량 필터:</span>
          <select value={selectedVehicleFilter} onChange={e => setSelectedVehicleFilter(e.target.value)} className="border p-1 rounded-md text-sm">
            <option value="전체">모든 차량</option>
            {vehicles.map(v => <option key={v.id} value={v.plate}>{v.plate}</option>)}
          </select>
        </div>
        <button onClick={handleExportExcel} className="bg-green-600 text-white px-3 py-1.5 rounded-md text-sm font-bold">엑셀 다운로드</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-gray-200 border-b">
              <th className="p-3">일자</th><th className="p-3">차량</th><th className="p-3">목적</th>
              <th className="p-3">시간</th><th className="p-3">거리(운행/누적)</th><th className="p-3 text-center">주유/정비</th>
              <th className="p-3">운행자</th><th className="p-3 text-center">관리</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => {
              const isDeletable = (new Date().getTime() - new Date(log.created_at).getTime()) / 3600000 <= 24;
              return (
                <tr key={log.id} className="border-b hover:bg-gray-50 text-sm">
                  <td className="p-3">{log.date}</td><td className="p-3">{log.vehicle_plate}</td><td className="p-3">{log.purpose}</td>
                  <td className="p-3">{log.start_time.slice(0,5)}~{log.end_time.slice(0,5)}</td>
                  <td className="p-3">{log.drive_dist} / {log.acc_dist}</td>
                  <td className="p-3 text-center">
                    {(log.gas_liter || log.repair_detail) ? (
                      <button onClick={() => setSelectedDetail(log)} className="bg-gray-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm hover:bg-gray-300">
                        {log.gas_liter ? '⛽ ' : ''}{log.repair_detail ? '🔧 ' : ''}상세
                      </button>
                    ) : '-'}
                  </td>
                  <td className="p-3">{log.signature}</td>
                  <td className="p-3 text-center">
                    {isDeletable ? <button onClick={() => handleDeleteLog(log.id, log.created_at)} className="bg-red-500 text-white px-2 py-1 rounded text-xs">삭제</button> : <span className="text-xs text-gray-400">제한됨</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {selectedDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-bold mb-4 border-b pb-2">상세 내역</h3>
            {selectedDetail.gas_liter && (
              <div className="bg-blue-50 p-4 rounded mb-2"><p className="font-bold text-blue-800">⛽ 주유: {selectedDetail.gas_liter}L</p><p>금액: {selectedDetail.gas_price?.toLocaleString()}원</p></div>
            )}
            {selectedDetail.repair_detail && (
              <div className="bg-orange-50 p-4 rounded"><p className="font-bold text-orange-800">🔧 정비: {selectedDetail.repair_detail}</p><p>금액: {selectedDetail.repair_price?.toLocaleString()}원</p></div>
            )}
            <button onClick={() => setSelectedDetail(null)} className="mt-4 w-full bg-gray-800 text-white py-2 rounded font-bold">닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}
