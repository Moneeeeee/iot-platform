/**
 * 单个设备API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 转发到后端API
    const response = await apiClient.get(`/devices/${id}`);
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Get device API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || '获取设备信息失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    // 转发到后端API
    const response = await apiClient.put(`/devices/${id}`, body);
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Update device API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || '更新设备失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 转发到后端API
    const response = await apiClient.delete(`/devices/${id}`);
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Delete device API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || '删除设备失败' },
      { status: 500 }
    );
  }
}
