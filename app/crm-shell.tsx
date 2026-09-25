"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { logout } from "@/app/auth/actions";
import { BackToDashboard } from "@/app/back-to-dashboard";
import { UiIcon, type IconName } from "@/app/ui-icon";

const groups: { title: string; items: { href: string; label: string; icon: IconName }[] }[] = [
  { title: "Principal", items: [
    { href: "/", label: "Resumen", icon: "home" },
    { href: "/clientes", label: "Cartera de clientes", icon: "users" },
    { href: "/presupuestos", label: "Presupuestos", icon: "file" },
    { href: "/citas", label: "Citas", icon: "calendar" },
    { href: "/actividad", label: "Actividad", icon: "activity" },
  ] },
  { title: "Gestión", items: [
    { href: "/facturas-venta", label: "Facturas de venta", icon: "file" },
    { href: "/gastos", label: "Gastos y compras", icon: "wallet" },
    { href: "/proveedores", label: "Proveedores", icon: "briefcase" },
    { href: "/vencimientos", label: "Vencimientos", icon: "clock" },
    { href: "/vencimientos/recurrentes", label: "Recurrentes", icon: "repeat" },
  ] },
  { title: "Taller", items: [
    { href: "/materiales", label: "Materiales", icon: "box" },
    { href: "/calculadoras/armarios", label: "Calculadora armarios", icon: "calculator" },
    { href: "/configuracion/tarifas", label: "Tarifas internas", icon: "tag" },
    { href: "/manual", label: "Manual técnico-comercial", icon: "book" },
    { href: "/trabajos", label: "Trabajos terminados", icon: "check" },
  ] },
];

export function CrmShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const active = groups.flatMap(group => group.items).filter(item => item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`)).sort((a, b) => b.href.length - a.href.length)[0];

  function closeMenu() { dialog.current?.close(); }

  function keepMenuFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)');
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1100px)");
    const closeOnDesktop = () => { if (query.matches) dialog.current?.close(); };
    query.addEventListener("change", closeOnDesktop);
    return () => query.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  if (pathname === "/login" || pathname.startsWith("/presupuestos/publico/")) return children;
  if (pathname.endsWith("/orden-trabajo")) return <><BackToDashboard />{children}</>;

  function navigation() {
    return <>
      <Link href="/" className="crm-brand" onClick={closeMenu} aria-label="Juanser · Resumen"><Image src="/logo-juanser.jpeg" alt="Carpintería Juanser" width={180} height={100} priority className="crm-logo" /></Link>
      <nav aria-label="Módulos del CRM">{groups.map(group => <div className="crm-nav-group" key={group.title}>
        <p>{group.title}</p>
        {group.items.map(item => <Link key={item.href} href={item.href} onClick={closeMenu} aria-current={active?.href === item.href ? "page" : undefined}><UiIcon name={item.icon} /><span>{item.label}</span></Link>)}
      </div>)}</nav>
      <form action={logout} className="crm-session"><button type="submit"><UiIcon name="logout" /> Cerrar sesión</button></form>
    </>;
  }

  return <div className="crm-shell">
    <a href="#crm-content" className="crm-skip">Saltar al contenido</a>
    <aside className="crm-sidebar">{navigation()}</aside>
    <dialog ref={dialog} id="crm-mobile-menu" className="crm-mobile-menu" aria-label="Menú de navegación" onKeyDown={keepMenuFocus} onClick={event => { if (event.target === event.currentTarget) closeMenu(); }} onClose={() => { setOpen(false); trigger.current?.focus(); }}>
      <button type="button" className="crm-menu-close" onClick={closeMenu} aria-label="Cerrar menú"><UiIcon name="close" /></button>
      {navigation()}
    </dialog>
    <div className="crm-workspace">
      <header className="crm-topbar">
        <button ref={trigger} type="button" className="crm-menu-trigger" aria-label="Abrir menú" aria-controls="crm-mobile-menu" aria-expanded={open} onClick={() => { dialog.current?.showModal(); setOpen(true); }}><UiIcon name="menu" /></button>
        <div className="crm-breadcrumb"><Link href="/">Inicio</Link><span>/</span><span>{active?.label ?? "Asistente IA"}</span></div>
        <form action="/clientes" className="crm-search" role="search"><UiIcon name="search" /><input aria-label="Buscar clientes" name="q" placeholder="Buscar clientes…" /><button type="submit" aria-label="Buscar"><UiIcon name="arrow" /></button></form>
        <Link href="/asistente" className="crm-button crm-button-primary"><UiIcon name="activity" /> Asistente IA</Link>
      </header>
      <div id="crm-content" tabIndex={-1}>{children}</div>
    </div>
  </div>;
}
