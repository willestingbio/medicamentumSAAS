import { AuthCarousel } from '@/components/auth/AuthCarousel';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Left: Carousel */}
      <div className="hidden lg:flex lg:w-1/2 bg-muted">
        <AuthCarousel />
      </div>
      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 lg:px-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
