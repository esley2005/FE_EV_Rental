"use client";
import { useEffect, useState, useMemo } from "react";
import { Card, Table, Tag, Space, DatePicker, Input, Select, Spin, Empty } from "antd";
import { CarOutlined, UserOutlined, CalendarOutlined, CheckCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { rentalOrderApi, carsApi, authApi } from "@/services/api";
import type { RentalOrderData } from "@/services/api";
import type { Car } from "@/types/car";

const { RangePicker } = DatePicker;

interface OrderWithDetails extends RentalOrderData {
	car?: Car;
	user?: { fullName?: string; email?: string; phone?: string };
}

export default function TransactionHistory() {
	const [data, setData] = useState<OrderWithDetails[]>([]);
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
			const ordersRes = await rentalOrderApi.getAll();
			if (ordersRes.success && ordersRes.data) {
				const orders = Array.isArray(ordersRes.data)
					? ordersRes.data
					: (ordersRes.data as any)?.$values || [];

				// Load thông tin xe và user cho mỗi đơn hàng
				const ordersWithDetails = await Promise.all(
					orders.map(async (order: RentalOrderData) => {
						let car: Car | undefined;
						let user: { fullName?: string; email?: string; phone?: string } | undefined;

						// Load thông tin xe
						if (order.carId) {
							try {
								const carRes = await carsApi.getById(String(order.carId));
								if (carRes.success && carRes.data) {
									car = carRes.data;
								}
							} catch (error) {
								console.error("Error loading car:", error);
							}
						}

						// Load thông tin user (nếu có API)
						if (order.userId) {
							try {
								const usersRes = await authApi.getAllUsers();
								if (usersRes.success && usersRes.data) {
									const foundUser = usersRes.data.find((u: any) => u.id === order.userId);
									if (foundUser) {
										user = {
											fullName: foundUser.fullName,
											email: foundUser.email,
											phone: foundUser.phone,
										};
									}
								}
							} catch (error) {
								console.error("Error loading user:", error);
							}
						}

						return {
							...order,
							car,
							user,
						};
					})
				);

				setData(ordersWithDetails);
			} else {
				setData([]);
			}
		} catch (error) {
			console.error("Error fetching data:", error);
			setData([]);
		} finally {
			setLoading(false);
		}
	};

	const getStatusLabel = (status: string | number | undefined): string => {
		if (typeof status === "number") {
			const statusMap: Record<number, string> = {
				0: "Chờ xác nhận",
				1: "Đã nộp giấy tờ",
				2: "Chờ tiền cọc",
				3: "Đã xác nhận",
				4: "Đang thuê",
				5: "Đã trả xe",
				6: "Chờ thanh toán",
				7: "Đã hủy",
				8: "Hoàn thành",
			};
			return statusMap[status] || "Không xác định";
		}
		const statusStr = String(status || "").toLowerCase();
		if (statusStr.includes("pending")) return "Chờ xác nhận";
		if (statusStr.includes("confirmed")) return "Đã xác nhận";
		if (statusStr.includes("renting")) return "Đang thuê";
		if (statusStr.includes("returned")) return "Đã trả xe";
		if (statusStr.includes("completed")) return "Hoàn thành";
		if (statusStr.includes("cancelled")) return "Đã hủy";
		if (statusStr.includes("documentssubmitted")) return "Đã nộp giấy tờ";
		return statusStr || "Không xác định";
	};

	const getStatusColor = (status: string | number | undefined): string => {
		if (typeof status === "number") {
			if (status === 4) return "green"; // Đang thuê
			if (status === 5) return "blue"; // Đã trả xe
			if (status === 8) return "green"; // Hoàn thành
			if (status === 7) return "red"; // Đã hủy
			return "default";
		}
		const statusStr = String(status || "").toLowerCase();
		if (statusStr.includes("renting") || statusStr.includes("completed")) return "green";
		if (statusStr.includes("returned")) return "blue";
		if (statusStr.includes("cancelled")) return "red";
		return "default";
	};

	const filtered = useMemo(() => {
		return data.filter((order) => {
			// Lọc theo status - chỉ hiển thị các đơn đã giao xe (status >= 4) hoặc đã trả xe
			const statusNum = typeof order.status === "number" ? order.status : parseInt(String(order.status || "0"), 10);
			if (statusFilter !== "all") {
				if (statusFilter === "delivered" && statusNum < 4) return false;
				if (statusFilter === "returned" && statusNum !== 5 && statusNum !== 8) return false;
			}

			if (search) {
				const searchText = search.toLowerCase();
				const matchId = String(order.id).includes(searchText);
				const matchCar = order.car?.name?.toLowerCase().includes(searchText) || 
				               String(order.carId).includes(searchText);
				const matchUser = order.user?.fullName?.toLowerCase().includes(searchText) ||
				                order.user?.email?.toLowerCase().includes(searchText) ||
				                order.user?.phone?.toLowerCase().includes(searchText) ||
				                order.phoneNumber?.toLowerCase().includes(searchText);
				if (!matchId && !matchCar && !matchUser) return false;
			}

			if (range && range[0] && range[1]) {
				const orderDate = order.orderDate || order.pickupTime || order.createdAt;
				if (orderDate) {
					const date = dayjs(orderDate);
					if (date.isBefore(range[0], "day") || date.isAfter(range[1], "day")) return false;
				}
			}
			return true;
		});
	}, [data, statusFilter, search, range]);

	const columns = [
		{
			title: "Mã đơn",
			dataIndex: "id",
			key: "id",
			width: 100,
			render: (id: number) => <strong>#{id}</strong>,
		},
		{
			title: "Khách hàng",
			key: "customer",
			render: (order: OrderWithDetails) => (
				<Space>
					<UserOutlined />
					<div>
						<div className="font-medium">{order.user?.fullName || "N/A"}</div>
						<div className="text-xs text-gray-500">{order.phoneNumber || order.user?.phone || ""}</div>
					</div>
				</Space>
			),
		},
		{
			title: "Xe",
			key: "car",
			render: (order: OrderWithDetails) => (
				<Space>
					<CarOutlined />
					<span>{order.car?.name || `ID: ${order.carId}`}</span>
				</Space>
			),
		},
		{
			title: "Ngày giao xe",
			dataIndex: "pickupTime",
			key: "pickupTime",
			render: (v: string) => v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "-",
		},
		{
			title: "Ngày trả dự kiến",
			dataIndex: "expectedReturnTime",
			key: "expectedReturnTime",
			render: (v: string) => v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "-",
		},
		{
			title: "Ngày trả thực tế",
			dataIndex: "actualReturnTime",
			key: "actualReturnTime",
			render: (v: string) => v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "-",
		},
		{
			title: "Trạng thái",
			dataIndex: "status",
			key: "status",
			render: (status: string | number) => (
				<Tag color={getStatusColor(status)} icon={<CheckCircleOutlined />}>
					{getStatusLabel(status)}
				</Tag>
			),
		},
		{
			title: "Ngày tạo đơn",
			dataIndex: "orderDate",
			key: "orderDate",
			render: (v: string) => v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "-",
		},
	];

	return (
		<Card
			title={
				<div className="flex items-center gap-2">
					<CalendarOutlined />
					<span>Lịch sử giao nhận xe</span>
				</div>
			}
			extra={<span className="text-sm text-gray-500">Tổng: {filtered.length} đơn hàng</span>}
		>
			<Space style={{ marginBottom: 16 }} wrap>
				<Select
					style={{ width: 200 }}
					value={statusFilter}
					onChange={setStatusFilter}
					options={[
						{ value: "all", label: "Tất cả" },
						{ value: "delivered", label: "Đã giao xe" },
						{ value: "returned", label: "Đã trả xe" },
					]}
				/>
				<Input.Search
					placeholder="Tìm theo mã đơn, khách hàng, xe..."
					allowClear
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					style={{ width: 300 }}
				/>
				<RangePicker
					value={range as any}
					onChange={(vals) => setRange(vals as any)}
					format="DD/MM/YYYY"
					placeholder={["Từ ngày", "Đến ngày"]}
				/>
				<a onClick={fetchData} className="text-sm text-blue-600 cursor-pointer hover:underline">
					Làm mới
				</a>
			</Space>
			{loading ? (
				<div className="py-14 flex justify-center">
					<Spin size="large" />
				</div>
			) : filtered.length === 0 ? (
				<Empty description="Không có dữ liệu lịch sử giao nhận xe" />
			) : (
				<Table
					columns={columns}
					dataSource={filtered}
					rowKey="id"
					pagination={{
						pageSize: 10,
						showTotal: (total) => `Tổng ${total} đơn hàng`,
						showSizeChanger: true,
					}}
					scroll={{ x: 1200 }}
				/>
			)}
		</Card>
	);
}
