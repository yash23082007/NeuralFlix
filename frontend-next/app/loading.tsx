export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="space-y-4 text-center flex flex-col items-center">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-text-muted text-sm font-mono tracking-widest uppercase">Initializing Neural Link...</p>
      </div>
    </div>
  );
}
