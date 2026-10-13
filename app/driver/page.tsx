'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ExcelJS from 'exceljs';
import { supabase } from '../../utils/supabase';

export default function DriverPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'write' | 'view'>('write');
  const [logs, setLogs] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]); // DB에서 가져온 차량 목록 상태
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState('전체'); // 조회 탭 필터 상태

  const [formData, setFormData] = useState({
    vehicle: '',
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

  // 컴포넌트 로드 시 차량 목록 불러오기
  useEffect(() => {
    fetchVehicles();
  }, []);

  // 조회 탭 누르거나 필터 변경 시 데이터 다시 불러오기
  useEffect(() => {
    if (activeTab === 'view') {
      fetchLogs();
    }
  }, [activeTab, selectedVehicleFilter]);

  const fetchVehicles = async () => {
    const { data, error } = await supabase.from('vehicles').select('*').order('created_at');
    if (!error && data) {
      setVehicles(data);
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, vehicle: data[0].plate })); // 폼 기본값을 첫 번째 차량으로
      }
    }
  };

  const fetchLogs = async () => {
    let query = supabase
      .from('logs')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (selectedVehicleFilter !== '전체') {
      query = query.eq('vehicle_plate', selectedVehicleFilter);
    }
    
    const { data, error } = await query;
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
    
    // 폼 초기화 (차량은 유지)
    setFormData(prev => ({
      ...prev,
      date: '', purpose: '', startTime: '', endTime: '', driveDist: '', accDist: '', 
      gasLiter: '', gasPrice: '', repairDetail: '', repairPrice: '', signature: ''
    }));

    setActiveTab('view');
  };

  const handleDeleteLog = async (id: string, createdAt: string) => {
    // 24시간 제한 검사
    const logTime = new Date(createdAt).getTime();
    const nowTime = new Date().getTime();
    const hoursDiff = (nowTime - logTime) / (1000 * 60 * 60);

    if (hoursDiff > 24) {
      alert('작성 후 24시간이 지난 내역은 일반 권한으로 삭제할 수 없습니다. 관리자에게 문의하세요.');
      return;
    }

    if (window.confirm('이 운행기록을 정말 삭제하시겠습니까?')) {
      const { error } = await supabase.from('logs').delete().eq('id', id);
      if (error) {
        alert('삭제 실패: ' + error.message);
      } else {
        alert('삭제되었습니다.');
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
      { header: '운행거리', key: 'drive_dist', width: 10 },
      { header: '누적거리', key: 'acc_dist', width: 10 },
      { header: '운행자', key: 'signature', width: 15 },
    ];
    logs.forEach(log => {
      sheet.addRow({
        date: log.date,
        vehicle_plate: log.vehicle_plate,
        purpose: log.purpose,
        start_time: log.start_time?.slice(0, 5) || '',
        end_time: log.end_time?.slice(0, 5) || '',
        drive_dist: log.drive_dist,
        acc_dist: log.acc_dist,
        signature: log.signature
      });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `차량운행일지_${selectedVehicleFilter}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 text-black">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-md">
        
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
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">차량 선택</label>
                <select name="vehicle" value={formData.vehicle} onChange={handleChange} className="w-full mt-1 border p-2 rounded-md">
                  {vehicles.length === 0 && <option value="">차량을 등록해주세요 (관리자)</option>}
                  {vehicles.map(v => (
                    <option key={v.id} value={v.plate}>{v.plate}</option>
                  ))}
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
                <input type="number" step="0.1" name="driveDist" value={formData.driveDist} onChange={handleChange} required className="w-full mt-1 border p-2 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">누적거리(km)</label>
                <input type="number" step="0.1" name="accDist" value={formData.accDist} onChange={handleChange} required className="w-full mt-1 border p-2 rounded-md" />
              </div>
            </div>

            <div className="border border-gray-200 p-4 rounded-md space-y-4 bg-gray-50">
              <h3 className="font-semibold text-sm text-gray-700">주유 및 정비사항 (선택)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">주유량(L)</label>
                  <input type="number" step="0.1" name="gasLiter" value={formData.gasLiter} onChange={handleChange} className="w-full mt-1 border p-2 rounded-md" />
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
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center bg-gray-50 p-3 rounded-md border">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">차량 필터:</span>
                <select 
                  value={selectedVehicleFilter} 
                  onChange={(e) => setSelectedVehicleFilter(e.target.value)} 
                  className="border p-1 rounded-md text-sm"
                >
                  <option value="전체">모든 차량</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.plate}>{v.plate}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={handleExportExcel} 
                className="bg-green-600 text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-green-700 transition"
              >
                엑셀 다운로드
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-200 border-b">
                    <th className="p-3">일자</th>
                    <th className="p-3">차량</th>
                    <th className="p-3">목적</th>
                    <th className="p-3">시간</th>
                    <th className="p-3">운행거리</th>
                    <th className="p-3">누적거리</th>
                    <th className="p-3">운행자</th>
                    <th className="p-3 text-center">관리 (24시간)</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    // 삭제 가능 여부 계산 (24시간)
                    const logTime = new Date(log.created_at).getTime();
                    const nowTime = new Date().getTime();
                    const isDeletable = (nowTime - logTime) / (1000 * 60 * 60) <= 24;

                    return (
                      <tr key={log.id} className="border-b hover:bg-gray-50 text-sm">
                        <td className="p-3 whitespace-nowrap">{log.date}</td>
                        <td className="p-3 whitespace-nowrap">{log.vehicle_plate}</td>
                        <td className="p-3">{log.purpose}</td>
                        <td className="p-3 whitespace-nowrap">{log.start_time.slice(0,5)} ~ {log.end_time.slice(0,5)}</td>
                        <td className="p-3">{log.drive_dist}km</td>
                        <td className="p-3">{log.acc_dist}km</td>
                        <td className="p-3">{log.signature}</td>
                        <td className="p-3 text-center">
                          {isDeletable ? (
                            <button 
                              onClick={() => handleDeleteLog(log.id, log.created_at)}
                              className="bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 transition"
                            >
                              삭제
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400">제한됨</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center p-6 text-gray-500">아직 등록된 운행 내역이 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
