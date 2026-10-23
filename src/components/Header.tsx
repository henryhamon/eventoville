function Header() {
  return (
    <div class="flex items-center gap-4">
      <img src="/univille-logo.png" alt="Univille" class="h-12 w-auto" />
      <div class="border-l border-gray-300 pl-4">
        <div class="text-lg font-semibold leading-tight">Sistema de Gestão de Eventos Institucionais</div>
        <div class="text-xs" style={{ "color": "#50916B" }}>Univille · Campus São Bento do Sul</div>
      </div>
    </div>
  );
}

export default Header;
