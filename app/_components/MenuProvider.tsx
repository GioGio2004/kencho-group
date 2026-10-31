"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { usePathname } from "@/i18n/navigation";
type Menu = { open: boolean; setOpen: (open: boolean) => void };
const MenuContext = createContext<Menu>({ open: false, setOpen: () => {} });
export function useMenu() {
  return useContext(MenuContext);
}
export default function MenuProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const setOpen = useCallback((next: boolean) => setOpenedOn(next ? pathname : null), [pathname]);
  return (
    <MenuContext.Provider
      value={{ open, setOpen }}
    >
      {children}
    </MenuContext.Provider>
  );
}
