'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ExcelJS from 'exceljs';
import { supabase } from '../../utils/supabase';

export default function DriverPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'write' | 'view'>('write');
  const [logs, setLogs] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState('전체');
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);

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

  useEffect(() => {
    fetchVehicles();
  }, []);

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
        setFormData(prev => ({ ...prev, vehicle: data[0].plate }));
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

  // 운행거리 자동 계산 함수
  const handleCalculateDist = async () => {
    if (!formData.vehicle) {
      alert('차량을 먼저 선택해주세요.');
      return;
    }
    if (!formData.accDist) {
      alert('현재 누적거리를 먼저 입력해주세요.');
      return;
    }

    // DB에서 해당 차량의 가장 최근 기록 조회
    const { data, error } = await supabase
      .from('logs')
      .select('acc_dist')
      .eq('vehicle_plate', formData.vehicle)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(1);

    if (error) {
      alert('이전 기록을 불러오는 데 실패했습니다.');
      return;
    }

    if (data && data.length > 0) {
      const prevAcc = data[0].acc_dist;
      const currentAcc = Number(formData.accDist);
      const diff = currentAcc - prevAcc;

      if (diff < 0) {
        alert(`입력하신 누적거리(${currentAcc}km)가 이전 기록(${prevAcc}km)보다 작습니다. 확인해주세요.`);
      } else {
        // 소수점 1자리까지 표시 후 문자열로 변환 (필요없는 0 제거를 위해 parseFloat 사용)
        const calculatedDist = parseFloat(diff.toFixed(1)).toString();
        setFormData(prev => ({ ...prev, driveDist: calculatedDist }));
      }
    } else {
      alert('해당 차량의 이전 운행 기록이 없어 자동 계산을 할 수 없습니다. 최초 1회는 직접 입력해주세요.');
    }
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
    
    setFormData(prev => ({
      ...prev,
      date: '', purpose: '', startTime: '', endTime: '', driveDist: '', accDist: '', 
      gasLiter: '', gasPrice: '', repairDetail: '', repairPrice: '', signature: ''
    }));

    setActiveTab('view');
  };

  const handleDeleteLog = async (id: string, createdAt: string) => {
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
      { header: '운행거리(km)', key: 'drive_dist', width: 12 },
      { header: '누적거리(km)', key: 'acc_dist', width: 12 },
      { header: '주유/정비내역', key: 'maintenance', width: 30 },
      { header: '운행자(서명)', key: 'signature', width: 15 },
    ];
    logs.forEach(log => {
      const maintenance = [];
      if (log.gas_liter || log.gas_price) maintenance.push(`주유: ${log.gas_liter || 0}L (${log.gas_price?.toLocaleString() || 0}원)`);
      if (log.repair_detail || log.repair_price) maintenance.push(`정비: ${log.repair_detail || '-'} (${log.repair_price?.toLocaleString() || 0}원)`);

      sheet.addRow({
        date: log.date,
        vehicle_plate: log.vehicle_plate,
        purpose: log.purpose,
        start_time: log.start_time?.slice(0, 5) || '',
        end_time: log.end_time?.slice(0, 5) || '',
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
    a.download = `차량운행일지_${selectedVehicleFilter}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 text-black">
      <div className="max-w-5xl mx-auto bg-white p-6 rounded-lg shadow-md">
        
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
                <input type="number" step="0.1" name="driveDist" value={formData.driveDist} onChange={handleChange} required placeholder="직접 입력 또는 자동 계산" className="w-full mt-1 border p-2 rounded-md bg-blue-50" />
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-gray-700">누적거리(km)</label>
                  <button 
                    type="button" 
                    onClick={handleCalculateDist}
                    className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-1 rounded hover:bg-indigo-200 transition"
                  >
                    운행거리 자동계산
                  </button>
                </div>
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
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-gray-200 border-b">
                    <th className="p-3">일자</th>
                    <th className="p-3">차량</th>
                    <th className="p-3">목적</th>
                    <th className="p-3">시간</th>
                    <th className="p-3">운행/누적거리</th>
                    <th className="p-3 text-center">주유/정비</th>
                    <th className="p-3">운행자</th>
                    <th className="p-3 text-center">관리 (24시간)</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const logTime = new Date(log.created_at).getTime();
                    const nowTime = new Date().getTime();
                    const isDeletable = (nowTime - logTime) / (1000 * 60 * 60) <= 24;

                    return (
                      <tr key={log.id} className="border-b hover:bg-gray-50 text-sm">
                        <td className="p-3 whitespace-nowrap">{log.date}</td>
                        <td className="p-3 whitespace-nowrap">{log.vehicle_plate}</td>
                        <td className="p-3">{log.purpose}</td>
                        <td className="p-3 whitespace-nowrap">{log.start_time.slice(0,5)} ~ {log.end_time.slice(0,5)}</td>
                        <td className="p-3 whitespace-nowrap">{log.drive_dist}km / {log.acc_dist}km</td>
                        <td className="p-3 text-center">
                          {(log.gas_liter || log.repair_detail) ? (
                            <button 
                              onClick={() => setSelectedDetail(log)}
                              className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs hover:bg-gray-300 transition font-medium"
                            >
                              {log.gas_liter ? '⛽ ' : ''}{log.repair_detail ? '🔧 ' : ''} 상세
                            </button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
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

      {/* 팝업 모달창 */}
      {selectedDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4 border-b pb-2">주유 및 정비 상세내역</h3>
            <div className="space-y-4 text-sm">
              {selectedDetail.gas_liter && (
                <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                  <p className="font-semibold text-blue-800 flex items-center gap-2 mb-2">⛽ 주유 내역</p>
                  <p className="text-gray-700">주유량: <span className="font-medium">{selectedDetail.gas_liter} L</span></p>
                  <p className="text-gray-700">금액: <span className="font-medium">{selectedDetail.gas_price ? selectedDetail.gas_price.toLocaleString() + ' 원' : '-'}</span></p>
                </div>
              )}
              {selectedDetail.repair_detail && (
                <div className="bg-orange-50 p-4 rounded-md border border-orange-100">
                  <p className="font-semibold text-orange-800 flex items-center gap-2 mb-2">🔧 정비 내역</p>
                  <p className="text-gray-700">내역: <span className="font-medium">{selectedDetail.repair_detail}</span></p>
                  <p className="text-gray-700">금액: <span className="font-medium">{selectedDetail.repair_price ? selectedDetail.repair_price.toLocaleString() + ' 원' : '-'}</span></p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedDetail(null)}
              className="mt-6 w-full bg-gray-800 text-white py-2 rounded-md hover:bg-gray-900 transition font-semibold"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
