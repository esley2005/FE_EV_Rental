import { NextRequest, NextResponse } from 'next/server';
import { cars } from '@/data/cars';

// GET /api/cars/[id] - Lấy thông tin chi tiết 1 xe
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const car = cars.find(c => c.id === params.id);
    
    if (!car) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Car not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: car
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch car details' 
      },
      { status: 500 }
    );
  }
}

// PUT /api/cars/[id] - Cập nhật thông tin xe
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const car = cars.find(c => c.id === params.id);
    
    if (!car) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Car not found' 
        },
        { status: 404 }
      );
    }

    // Update car (in real app, update in database)
    const updatedCar = { ...car, ...body };

    return NextResponse.json({
      success: true,
      data: updatedCar,
      message: 'Car updated successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update car' 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/cars/[id] - Xóa xe
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const car = cars.find(c => c.id === params.id);
    
    if (!car) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Car not found' 
        },
        { status: 404 }
      );
    }

    // Delete car (in real app, delete from database)
    return NextResponse.json({
      success: true,
      message: 'Car deleted successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete car' 
      },
      { status: 500 }
    );
  }
}
