"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { identidade } from "@/config/identidade";
import { menu } from "@/config/menu";

export function Cabecalho() {
  const caminho = usePathname();
  return (
    <header
      className="sticky top-0 z-10 text-white shadow"
      style={{ background: "var(--cor-principal)" }}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        {identidade.logo ? (
          <Image
            src={identidade.logo}
            alt={identidade.nome}
            width={44}
            height={44}
            priority
            className="h-11 w-11 rounded-full bg-white object-contain p-1 shadow-sm"
          />
        ) : null}
        <span className="text-xl font-bold tracking-tight">{identidade.nome}</span>
      </div>
      <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2 pb-2">
        {menu.map((item) => {
          const ativo = caminho === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${
                ativo ? "bg-white text-[var(--cor-principal)] shadow-sm" : "text-white/90 active:bg-white/15"
              }`}
            >
              {item.rotulo}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
