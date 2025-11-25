'use client';
// @ts-expect-error - React types are defined in global.d.ts
import React, { useEffect, useState, useMemo } from "react";
import { Card, Spin, message } from "antd";
import dynamic from "next/dynamic";
import { paymentApi } from "@/services/api";
import type { RevenueByLocationWithOrdersData, OrderTimeData } from "@/services/api";

// Dynamic import Chart.js components to avoid SSR issues
const Line = dynamic(
  () => import('react-chartjs-2').then((mod: any) => mod.Line),
  { ssr: false }
) as any;

interface ChartDataPoint {
  date: string;
  revenue: number;
}

interface LocationRevenueData {
  locationName: string;
  totalRevenue: number;
  orderCount: number;
  dataPoints: ChartDataPoint[];
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
  const [revenueData, setRevenueData] = useState<LocationRevenueData[]>([]);
  const [chartReady, setChartReady] = useState<boolean>(false);

  // Register Chart.js components on client side
  useEffect(() => {
    const registerChart = async () => {
      try {
        // @ts-expect-error - chart.js types may not be available
        const chartJs = await import('chart.js');
        const ChartJS = (chartJs as any).Chart;

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
        } = chartJs as any;

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

        setChartReady(true);
      } catch (error) {
        console.error('Failed to load Chart.js:', error);
        message.error('Không thể tải thư viện biểu đồ');
      }
    };

    registerChart();
  }, []);

  const fetchRevenue = async () => {
    setLoading(true);
    try {
      // Gọi API mới để lấy doanh thu theo location kèm chi tiết đơn hàng
      const response = await paymentApi.getRevenueByLocationWithOrders();
      
      if (!response.success || !response.data) {
        message.warning("Không thể lấy dữ liệu doanh thu");
        setLoading(false);
        return;
      }

      // Normalize data từ response
      const rawData = response.data;
      const locationsData: RevenueByLocationWithOrdersData[] = Array.isArray(rawData) 
        ? rawData 
        : (rawData as { $values?: RevenueByLocationWithOrdersData[] })?.$values ?? [];

      if (locationsData.length === 0) {
        message.info("Chưa có dữ liệu doanh thu");
        setRevenueData([]);
        setLoading(false);
        return;
      }

      // Xử lý dữ liệu cho mỗi location
      const processedData: LocationRevenueData[] = locationsData.map((location: RevenueByLocationWithOrdersData) => {
        // Lấy danh sách đơn hàng
        const orderTimes = location.orderTimes?.$values || 
                          (Array.isArray(location.orderTimes) ? location.orderTimes : []) || 
                          [];

        // Sắp xếp đơn hàng theo orderDate
        const sortedOrders = [...orderTimes].sort((a: OrderTimeData, b: OrderTimeData) => {
          const dateA = new Date(a.orderDate).getTime();
          const dateB = new Date(b.orderDate).getTime();
          return dateA - dateB;
        });

        // Tạo data points cho biểu đồ (doanh thu tích lũy theo thời gian)
        const dataPoints: ChartDataPoint[] = [];
        let cumulativeRevenue = 0;

        sortedOrders.forEach((order: OrderTimeData) => {
          cumulativeRevenue += order.total || 0;
          dataPoints.push({
            date: new Date(order.orderDate).toLocaleDateString('vi-VN'),
            revenue: cumulativeRevenue,
          });
        });

        return {
          locationName: location.rentalLocationName || 'Chưa có tên',
          totalRevenue: location.totalRevenue || 0,
          orderCount: location.orderCount || 0,
          dataPoints: dataPoints.length > 0 ? dataPoints : [],
        };
      });

      setRevenueData(processedData);
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
    if (revenueData.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    // Lấy tất cả các ngày từ tất cả locations để tạo labels
    const allDates = new Set<string>();
    revenueData.forEach((location) => {
      location.dataPoints.forEach((point) => {
        allDates.add(point.date);
      });
    });

    // Sắp xếp dates theo thứ tự thời gian
    const sortedDates = Array.from(allDates).sort((a, b) => {
      // Parse date từ format "dd/mm/yyyy" sang Date object
      const parseDate = (dateStr: string): Date => {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          // Format: dd/mm/yyyy
          return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
        // Fallback: thử parse trực tiếp
        return new Date(dateStr);
      };
      const dateA = parseDate(a);
      const dateB = parseDate(b);
      return dateA.getTime() - dateB.getTime();
    });

    const colors = [
      { border: 'rgb(75, 192, 192)', background: 'rgba(75, 192, 192, 0.2)' }, // Teal
      { border: 'rgb(255, 99, 132)', background: 'rgba(255, 99, 132, 0.2)' }, // Red
      { border: 'rgb(54, 162, 235)', background: 'rgba(54, 162, 235, 0.2)' }, // Blue
      { border: 'rgb(255, 206, 86)', background: 'rgba(255, 206, 86, 0.2)' }, // Yellow
      { border: 'rgb(153, 102, 255)', background: 'rgba(153, 102, 255, 0.2)' }, // Purple
      { border: 'rgb(255, 159, 64)', background: 'rgba(255, 159, 64, 0.2)' }, // Orange
    ];

    // Tạo datasets cho mỗi location
    const datasets = revenueData.map((location, index) => {
      // Tạo map date -> revenue cho location này
      const revenueMap = new Map<string, number>();
      location.dataPoints.forEach((point) => {
        revenueMap.set(point.date, point.revenue);
      });

      // Tạo data array theo thứ tự dates, nếu không có data tại date đó thì dùng giá trị trước đó
      let lastRevenue = 0;
      const data = sortedDates.map((date) => {
        const revenue = revenueMap.get(date);
        if (revenue !== undefined) {
          lastRevenue = revenue;
        }
        return lastRevenue;
      });

      return {
        label: `${location.locationName} (${location.orderCount} đơn)`,
        data: data,
        borderColor: colors[index % colors.length]?.border || `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`,
        backgroundColor: colors[index % colors.length]?.background || `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.2)`,
        fill: false,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBorderWidth: 2,
        pointBackgroundColor: colors[index % colors.length]?.border || '#fff',
        pointBorderColor: colors[index % colors.length]?.border || '#fff',
      };
    });

    return {
      labels: sortedDates,
      datasets,
    };
  }, [revenueData]);

  // Custom plugin để hiển thị labels trên các điểm
  const dataLabelsPlugin = {
    id: 'dataLabels',
    afterDatasetsDraw: (chart: any) => {
      const ctx = chart.ctx;
      chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        meta.data.forEach((point: any, index: number) => {
          const value = dataset.data[index];
          if (value === 0 || value === null || value === undefined) return;

          const x = point.x;
          const y = point.y - 15; // Offset lên trên điểm

          // Format số tiền
          const formattedValue = new Intl.NumberFormat("vi-VN", { 
            style: "currency", 
            currency: "VND",
            notation: "compact",
            maximumFractionDigits: 1,
          }).format(value);

          // Vẽ background cho label
          ctx.save();
          ctx.fillStyle = dataset.borderColor || '#333';
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          
          // Tính width của text
          ctx.font = 'bold 10px Arial';
          const textWidth = ctx.measureText(formattedValue).width;
          const padding = 6;
          const rectWidth = textWidth + padding * 2;
          const rectHeight = 18;
          const rectX = x - rectWidth / 2;
          const rectY = y - rectHeight / 2;

          // Vẽ rounded rectangle
          const radius = 4;
          ctx.beginPath();
          ctx.moveTo(rectX + radius, rectY);
          ctx.lineTo(rectX + rectWidth - radius, rectY);
          ctx.quadraticCurveTo(rectX + rectWidth, rectY, rectX + rectWidth, rectY + radius);
          ctx.lineTo(rectX + rectWidth, rectY + rectHeight - radius);
          ctx.quadraticCurveTo(rectX + rectWidth, rectY + rectHeight, rectX + rectWidth - radius, rectY + rectHeight);
          ctx.lineTo(rectX + radius, rectY + rectHeight);
          ctx.quadraticCurveTo(rectX, rectY + rectHeight, rectX, rectY + rectHeight - radius);
          ctx.lineTo(rectX, rectY + radius);
          ctx.quadraticCurveTo(rectX, rectY, rectX + radius, rectY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Vẽ text
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(formattedValue, x, y);
          ctx.restore();
        });
      });
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart' as const,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: '500' as const,
          },
        },
      },
      title: {
        display: true,
        text: 'Doanh thu tích lũy theo địa điểm theo thời gian',
        font: {
          size: 18,
          weight: 'bold' as const,
        },
        padding: {
          top: 10,
          bottom: 20,
        },
        color: '#333',
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        bodyFont: {
          size: 13,
        },
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: { parsed: { y?: number }; dataset: { label?: string } }) {
            const value = context.parsed.y || 0;
            return `${context.dataset.label}: ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#666',
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#666',
          padding: 10,
          callback: function(value: string | number) {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            return new Intl.NumberFormat("vi-VN", { 
              style: "currency", 
              currency: "VND",
              notation: "compact",
              maximumFractionDigits: 0,
            }).format(numValue);
          },
        },
      },
    },
  };

  return (
    <Spin spinning={loading}>
      {/* @ts-expect-error - Card component from antd is valid JSX */}
      <Card>
        <div style={{ height: '500px', position: 'relative' }}>
          {chartReady && revenueData.length > 0 && chartData.datasets.length > 0 ? (
            <Line 
              data={chartData} 
              options={chartOptions} 
              plugins={[dataLabelsPlugin]}
              {...({} as any)} 
            />
          ) : !chartReady ? (
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
