/**
 * 公开页面布局
 * 用于登录、注册、关于等公开页面
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'IoT Platform - 公开页面',
  description: 'IoT设备管理平台公开页面',
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
