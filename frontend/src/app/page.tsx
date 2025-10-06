/**
 * 根页面重定向
 * 重定向到公开主页
 */

import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/home');
}