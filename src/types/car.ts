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
  rentPricePerHour?: number; 
  rentPricePerDayWithDriver: number;
  rentPricePerHourWithDriver?: number; 
  rentPricePer4Hour: number;
  rentPricePer8Hour: number;
  rentPricePer4HourWithDriver: number;
  rentPricePer8HourWithDriver: number;
  depositOrderAmount: number;
  depositCarAmount: number;
  imageUrl: string;
  imageUrl2?: string;
  imageUrl3?: string;
  status: number;
  createdAt: string; 
  updatedAt: string | null;
  isActive: boolean;
  isDeleted: boolean;
  carRentalLocations: any | null; // replace `any` with a specific type if you have one
  rentalOrders: any | null;       // same here
  rentalOrderId?: number ;
}

export interface CarResponse {
  $id: string;
  $values: Car[];
}
