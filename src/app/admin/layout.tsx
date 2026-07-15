"use client";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark bg-[#050505] min-h-screen text-foreground selection:bg-amber-500/30 overflow-hidden relative">
      {/* Global Ambient Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-amber-900/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-amber-900/5 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}
