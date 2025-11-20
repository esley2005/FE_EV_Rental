import { useEffect, useState, useMemo } from "react";
import { Card, Table, Tag, Space, DatePicker, Input, Select, Spin, Empty } from "antd";
import dayjs from "dayjs";
import { complaintsApi, Complaint } from "@/services/complaintsApi"; // Giả sử bạn có api này

const { RangePicker } = DatePicker;

const statusColor: Record<string, string> = {
  pending: "default",
  processing: "processing",
  resolved: "green",
  rejected: "red",
};

export default function ComplaintsPage() {
  const [data, setData] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await complaintsApi.getAll(); // Giả sử API trả về { success, data }
      if (res.success && Array.isArray(res.data)) {
        setData(res.data);
      } else {
        setData([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return data.filter(c => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (search) {
        const txt = `${c.id} ${c.customerName} ${c.email || ""} ${c.phone || ""}`.toLowerCase();
        if (!txt.includes(search.toLowerCase())) return false;
      }
      if (range && range[0] && range[1]) {
        const created = dayjs(c.createdAt);
        if (created.isBefore(range[0], "day") || created.isAfter(range[1], "day")) return false;
      }
      return true;
    });
  }, [data, statusFilter, search, range]);

  const columns = [
    { title: "Mã khiếu nại", dataIndex: "id", key: "id", width: 120 },
    {
      title: "Khách hàng",
      key: "customer",
      render: (c: Complaint) => (
        <div className="flex flex-col">
          <span className="font-medium">{c.customerName}</span>
          <span className="text-xs text-gray-500">{c.phone}</span>
        </div>
      ),
    },
    { title: "Email", dataIndex: "email", key: "email" },
    { title: "Tiêu đề", dataIndex: "title", key: "title" },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      render: (s: Complaint["status"]) => <Tag color={statusColor[s] || "default"}>{labelStatus(s)}</Tag>,
    },
    {
      title: "Ngày gửi",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm"),
    },
  ];

  function labelStatus(s: Complaint["status"]) {
    switch (s) {
      case "pending": return "Chưa xử lý";
      case "processing": return "Đang xử lý";
      case "resolved": return "Đã giải quyết";
      case "rejected": return "Từ chối";
      default: return s;
    }
  }

  return (
    <Card
      title={<div className="flex items-center gap-2">Danh sách khiếu nại</div>}
      extra={<span className="text-sm text-gray-500">Tổng: {filtered.length}</span>}
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          style={{ width: 180 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "Tất cả trạng thái" },
            { value: "pending", label: "Chưa xử lý" },
            { value: "processing", label: "Đang xử lý" },
            { value: "resolved", label: "Đã giải quyết" },
            { value: "rejected", label: "Từ chối" },
          ]}
        />
        <Input.Search
          placeholder="Tìm mã, khách, email, điện thoại"
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260 }}
        />
        <RangePicker
          value={range as any}
          onChange={(vals) => setRange(vals as any)}
          format="DD/MM/YYYY"
        />
        <a onClick={fetchData} className="text-sm text-blue-600">Làm mới</a>
      </Space>
      {loading ? (
        <div className="py-14 flex justify-center"><Spin /></div>
      ) : filtered.length === 0 ? (
        <Empty description="Chưa có khiếu nại nào" className="py-14" />
      ) : (
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          pagination={{ pageSize: 10, showTotal: (t) => `Tổng ${t} lượt` }}
          scroll={{ x: 1000 }}
        />
      )}
    </Card>
  );
}
