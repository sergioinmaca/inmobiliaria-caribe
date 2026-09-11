export function Footer() {
  return (
    <footer className="flex flex-row items-center justify-center gap-7 bg-primary px-4 py-2">
      <div className="flex shrink-0 items-center self-stretch">
        <img
          src="/brand/vertical_claro_v2.svg"
          alt="Inmobiliaria Municipal Caribe"
          className="h-12 w-auto"
        />
      </div>
      <div className="self-center text-left text-[12px] text-surface">
        <p>Inmobiliaria Municipal Caribe © {new Date().getFullYear()}</p>
        <p>RIF: G-20016595-2</p>
      </div>
    </footer>
  )
}
