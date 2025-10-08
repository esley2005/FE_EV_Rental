import { NextResponse } from 'next/server';

// POST /api/bookings - Tạo booking mới
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['carId', 'fullName', 'phone', 'startDate', 'endDate', 'pickupLocation'];
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

    // Validate dates
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    const today = new Date();
    
    if (startDate < today) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Start date cannot be in the past' 
        },
        { status: 400 }
      );
    }

    if (endDate <= startDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'End date must be after start date' 
        },
        { status: 400 }
      );
    }

    // Create booking (in real app, save to database)
    const booking = {
      id: `booking_${Date.now()}`,
      ...body,
      status: 'pending',
      createdAt: new Date().toISOString(),
      totalDays: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    };

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json({
      success: true,
      data: booking,
      message: 'Booking created successfully. We will contact you soon!'
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create booking' 
      },
      { status: 500 }
    );
  }
}

// GET /api/bookings - Lấy danh sách bookings (cho admin)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const carId = searchParams.get('carId');

    // Mock bookings data
    let bookings = [
      {
        id: 'booking_1',
        carId: 'vf3',
        fullName: 'Nguyễn Văn A',
        phone: '0901234567',
        email: 'nguyenvana@email.com',
        startDate: '2024-01-15',
        endDate: '2024-01-17',
        pickupLocation: 'hcm-center',
        status: 'confirmed',
        totalDays: 2,
        createdAt: '2024-01-10T10:00:00Z'
      }
    ];

    // Filter by status
    if (status) {
      bookings = bookings.filter(b => b.status === status);
    }

    // Filter by carId
    if (carId) {
      bookings = bookings.filter(b => b.carId === carId);
    }

    return NextResponse.json({
      success: true,
      data: bookings,
      total: bookings.length
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch bookings' 
      },
      { status: 500 }
    );
  }
}

