"use client";
import { useEffect, useState, useMemo } from "react";
import { Card, Table, Select, Button, Tag, Space, message, Spin } from "antd";
import { carsApi, rentalLocationApi, carRentalLocationApi } from "@/services/api";
import type { Car } from "@/types/car";

interface LocationOption { value: number; label: string }

export default function VehicleDispatch() {
  const [cars, setCars] = useState<Car[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState<Record<number, boolean>>({});
  const [selectedLocation, setSelectedLocation] = useState<Record<number, number | null>>({});
  const [filterLocationId, setFilterLocationId] = useState<number | undefined>(undefined);

  useEffect(() => {
    loadData();
  }, []);

  const normalizeDotNetList = <T,>(input: unknown): T[] => {
    if (!input) return [];
    if (Array.isArray(input)) return input as T[];
    if (typeof input === 'object') {
      const obj = input as any;
      if (Array.isArray(obj.$values)) return obj.$values as T[];
      if (Array.isArray(obj.data)) return obj.data as T[];
      if (obj.data && Array.isArray(obj.data.$values)) return obj.data.$values as T[];
    }
    return [];
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [carRes, locRes] = await Promise.all([carsApi.getAll(), rentalLocationApi.getAll()]);

      let rawCars: Car[] = [];
      if (carRes.success && carRes.data) {
        const parsed = normalizeDotNetList<Car>(carRes.data);
        rawCars = parsed.length ? parsed : (Array.isArray(carRes.data) ? carRes.data as Car[] : []);
      }

      // Fetch locations per car if missing
      const carsWithLocations = await Promise.all(
        rawCars.map(async (car) => {
          try {
            const hasLocs = car.carRentalLocations && (Array.isArray(car.carRentalLocations) || (car as any).carRentalLocations?.$values);
            if (!hasLocs) {
              const relRes = await carRentalLocationApi.getByCarId(car.id);
              if (relRes.success && relRes.data) {
                const rels = normalizeDotNetList<any>(relRes.data);
                return { ...car, carRentalLocations: rels };
              }
            }
            return car;
          } catch (err) {
            return car; // silent fail per car
          }
        })
      );

      setCars(carsWithLocations.filter(c => !c.isDeleted));

      if (locRes.success && locRes.data) {
        const parsedLocs = normalizeDotNetList<any>(locRes.data);
        setLocations(parsedLocs.length ? parsedLocs : (Array.isArray(locRes.data) ? locRes.data as any[] : []));
      }
      if (!carRes.success) message.warning(carRes.error || 'Không lấy được danh sách xe');
    } catch (e) {
      message.error("Không tải được dữ liệu điều phối");
    } finally {
      setLoading(false);
    }
  };

  const locationOptions: LocationOption[] = useMemo(
    () => locations.map((l: any) => ({ value: l.id, label: l.name || l.Name })),
    [locations]
  );

  const locationMap = useMemo(() => {
    const m: Record<number, { id: number; name: string }> = {} as any;
    locations.forEach((l: any) => {
      if (l?.id) m[l.id] = { id: l.id, name: l.name || l.Name || `#${l.id}` };
    });
    return m;
  }, [locations]);

  const getCarRelations = (car: Car) => {
    const raw = (car as any).carRentalLocations;
    const rels: any[] = raw?.$values ? raw.$values : Array.isArray(raw) ? raw : raw ? [raw] : [];
    return rels as any[];
  };

  const visibleCars = useMemo(() => {
    if (!filterLocationId) return cars;
    return cars.filter((car) => {
      const rels = getCarRelations(car);
      return rels?.some((r: any) => (r.rentalLocationId || r.RentalLocationId || r.locationId || r.LocationId) === filterLocationId);
    });
  }, [cars, filterLocationId]);

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 70 },
    {
      title: "Tên xe",
      dataIndex: "name",
      key: "name",
      render: (_: any, car: Car) => (
        <Space direction="vertical" size={2}>
          <span className="font-medium">{car.name}</span>
          <span className="text-xs text-gray-500">Model: {car.model}</span>
        </Space>
      ),
    },
    {
      title: "Vị trí hiện tại",
      key: "locations",
      render: (_: any, car: Car) => {
        // Ưu tiên kiểm tra rentalLocationId trực tiếp từ Car
        if (car.rentalLocationId) {
          const locationName = locationMap[car.rentalLocationId]?.name;
          if (locationName) {
            return <Tag color="blue">{locationName}</Tag>;
          }
          return <Tag color="blue">#{car.rentalLocationId}</Tag>;
        }

        // Fallback: Kiểm tra carRentalLocations (quan hệ)
        const rels = getCarRelations(car);
        if (!rels || rels.length === 0) {
          return <Tag color="orange">Chưa có địa điểm</Tag>;
        }

        const normalized = rels.map(r => {
          const id = r.rentalLocationId || r.RentalLocationId || r.locationId || r.LocationId || r.id || r.Id;
          const name = r.rentalLocation?.name || r.RentalLocation?.name || r.rentalLocation?.Name || r.RentalLocation?.Name || (id ? locationMap[id]?.name : undefined);
          return { id, name };
        }).filter(r => r.id);

        if (normalized.length === 0) {
          return <Tag color="orange">Chưa có địa điểm</Tag>;
        }

        // Loại trùng theo id
        const uniqueById: Record<string | number, { id: any; name: any }> = {};
        normalized.forEach(n => { if (!uniqueById[n.id]) uniqueById[n.id] = n; });
        const list = Object.values(uniqueById);

        return (
          <Space size={[4, 4]} wrap>
            {list.map(loc => (
              <Tag key={loc.id} color="blue">{loc.name || `#${loc.id}`}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: "Chuyển đến điểm khác",
      key: "dispatch",
      render: (_: any, car: Car) => {
        return (
          <Space>
            <Select
              placeholder="Chọn điểm thuê"
              style={{ width: 180 }}
              value={selectedLocation[car.id] ?? null}
              onChange={(val) => setSelectedLocation((prev) => ({ ...prev, [car.id]: val }))}
              options={locationOptions}
              showSearch
              optionFilterProp="label"
            />
            <Button
              type="primary"
              loading={dispatching[car.id]}
              disabled={!selectedLocation[car.id]}
              onClick={() => handleDispatch(car)}
            >
              Điều phối
            </Button>
          </Space>
        );
      },
    },
  ];

  const handleDispatch = async (car: Car) => {
    const targetLocationId = selectedLocation[car.id];
    if (!targetLocationId) {
      message.warning("Vui lòng chọn điểm thuê mới");
      return;
    }

    // Kiểm tra xem xe đã ở điểm thuê này chưa
    const rels = getCarRelations(car);
    const currentLocationId = car.rentalLocationId || (rels.length > 0 ? (rels[0].rentalLocationId || rels[0].RentalLocationId || rels[0].locationId || rels[0].LocationId) : null);
    
    if (currentLocationId === targetLocationId) {
      message.info(`Xe '${car.name}' đã ở điểm thuê này rồi`);
      return;
    }

    setDispatching((p) => ({ ...p, [car.id]: true }));
    try {
      console.log('[VehicleDispatch] Updating rental location:', { carId: car.id, newLocationId: targetLocationId });
      
      // Sử dụng API UpdateRentalLocation
      const response = await carsApi.updateRentalLocation(car.id, targetLocationId);
      
      if (response.success) {
        const newLocationName = locationMap[targetLocationId]?.name || `#${targetLocationId}`;
        message.success(`Đã điều phối xe '${car.name}' đến ${newLocationName}`);
        // Reset selection
        setSelectedLocation((prev) => ({ ...prev, [car.id]: null }));
        // Reload data để cập nhật UI
        await loadData();
      } else {
        message.error(response.error || "Điều phối thất bại");
      }
    } catch (e: any) {
      console.error('[VehicleDispatch] Dispatch error:', e);
      message.error(e?.message || "Điều phối thất bại. Vui lòng thử lại!");
    } finally {
      setDispatching((p) => ({ ...p, [car.id]: false }));
    }
  };

  return (
    <Card
      title="Điều phối xe giữa các điểm thuê"
      extra={
        <Space>
          <Select
            placeholder="Lọc theo điểm thuê"
            allowClear
            style={{ width: 220 }}
            value={filterLocationId}
            onChange={(v) => setFilterLocationId(v)}
            options={locationOptions}
            showSearch
            optionFilterProp="label"
          />
          <Button onClick={loadData}>Làm mới</Button>
        </Space>
      }
    >
      {loading ? (
        <div className="py-16 flex justify-center"><Spin /></div>
      ) : (
        <Table
          columns={columns}
          dataSource={visibleCars}
          rowKey="id"
          pagination={{ pageSize: 10, showTotal: (t) => `Tổng ${t} xe` }}
          scroll={{ x: 900 }}
        />
      )}
    </Card>
  );
}