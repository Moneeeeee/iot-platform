/**
 * 忘记密码页面
 * 用户可以通过邮箱重置密码
 */

"use client";

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft,
  Mail,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('请输入邮箱地址');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 这里应该调用重置密码的API
      // 暂时模拟成功响应
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsSubmitted(true);
      toast({
        title: "重置邮件已发送",
        description: "请检查您的邮箱并按照说明重置密码",
      });
    } catch (error: any) {
      setError(error.message || '发送重置邮件失败');
      toast({
        title: "发送失败",
        description: error.message || '请稍后重试',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Link 
              href="/login" 
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回登录
            </Link>
          </div>

          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-center mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
                  <Mail className="h-6 w-6" />
                </div>
              </div>
              <CardTitle className="text-2xl text-center">邮件已发送</CardTitle>
              <CardDescription className="text-center">
                我们已向您的邮箱发送了密码重置链接
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  请检查您的邮箱 <strong>{email}</strong> 并按照邮件中的说明重置密码。
                </p>
                <p className="text-xs text-gray-500">
                  如果没有收到邮件，请检查垃圾邮件文件夹或稍后重试。
                </p>
                <Button
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail('');
                  }}
                  variant="outline"
                  className="w-full"
                >
                  重新发送
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 返回登录链接 */}
        <div className="text-center">
          <Link 
            href="/login" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回登录
          </Link>
        </div>

        {/* 忘记密码表单 */}
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <Mail className="h-6 w-6" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">忘记密码</CardTitle>
            <CardDescription className="text-center">
              请输入您的邮箱地址，我们将发送密码重置链接给您
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 错误提示 */}
              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <span className="text-sm text-red-600">{error}</span>
                </div>
              )}

              {/* 邮箱输入 */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  邮箱地址
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="请输入您的邮箱地址"
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* 提交按钮 */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    发送中...
                  </>
                ) : (
                  '发送重置链接'
                )}
              </Button>
            </form>

            {/* 返回登录链接 */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                记起密码了？{' '}
                <Link
                  href="/login"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  返回登录
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
