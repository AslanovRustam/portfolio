/** Shown instead of the 3D street when WebGL2 is missing, disabled (?webgl=0) or the GPU context is lost. */
export default function Fallback({ title, body }: { title: string; body: string }) {
  return (
    <div
      data-fallback
      className="fixed inset-0 z-0 grid place-items-center bg-[#0b1f38] px-4"
      style={{
        backgroundImage:
          'linear-gradient(#24486f55 1px, transparent 1px), linear-gradient(90deg, #24486f55 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div className="max-w-md border border-[#7fe3ff]/60 bg-[#0b1f38]/80 p-6 text-[#e8f7ff]">
        <p className="mb-2 text-lg font-bold">{title}</p>
        <p className="text-sm leading-relaxed text-[#bfe9ff]">{body}</p>
      </div>
    </div>
  );
}
