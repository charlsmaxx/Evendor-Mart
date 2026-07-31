import { BrandLogo } from "@/components/brand-logo";
import { AuthMobileHeader } from "@/components/auth/auth-mobile-header";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="gradient-blob left-1/4 top-0 h-96 w-96 bg-violet-600" />
      <div className="gradient-blob right-0 bottom-0 h-80 w-80 bg-fuchsia-600" />
      <AuthMobileHeader />
      <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 pt-24 md:pt-12">
        <div className="mb-8 hidden md:block">
          <BrandLogo href="/" heightClass="h-[70px]" />
        </div>
        {children}
      </div>
    </div>
  );
}
