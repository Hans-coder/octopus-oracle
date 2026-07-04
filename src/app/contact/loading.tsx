export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <span className="text-5xl animate-bounce">🐙</span>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-8 rounded-full bg-cyan-500/20 blur-sm" />
        </div>
        <p className="text-sm text-slate-400 animate-pulse">章魚哥正在感應中⋯</p>
      </div>
    </div>
  );
}
