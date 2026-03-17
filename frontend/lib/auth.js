export const ROLE_ROUTES = {
  owner: ["/owner", "/owner/menu", "/owner/meja", "/owner/staff", "/owner/laporan", "/owner/pengaturan", "/kasir", "/dapur"],
  manager: ["/manager", "/owner/menu", "/owner/meja", "/kasir", "/dapur"],
  kasir: ["/kasir"],
  dapur: ["/dapur"],
};

export const DASHBOARD_HOME = {
  owner: "/owner",
  manager: "/manager",
  kasir: "/kasir",
  dapur: "/dapur",
};