/**
 * 设备管理API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());

    // 转发到后端API
    const response = await apiClient.get('/devices', { params });
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Get devices API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || '获取设备列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 转发到后端API
    const response = await apiClient.post('/devices', body);
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Create device API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || '创建设备失败' },
      { status: 500 }
    );
  }
}
