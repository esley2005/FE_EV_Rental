"use client";
import { useEffect, useState, useMemo } from "react";
import { Card, Table, Tag, Space, DatePicker, Input, Select, Spin } from "antd";
import dayjs from "dayjs";
import { bookingsApi, Booking } from "@/services/bookingsApi";

const { RangePicker } = DatePicker;

const statusColor: Record<string, string> = {
	pending: "default",
	confirmed: "processing",
	cancelled: "red",
	completed: "green",
};

export default function TransactionHistory() {
	const [data, setData] = useState<Booking[]>([]);
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
			const res = await bookingsApi.getAll();
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
		return data.filter(b => {
			if (statusFilter !== "all" && b.status !== statusFilter) return false;
			if (search) {
				const txt = `${b.id} ${b.carId} ${b.fullName} ${b.phone} ${b.email || ""}`.toLowerCase();
				if (!txt.includes(search.toLowerCase())) return false;
			}
			if (range && range[0] && range[1]) {
				const start = dayjs(b.startDate);
				if (start.isBefore(range[0], "day") || start.isAfter(range[1], "day")) return false;
			}
			return true;
		});
	}, [data, statusFilter, search, range]);

	const columns = [
		{ title: "Mã", dataIndex: "id", key: "id", width: 90 },
		{
			title: "Khách hàng",
			key: "customer",
			render: (b: Booking) => (
				<div className="flex flex-col">
					<span className="font-medium">{b.fullName}</span>
					<span className="text-xs text-gray-500">{b.phone}</span>
				</div>
			),
		},
		{ title: "Xe", dataIndex: "carId", key: "carId", width: 100 },
		{ title: "Điểm nhận", dataIndex: "pickupLocation", key: "pickupLocation" },
		{
			title: "Nhận xe",
			dataIndex: "startDate",
			key: "startDate",
			render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm"),
		},
		{
			title: "Trả dự kiến",
			dataIndex: "endDate",
			key: "endDate",
			render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm"),
		},
		{
			title: "Số ngày",
			dataIndex: "totalDays",
			key: "totalDays",
			width: 100,
		},
		{
			title: "Trạng thái",
			dataIndex: "status",
			key: "status",
			render: (s: Booking["status"]) => <Tag color={statusColor[s] || "default"}>{labelStatus(s)}</Tag>,
		},
		{
			title: "Ngày tạo",
			dataIndex: "createdAt",
			key: "createdAt",
			render: (v: string) => dayjs(v).format("DD/MM/YYYY HH:mm"),
		},
	];

	function labelStatus(s: Booking["status"]) {
		switch (s) {
			case "pending": return "Chờ xác nhận";
			case "confirmed": return "Đã xác nhận";
			case "cancelled": return "Đã hủy";
			case "completed": return "Hoàn tất";
			default: return s;
		}
	}

	return (
		<Card
			title={<div className="flex items-center gap-2">Lịch sử giao nhận & trả xe</div>}
			extra={<span className="text-sm text-gray-500">Tổng: {filtered.length}</span>}
		>
			<Space style={{ marginBottom: 16 }} wrap>
				<Select
					style={{ width: 180 }}
					value={statusFilter}
					onChange={setStatusFilter}
					options={[
						{ value: "all", label: "Tất cả trạng thái" },
						{ value: "pending", label: "Chờ xác nhận" },
						{ value: "confirmed", label: "Đã xác nhận" },
						{ value: "completed", label: "Hoàn tất" },
						{ value: "cancelled", label: "Đã hủy" },
					]}
				/>
				<Input.Search
					placeholder="Tìm mã, khách, xe, điện thoại"
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
