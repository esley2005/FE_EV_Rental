export interface Car {
  id: number;
  model: string;
  name: string;
  seats: number;
  sizeType: string;
  trunkCapacity: number;
  batteryType: string;
  batteryDuration: number;
  rentPricePerDay: number;
  rentPricePerHour: number;
  rentPricePerDayWithDriver: number;
  rentPricePerHourWithDriver: number;
  imageUrl: string;
  imageUrl2?: string;
  imageUrl3?: string;
  status: number;
  createdAt: string; // ISO date string (e.g., "2025-10-16T13:50:12.04")
  updatedAt: string | null;
  isActive: boolean;
  isDeleted: boolean;
  carRentalLocations: any | null; // replace `any` with a specific type if you have one
  rentalOrders: any | null;       // same here
}

export interface CarResponse {
  $id: string;
  $values: Car[];
}
