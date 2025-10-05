/**
 * 认证API路由
 * 处理用户登录请求
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    // 转发到后端API
    const response = await apiClient.post('/auth/login', { username, password });
    
    return NextResponse.json(response.data);
  } catch (error: unknown) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : '登录失败' },
      { status: 500 }
    );
  }
}
