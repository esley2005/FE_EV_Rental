// Utility để test kết nối API
export async function testApiConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://localhost:7200/api';
  
  try {
    console.log(`[API Test] Testing connection to: ${API_BASE_URL}`);
    
    const response = await fetch(`${API_BASE_URL}/Car`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`[API Test] Response status: ${response.status} ${response.statusText}`);
    
    const text = await response.text();
    console.log(`[API Test] Response text (first 200 chars):`, text.substring(0, 200));
    
    if (response.ok) {
      try {
        const data = JSON.parse(text);
        return {
          success: true,
          message: 'API connection successful',
          details: {
            status: response.status,
            dataType: Array.isArray(data) ? 'array' : typeof data,
            dataLength: Array.isArray(data) ? data.length : 'N/A'
          }
        };
      } catch (e) {
        return {
          success: false,
          message: 'API responded but returned invalid JSON',
          details: {
            status: response.status,
            responseText: text.substring(0, 300)
          }
        };
      }
    } else {
      return {
        success: false,
        message: `API returned error status: ${response.status}`,
        details: {
          status: response.status,
          statusText: response.statusText,
          responseText: text.substring(0, 300)
        }
      };
    }
  } catch (error) {
    console.error('[API Test] Connection failed:', error);
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: API_BASE_URL
      }
    };
  }
}

// Mock data để demo khi API không khả dụng
export const mockCars = [
  {
    id: 1,
    name: "Tesla Model 3",
    model: "Model 3",
    seats: 5,
    sizeType: "Sedan",
    trunkCapacity: 425,
    batteryType: "Lithium-ion",
    batteryDuration: 500,
    rentPricePerDay: 1500000,
    rentPricePerHour: 200000,
    rentPricePerDayWithDriver: 2000000,
    rentPricePerHourWithDriver: 300000,
    imageUrl: "/Xe_TeslaMD3.png",
    status: 1,
    createdAt: "2023-01-01T00:00:00.000Z",
    updatedAt: null,
    isActive: true,
    isDeleted: false,
    carRentalLocations: null,
    rentalOrders: null
  },
  {
    id: 2,
    name: "BYD Atto 3",
    model: "Atto 3",
    seats: 5,
    sizeType: "SUV",
    trunkCapacity: 380,
    batteryType: "Lithium-ion",
    batteryDuration: 400,
    rentPricePerDay: 1200000,
    rentPricePerHour: 150000,
    rentPricePerDayWithDriver: 1700000,
    rentPricePerHourWithDriver: 250000,
    imageUrl: "/xe_byd.png",
    status: 1,
    createdAt: "2023-01-01T00:00:00.000Z",
    updatedAt: null,
    isActive: true,
    isDeleted: false,
    carRentalLocations: null,
    rentalOrders: null
  },
  {
    id: 3,
    name: "VinFast VF3",
    model: "VF3",
    seats: 4,
    sizeType: "Hatchback",
    trunkCapacity: 300,
    batteryType: "Lithium-ion",
    batteryDuration: 300,
    rentPricePerDay: 800000,
    rentPricePerHour: 100000,
    rentPricePerDayWithDriver: 1200000,
    rentPricePerHourWithDriver: 180000,
    imageUrl: "/xe_vf3.png",
    status: 1,
    createdAt: "2023-01-01T00:00:00.000Z",
    updatedAt: null,
    isActive: true,
    isDeleted: false,
    carRentalLocations: null,
    rentalOrders: null
  }
];
