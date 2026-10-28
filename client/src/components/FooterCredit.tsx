export function FooterCredit() {
  const badge = (
    <a
      href="https://t.me/MSR_5328"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="S.R.A.N developer"
      className="inline-flex items-center justify-center rounded-md bg-navy-900 px-2 py-0.5 text-[10px] font-black tracking-[0.25em] text-white shadow-sm transition hover:opacity-90 dark:bg-white dark:text-navy-900"
    >
      S.R.A.N
    </a>
  )
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-300">
        Developed By {badge}
      </p>
    </div>
  )
}