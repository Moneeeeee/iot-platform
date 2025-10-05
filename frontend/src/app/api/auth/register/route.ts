/**
 * 用户注册API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { success: false, message: '所有字段都是必填的' },
        { status: 400 }
      );
    }

    // 转发到后端API
    const response = await apiClient.post('/auth/register', { username, email, password });
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Register API error:', error);
    return NextResponse.json(
      { success: false, message: error.message || '注册失败' },
      { status: 500 }
    );
  }
}
