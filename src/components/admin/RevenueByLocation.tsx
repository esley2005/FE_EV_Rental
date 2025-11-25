'use client';
// @ts-ignore - React types are defined in global.d.ts
import React, { useEffect, useState, useMemo } from "react";
import { Card, Spin, message } from "antd";
import { paymentApi, rentalOrderApi, rentalLocationApi } from "@/services/api";
import type { PaymentData, RentalOrderData, RentalLocationData } from "@/services/api";

interface MonthlyRevenueData {
  locationId: number;
  locationName: string;
  monthlyRevenue: number[]; // 12 tháng
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill: boolean;
    tension: number;
  }>;
}

const RevenueByLocationComponent: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [monthlyData, setMonthlyData] = useState<MonthlyRevenueData[]>([]);
  const [locations, setLocations] = useState<RentalLocationData[]>([]);
  const [ChartComponent, setChartComponent] = useState<React.ComponentType<any> | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);

  // Ensure component only runs on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load Chart.js dynamically
  useEffect(() => {
    const loadChart = async () => {
      try {
        // @ts-ignore - chart.js types may not be available immediately after install
        const chartJs = await import('chart.js');
        const ChartJS = chartJs.Chart || (chartJs as any).default?.Chart;

        if (!ChartJS) {
          console.error('Chart.js not found');
          return;
        }

        const {
          CategoryScale,
          LinearScale,
          PointElement,
          LineElement,
          Title,
          Tooltip,
          Legend,
          Filler
        } = chartJs;

        ChartJS.register(
          CategoryScale,
          LinearScale,
          PointElement,
          LineElement,
          Title,
          Tooltip,
          Legend,
          Filler
        );

        // @ts-ignore - react-chartjs-2 types may not be available immediately after install
        const reactChartJs2 = await import('react-chartjs-2');
        const LineComponent = reactChartJs2.Line || (reactChartJs2 as any).default?.Line;

        if (!LineComponent) {
          console.error('Line component not found');
          return;
        }

        setChartComponent(() => LineComponent);
      } catch (error) {
        console.error('Failed to load Chart.js:', error);
      }
    };

    loadChart();
  }, []);

  const fetchRevenue = async () => {
    setLoading(true);
    try {
      // Lấy tất cả payments
      const paymentsResponse = await paymentApi.getAll();
      if (!paymentsResponse.success || !paymentsResponse.data) {
        message.warning("Không thể lấy dữ liệu payments");
        setLoading(false);
        return;
      }

      // Lấy tất cả orders
      const ordersResponse = await rentalOrderApi.getAll();
      if (!ordersResponse.success || !ordersResponse.data) {
        message.warning("Không thể lấy dữ liệu orders");
        setLoading(false);
        return;
      }

      // Lấy tất cả locations
      const locationsResponse = await rentalLocationApi.getAll();
      if (!locationsResponse.success || !locationsResponse.data) {
        message.warning("Không thể lấy dữ liệu locations");
        setLoading(false);
        return;
      }

      // Normalize data
      const payments = Array.isArray(paymentsResponse.data)
        ? paymentsResponse.data
        : (paymentsResponse.data as any)?.$values ?? [];
      
      const orders = Array.isArray(ordersResponse.data)
        ? ordersResponse.data
        : (ordersResponse.data as any)?.$values ?? [];

      const locationsList = Array.isArray(locationsResponse.data)
        ? locationsResponse.data
        : (locationsResponse.data as any)?.$values ?? [];

      setLocations(locationsList);

      // Lấy 4 locations đầu tiên (hoặc tất cả nếu ít hơn 4)
      const topLocations = (locationsList || []).slice(0, 4).filter((loc: RentalLocationData) => loc && loc.id);

      if (topLocations.length === 0) {
        // Nếu không có location, tạo 4 location mặc định với doanh thu = 0
        const defaultLocations: MonthlyRevenueData[] = Array.from({ length: 4 }, (_, index) => ({
          locationId: index + 1,
          locationName: `Địa điểm ${index + 1}`,
          monthlyRevenue: new Array(12).fill(0),
        }));
        setMonthlyData(defaultLocations);
        setLoading(false);
        return;
      }

      // Tạo map orderId -> order để tìm locationId
      const orderMap = new Map<number, RentalOrderData>();
      (orders || []).forEach((order: RentalOrderData) => {
        if (!order) return;
        const orderId = order.id || order.orderId;
        if (orderId) {
          orderMap.set(orderId, order);
        }
      });

      // Tính doanh thu theo tháng cho mỗi location
      const currentYear = new Date().getFullYear();
      const monthlyRevenueMap = new Map<number, number[]>();

      // Khởi tạo mảng 12 tháng = 0 cho mỗi location
      topLocations.forEach((location: RentalLocationData) => {
        if (location && location.id) {
          monthlyRevenueMap.set(location.id, new Array(12).fill(0));
        }
      });

      // Tính doanh thu từ payments
      (payments || []).forEach((payment: PaymentData) => {
        if (!payment) return;

        // Kiểm tra payment status (có thể là number hoặc string)
        // PaymentStatus enum: Pending=0, Completed=1, Cancelled=2 (hoặc có thể là string)
        const status = payment.status;
        const statusStr = typeof status === 'string' ? status.toLowerCase() : '';
        const statusNum = typeof status === 'number' ? status : (statusStr.includes('completed') ? 1 : 0);
        
        // Chỉ tính các payment đã hoàn thành
        // Completed = 1 (enum) hoặc string "Completed"/"completed"
        // Hoặc có paymentDate không null (đã thanh toán)
        const isCompleted = statusNum === 1 || 
                           statusStr.includes('completed') ||
                           (payment.paymentDate !== null && payment.paymentDate !== undefined && payment.paymentDate !== '');

        if (!isCompleted) return;

        const orderId = payment.rentalOrderId;
        if (!orderId) return;

        const order = orderMap.get(orderId);
        if (!order) return;

        const locationId = order.rentalLocationId;
        if (!locationId) return;

        // Lấy tháng từ paymentDate hoặc orderDate
        let paymentDate: Date | null = null;
        try {
          if (payment.paymentDate) {
            paymentDate = new Date(payment.paymentDate);
          } else if (order.orderDate) {
            paymentDate = new Date(order.orderDate);
          }
        } catch (e) {
          console.warn('[RevenueByLocation] Invalid date:', payment.paymentDate || order.orderDate);
          return;
        }

        if (!paymentDate || isNaN(paymentDate.getTime())) return;

        // Chỉ tính payment trong năm hiện tại
        if (paymentDate.getFullYear() !== currentYear) return;

        const month = paymentDate.getMonth(); // 0-11
        if (month < 0 || month > 11) return; // Validate month

        const revenueArray = monthlyRevenueMap.get(locationId);
        
        if (revenueArray && Array.isArray(revenueArray)) {
          revenueArray[month] = (revenueArray[month] || 0) + (payment.amount || 0);
        }
      });

      // Chuyển đổi map thành array
      const monthlyRevenueData: MonthlyRevenueData[] = topLocations
        .filter((location: RentalLocationData) => location && location.id)
        .map((location: RentalLocationData) => ({
          locationId: location.id,
          locationName: location.name || `Địa điểm #${location.id}`,
          monthlyRevenue: monthlyRevenueMap.get(location.id) || new Array(12).fill(0),
        }));

      // Đảm bảo có ít nhất 4 locations (fill với 0 nếu thiếu)
      while (monthlyRevenueData.length < 4) {
        monthlyRevenueData.push({
          locationId: monthlyRevenueData.length + 1,
          locationName: `Địa điểm ${monthlyRevenueData.length + 1}`,
          monthlyRevenue: new Array(12).fill(0),
        });
      }

      setMonthlyData(monthlyRevenueData);
    } catch (error) {
      console.error('[RevenueByLocation] Error:', error);
      message.error("Có lỗi xảy ra khi lấy dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, []);

  // Chuẩn bị data cho chart
  const chartData: ChartData = useMemo(() => {
    const labels = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
                    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
    
    const colors = [
      { border: 'rgb(75, 192, 192)', background: 'rgba(75, 192, 192, 0.2)' }, // Teal
      { border: 'rgb(255, 99, 132)', background: 'rgba(255, 99, 132, 0.2)' }, // Red
      { border: 'rgb(54, 162, 235)', background: 'rgba(54, 162, 235, 0.2)' }, // Blue
      { border: 'rgb(255, 206, 86)', background: 'rgba(255, 206, 86, 0.2)' }, // Yellow
    ];

    const datasets = monthlyData.slice(0, 4).map((location: MonthlyRevenueData, index: number) => ({
      label: location.locationName,
      data: location.monthlyRevenue,
      borderColor: colors[index]?.border || `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`,
      backgroundColor: colors[index]?.background || `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.2)`,
      fill: false,
      tension: 0.4,
    }));

    return {
      labels,
      datasets,
    };
  }, [monthlyData]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Doanh thu theo địa điểm (12 tháng)',
        font: {
          size: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y || 0;
            return `${context.dataset.label}: ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return new Intl.NumberFormat("vi-VN", { 
              style: "currency", 
              currency: "VND",
              notation: "compact",
              maximumFractionDigits: 0,
            }).format(value);
          },
        },
      },
    },
  };

  if (!mounted) {
    return (
      <Spin spinning={true}>
        {/* @ts-ignore - Card component from antd is valid JSX */}
        <Card>
          <div style={{ height: '500px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            Đang tải...
          </div>
        </Card>
      </Spin>
    );
  }

  return (
    <Spin spinning={loading}>
      {/* @ts-ignore - Card component from antd is valid JSX */}
      <Card>
        <div style={{ height: '500px', position: 'relative' }}>
          {ChartComponent && monthlyData.length > 0 && chartData.datasets.length > 0 ? (
            <ChartComponent data={chartData} options={chartOptions} />
          ) : !ChartComponent ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: '#999'
            }}>
              Đang tải biểu đồ...
            </div>
          ) : (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: '#999'
            }}>
              {loading ? 'Đang tải dữ liệu...' : 'Chưa có dữ liệu để hiển thị'}
            </div>
          )}
        </div>
      </Card>
    </Spin>
  );
};

export default RevenueByLocationComponent;
