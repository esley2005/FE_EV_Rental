"use client";

// @ts-ignore
import React, { useEffect, useState } from "react";
// @ts-ignore
import { Card, Spin, message, Row, Col, Typography, Tag, Progress } from "antd";
// @ts-ignore
import { TrendingUp, TrendingDown, Car as CarIcon, Clock } from "lucide-react";
import { rentalOrderApi, carsApi } from "@/services/api";
import type { RentalOrderData } from "@/services/api";
import type { Car } from "@/types/car";

const { Title, Text } = Typography;

interface CarWithRentalCount {
  car: Car;
  rentalCount: number;
}

interface TimeSlotData {
  label: string;
  count: number;
  percentage: number;
  startHour: number;
  endHour: number;
}

export default function CarUtilizationRate() {
  const [loading, setLoading] = useState(false);
  const [mostRentedCars, setMostRentedCars] = useState<CarWithRentalCount[]>([]);
  const [leastRentedCars, setLeastRentedCars] = useState<CarWithRentalCount[]>([]);
  const [timeSlotData, setTimeSlotData] = useState<TimeSlotData[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch orders and cars
      const [ordersResponse, carsResponse] = await Promise.all([
        rentalOrderApi.getAll(),
        carsApi.getAll(),
      ]);

      if (!ordersResponse.success || !ordersResponse.data) {
        message.warning("Không thể tải danh sách đơn hàng");
        setLoading(false);
        return;
      }

      if (!carsResponse.success || !carsResponse.data) {
        message.warning("Không thể tải danh sách xe");
        setLoading(false);
        return;
      }

      // Normalize data
      const ordersData = Array.isArray(ordersResponse.data)
        ? ordersResponse.data
        : (ordersResponse.data as any)?.$values || [];

      const carsData = Array.isArray(carsResponse.data)
        ? carsResponse.data
        : (carsResponse.data as any)?.$values || [];

      // Get current month
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth(); // 0-11

      // Filter orders in current month
      const ordersThisMonth = ordersData.filter((order: RentalOrderData) => {
        if (!order.orderDate) return false;
        
        try {
          const orderDate = new Date(order.orderDate);
          return (
            orderDate.getFullYear() === currentYear &&
            orderDate.getMonth() === currentMonth
          );
        } catch (error) {
          console.error("Error parsing order date:", order.orderDate, error);
          return false;
        }
      });

      // Count rentals per car
      const carRentalCount = new Map<number, number>();
      
      ordersThisMonth.forEach((order: RentalOrderData) => {
        const carId = order.carId;
        if (carId) {
          const currentCount = carRentalCount.get(carId) || 0;
          carRentalCount.set(carId, currentCount + 1);
        }
      });

      // Map to cars with rental count
      const carsWithCount: CarWithRentalCount[] = carsData
        .map((car: Car) => ({
          car,
          rentalCount: carRentalCount.get(car.id) || 0,
        }))
        .filter((item: CarWithRentalCount) => item.car.isActive && !item.car.isDeleted);

      // Find max and min rental counts
      const counts = carsWithCount.map((item) => item.rentalCount);
      const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
      const minCount = counts.length > 0 ? Math.min(...counts) : 0;

      // Get cars with max count (most rented)
      const mostRented = carsWithCount.filter(
        (item) => item.rentalCount === maxCount && maxCount > 0
      );

      // Get cars with min count (least rented)
      const leastRented = carsWithCount.filter(
        (item) => item.rentalCount === minCount
      );

      setMostRentedCars(mostRented);
      setLeastRentedCars(leastRented);

      // Analyze pickup time slots
      const timeSlots: TimeSlotData[] = [
        { label: "0h - 6h", startHour: 0, endHour: 6, count: 0, percentage: 0 },
        { label: "6h - 9h", startHour: 6, endHour: 9, count: 0, percentage: 0 },
        { label: "9h - 12h", startHour: 9, endHour: 12, count: 0, percentage: 0 },
        { label: "12h - 15h", startHour: 12, endHour: 15, count: 0, percentage: 0 },
        { label: "15h - 18h", startHour: 15, endHour: 18, count: 0, percentage: 0 },
        { label: "18h - 21h", startHour: 18, endHour: 21, count: 0, percentage: 0 },
        { label: "21h - 24h", startHour: 21, endHour: 24, count: 0, percentage: 0 },
      ];

      // Count orders by time slot
      ordersThisMonth.forEach((order: RentalOrderData) => {
        if (!order.pickupTime) return;
        
        try {
          const pickupDate = new Date(order.pickupTime);
          const hour = pickupDate.getHours();
          
          // Find matching time slot
          for (const slot of timeSlots) {
            if (hour >= slot.startHour && hour < slot.endHour) {
              slot.count++;
              break;
            }
          }
        } catch (error) {
          console.error("Error parsing pickup time:", order.pickupTime, error);
        }
      });

      // Calculate percentages
      const totalOrders = ordersThisMonth.length;
      timeSlots.forEach((slot) => {
        slot.percentage = totalOrders > 0 ? (slot.count / totalOrders) * 100 : 0;
      });

      // Sort by count (descending)
      timeSlots.sort((a, b) => b.count - a.count);
      
      setTimeSlotData(timeSlots);
    } catch (error) {
      console.error("Error loading car utilization data:", error);
      message.error("Có lỗi xảy ra khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const renderCarCard = (item: CarWithRentalCount, isMostRented: boolean) => {
    const { car, rentalCount } = item;
    
    return (
      // @ts-ignore
      <Card
        key={car.id}
        hoverable
        style={{
          height: "100%",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
        cover={
          <div style={{ position: "relative", height: "200px", overflow: "hidden" }}>
            <img
              alt={car.name}
              src={car.imageUrl || "/logo_ev.png"}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/logo_ev.png";
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                background: isMostRented
                  ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                color: "white",
                padding: "6px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "bold",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              {isMostRented ? "Nhiều nhất" : "Ít nhất"}
            </div>
          </div>
        }
      >
        <div style={{ padding: "8px 0" }}>
          <Title level={5} style={{ margin: 0, marginBottom: "8px" }}>
            {car.name} {car.model && car.model}
          </Title>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {isMostRented ? (
                <TrendingUp size={20} color="#667eea" />
              ) : (
                <TrendingDown size={20} color="#f5576c" />
              )}
              <Text strong style={{ fontSize: "16px" }}>
                Số lần thuê:
              </Text>
            </div>
            <Tag
              color={isMostRented ? "blue" : "red"}
              style={{
                fontSize: "18px",
                padding: "4px 12px",
                fontWeight: "bold",
              }}
            >
              {rentalCount}
            </Tag>
          </div>
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
      </div>
    );
  }

  const renderTimeSlotChart = () => {
    if (timeSlotData.length === 0 || timeSlotData.every(slot => slot.count === 0)) {
      return (
        <Card>
          <div style={{ textAlign: "center", padding: "20px" }}>
            <Clock size={48} color="#ccc" style={{ marginBottom: "12px" }} />
            <Text type="secondary">
              Chưa có dữ liệu về giờ thuê trong tháng này
            </Text>
          </div>
        </Card>
      );
    }

    const maxCount = Math.max(...timeSlotData.map(slot => slot.count));

    return (
      <Card>
        <Row gutter={[16, 16]}>
          {timeSlotData.map((slot, index) => {
            const isTopSlot = slot.count === maxCount && maxCount > 0;
            return (
              <Col xs={24} sm={12} md={8} lg={7} key={slot.label}>
                <div
                  style={{
                    padding: "16px",
                    background: isTopSlot
                      ? "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)"
                      : "#f8f9fa",
                    borderRadius: "8px",
                    border: isTopSlot ? "2px solid #667eea" : "1px solid #e8e8e8",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <Text strong style={{ fontSize: "14px" }}>
                      {slot.label}
                    </Text>
                    {isTopSlot && (
                      <Tag color="blue" style={{ margin: 0 }}>
                        Phổ biến nhất
                      </Tag>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      marginBottom: "8px",
                    }}
                  >
                    <Progress
                      percent={slot.percentage}
                      strokeColor={
                        isTopSlot
                          ? {
                              "0%": "#667eea",
                              "100%": "#764ba2",
                            }
                          : "#1890ff"
                      }
                      showInfo={false}
                      style={{ flex: 1 }}
                    />
                    <Text strong style={{ fontSize: "16px", minWidth: "60px", textAlign: "right" }}>
                      {slot.count}
                    </Text>
                  </div>
                  <Text type="secondary" style={{ fontSize: "12px" }}>
                    {slot.percentage.toFixed(1)}% tổng đơn hàng
                  </Text>
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>
    );
  };

  return (
    <div>
      <Title level={2} style={{ marginBottom: "24px" }}>
        Tỷ lệ sử dụng xe trong tháng
      </Title>

      {/* Time Slot Analysis */}
      <div style={{ marginBottom: "32px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <Clock size={24} color="#52c41a" />
          <Title level={3} style={{ margin: 0, color: "#52c41a" }}>
            Khoảng giờ thuê phổ biến
          </Title>
        </div>
        {renderTimeSlotChart()}
      </div>

      {/* Most Rented Cars */}
      <div style={{ marginBottom: "32px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <TrendingUp size={24} color="#667eea" />
          <Title level={3} style={{ margin: 0, color: "#667eea" }}>
            Xe được thuê nhiều nhất
          </Title>
        </div>
        {mostRentedCars.length > 0 ? (
          <Row gutter={[16, 16]}>
            {mostRentedCars.map((item) => (
              <Col xs={24} sm={12} md={8} lg={6} key={item.car.id}>
                {renderCarCard(item, true)}
              </Col>
            ))}
          </Row>
        ) : (
          <Card>
            <div style={{ textAlign: "center", padding: "20px" }}>
              <CarIcon size={48} color="#ccc" style={{ marginBottom: "12px" }} />
              <Text type="secondary">
                Chưa có dữ liệu thuê xe trong tháng này
              </Text>
            </div>
          </Card>
        )}
      </div>

      {/* Least Rented Cars */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <TrendingDown size={24} color="#f5576c" />
          <Title level={3} style={{ margin: 0, color: "#f5576c" }}>
            Xe có tỷ lệ thuê thấp nhất
          </Title>
        </div>
        {leastRentedCars.length > 0 ? (
          <Row gutter={[16, 16]}>
            {leastRentedCars.map((item) => (
              <Col xs={24} sm={12} md={8} lg={6} key={item.car.id}>
                {renderCarCard(item, false)}
              </Col>
            ))}
          </Row>
        ) : (
          <Card>
            <div style={{ textAlign: "center", padding: "20px" }}>
              <CarIcon size={48} color="#ccc" style={{ marginBottom: "12px" }} />
              <Text type="secondary">
                Chưa có dữ liệu thuê xe trong tháng này
              </Text>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

