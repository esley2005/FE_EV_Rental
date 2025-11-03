"use client";

export default function DispatchList() {
  const dispatchData = [
    // { id: 1, car: "VF 8", driver: "Lê Minh", route: "Q1 → Q5", status: "Đang di chuyển" },
    // { id: 2, car: "Gogoro Delight", driver: "Phạm Hùng", route: "Q7 → Q3", status: "Hoàn thành" },
  ];

  return (
    <div className="p-6 bg-white rounded-lg shadow text-gray-900">
      <h2 className="text-2xl font-semibold mb-4">Điều phối xe</h2>
      <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden">
        <thead className="bg-blue-100">
          <tr>
            <th className="px-4 py-2 border">ID</th>
            <th className="px-4 py-2 border">Xe</th>
            <th className="px-4 py-2 border">Tài xế</th>
            <th className="px-4 py-2 border">Tuyến đường</th>
            <th className="px-4 py-2 border">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {dispatchData.map((d) => (
            <tr key={d.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 border">{d.id}</td>
              <td className="px-4 py-2 border">{d.car}</td>
              <td className="px-4 py-2 border">{d.driver}</td>
              <td className="px-4 py-2 border">{d.route}</td>
              <td className="px-4 py-2 border text-blue-700 font-semibold">{d.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
