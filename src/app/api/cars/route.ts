import { NextResponse } from 'next/server';
import { cars } from '@/data/cars';

// GET /api/cars - Lấy danh sách tất cả xe
export async function GET() {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return NextResponse.json({
      success: true,
      data: cars,
      total: cars.length
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch cars' 
      }, 
      { status: 500 }
    );
  }
}

// POST /api/cars - Thêm xe mới (cho admin)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['name', 'type', 'range', 'seats', 'storage', 'price'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Missing required field: ${field}` 
          },
          { status: 400 }
        );
      }
    }

    // Create new car (in real app, save to database)
    const newCar = {
      id: `car_${Date.now()}`,
      ...body,
      href: `/cars/${body.id || `car_${Date.now()}`}`
    };

    return NextResponse.json({
      success: true,
      data: newCar,
      message: 'Car created successfully'
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid request body' 
      },
      { status: 400 }
    );
  }
}
