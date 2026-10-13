'use client';

import { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import { supabase } from '../../utils/supabase';

export default function AdminPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [newPlate, setNewPlate] = useState('');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('전체');
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchVehicles();
    fetchLogs(); 
  }, []);

  const fetchVehicles = async () => {
    const { data } = await supabase.from('vehicles').select('*').order('created_at');
    if (data) setVehicles(data);
  };

  const handleAddVehicle = async () => {
    if (!newPlate.trim()) return;
    const { error } = await supabase.from('vehicles').insert([{ plate: newPlate, status: '정상' }]);
    if (error) {
      alert('차량 추가 실패: ' + error.message);
    } else {
      setNewPlate('');
      fetchVehicles();
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('vehicles').update({ status: newStatus }).eq('id', id);
    if (error) {
      alert('상태 변경 실패: ' + error.message);
    } else {
      fetchVehicles(); 
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    if (window.confirm('정말 이 차량을 삭제하시겠습니까? 관련 운행일지는 삭제되지 않습니다.')) {
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) {
        alert('차량 삭제 실패: ' + error.message);
      } else {
        fetchVehicles();
      }
    }
  };

  const fetchLogs = async () => {
    let query = supabase.from('logs').select('*').order('date', { ascending: false }).order('start_time', { ascending: false });
    
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    if (selectedVehicle !== '전체') query = query.eq('vehicle_plate', selectedVehicle);

    const { data, error } = await query;
    if (error) {
      alert('운행기록 조회 실패: ' + error.message);
    } else if (data) {
      setLogs(data);
    }
  };

  const handleSearch = () => {
    fetchLogs();
  };

  const handleDeleteLog = async (id: string) => {
    if (window.confirm('이 운행기록을 정말 삭제하시겠습니까? (관리자 권한)')) {
      const { error } = await supabase.from('logs').delete().eq('id', id);
      if (error) {
        alert('운행기록 삭제 실패: ' + error.message);
      } else {
        fetchLogs();
      }
    }
  };

  const handleExportExcel = async () => {
    if (logs.length === 0) {
      alert('출력할 데이터가 없습니다.');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('차량운행일지');

    sheet.columns = [
      { header: '일자', key: 'date', width: 12 },
      { header: '차량번호', key: 'vehicle_plate', width: 15 },
      { header: '운행목적지 및 내용', key: 'purpose', width: 25 },
      { header: '출발시간', key: 'start_time', width: 10 },
      { header: '도착시간', key: 'end_time', width: 10 },
      { header: '운행거리(km)', key: 'drive_dist', width: 12 },
      { header: '누적거리(km)', key: 'acc_dist', width: 12 },
      { header: '주유/정비내역', key: 'maintenance', width: 30 },
      { header: '운행자(서명)', key: 'signature', width: 15 },
    ];

    logs.forEach(log => {
      const maintenance = [];
      if (log.gas_liter || log.gas_price) maintenance.push(`주유: ${log.gas_liter || 0}L (${log.gas_price || 0}원)`);
      if (log.repair_detail || log.repair_price) maintenance.push(`정비: ${log.repair_detail || '-'} (${log.repair_price || 0}원)`);

      sheet.addRow({
        date: log.date,
        vehicle_plate: log.vehicle_plate,
        purpose: log.purpose,
        start_time: log.start_time ? log.start_time.slice(0, 5) : '',
        end_time: log.end_time ? log.end_time.slice(0, 5) : '',
        drive_dist: log.drive_dist,
        acc_dist: log.acc_dist,
        maintenance: maintenance.join(' / ') || '-',
        signature: log.signature
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `차량운행일지_${startDate || '전체'}_to_${endDate || '전체'}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen text-black">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">관리자 대시보드</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">새 차량 추가</h2>
            <div className="flex gap-4">
              <input
                type="text"
                className="flex-1 border px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-800"
                placeholder="차량 번호 (예: 스타리아-123가 4567)"
                value={newPlate}
                onChange={(e) => setNewPlate(e.target.value)}
              />
              <button 
                onClick={handleAddVehicle}
                className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-900 transition"
              >
                추가
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">등록된 차량 관리 (수정/삭제)</h2>
            <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
              {vehicles.map(vehicle => (
                <div key={vehicle.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <span className="font-medium">{vehicle.plate}</span>
                  <div className="flex items-center gap-2">
                    <select 
                      className="border border-gray-300 px-3 py-1 rounded-md bg-white text-sm focus:outline-none"
                      value={vehicle.status}
                      onChange={(e) => handleStatusChange(vehicle.id, e.target.value)}
                    >
                      <option value="정상">✅ 정상 운행</option>
                      <option value="외부 대절">🚌 외부 대절</option>
                      <option value="수리 중">🔧 수리 중</option>
                      <option value="사용 금지">🚫 사용 금지</option>
                    </select>
                    <button 
                      onClick={() => handleDeleteVehicle(vehicle.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600 transition"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
              {vehicles.length === 0 && <p className="text-gray-500 text-sm">등록된 차량이 없습니다.</p>}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-xl font-semibold">운행 일지 조회 및 관리</h2>
            <div className="flex flex-wrap gap-2 items-center">
              <select 
                value={selectedVehicle} 
                onChange={(e) => setSelectedVehicle(e.target.value)} 
                className="border p-2 rounded-md text-sm"
              >
                <option value="전체">모든 차량</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.plate}>{v.plate}</option>
                ))}
              </select>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border p-2 rounded-md text-sm" />
              <span>~</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border p-2 rounded-md text-sm" />
              <button onClick={handleSearch} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition">
                조회
              </button>
              <button onClick={handleExportExcel} className="bg-green-600 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 transition">
                엑셀 다운로드
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="p-3">일자</th>
                  <th className="p-3">차량</th>
                  <th className="p-3">목적지 및 내용</th>
                  <th className="p-3">시간</th>
                  <th className="p-3">운행/누적거리</th>
                  <th className="p-3">주유 및 정비</th>
                  <th className="p-3">운행자</th>
                  <th className="p-3 text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50 text-sm">
                    <td className="p-3 whitespace-nowrap">{log.date}</td>
                    <td className="p-3 whitespace-nowrap">{log.vehicle_plate}</td>
                    <td className="p-3">{log.purpose}</td>
                    <td className="p-3 whitespace-nowrap">{log.start_time?.slice(0,5)} ~ {log.end_time?.slice(0,5)}</td>
                    <td className="p-3 whitespace-nowrap">{log.drive_dist}km / {log.acc_dist}km</td>
                    <td className="p-3 text-xs text-gray-600">
                      {log.gas_liter ? `주유: ${log.gas_liter}L (${log.gas_price}원)` : ''} 
                      {log.gas_liter && log.repair_detail ? ' | ' : ''}
                      {log.repair_detail ? `정비: ${log.repair_detail} (${log.repair_price}원)` : ''}
                      {!log.gas_liter && !log.repair_detail ? '-' : ''}
                    </td>
                    <td className="p-3">{log.signature}</td>
                    <td className="p-3 text-center">
                      <button 
                        onClick={() => handleDeleteLog(log.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 transition"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center p-6 text-gray-500">조회된 기록이 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
