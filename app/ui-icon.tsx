const paths = {
  home: "m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  file: "M14 2H5v20h14V7zM14 2v6h5M8 12h8M8 16h6",
  calendar: "M8 2v4M16 2v4M3 10h18M3 4h18v18H3z",
  activity: "M2 12h4l3-9 5 18 3-9h5",
  wallet: "M3 6V4h16v4M3 8h18v13H3zM16 13h5v4h-5z",
  box: "m12 2 10 5v10l-10 5L2 17V7zM2 7l10 5 10-5M12 12v10M7 4.5l10 5",
  clock: "M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  calculator: "M5 2h14v20H5zM8 5h8v4H8zM8 13h1M15 13h1M8 17h1M15 17h1",
  tag: "M3 3h9l9 9-9 9-9-9zM7 7h.01",
  book: "M12 5v17M12 5C9 2 4 2 2 3v17c3-1 7-1 10 2 3-3 7-3 10-2V3c-2-1-7-1-10 2",
  check: "m8 12 3 3 5-6M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  briefcase: "M8 6V2h8v4M2 6h20v16H2zM2 11l10 4 10-4M12 12v5",
  chart: "M3 14h4v8H3zM10 8h4v14h-4zM17 2h4v20h-4z",
  mail: "M2 4h20v16H2zM2 4l10 9L22 4",
  repeat: "m17 2 4 4-4 4M21 6H7a5 5 0 0 0-5 5M7 22l-4-4 4-4M3 18h14a5 5 0 0 0 5-5",
  arrow: "m9 5 7 7-7 7",
  plus: "M12 4v16M4 12h16",
  menu: "M3 6h18M3 12h18M3 18h18",
  close: "m6 6 12 12M6 18 18 6",
  logout: "M9 3H3v18h6M8 12h14m-5-5 5 5-5 5",
  search: "m21 21-6-6M17 9a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
} as const;

export type IconName = keyof typeof paths;

export function UiIcon({ name, className = "" }: { name: IconName; className?: string }) {
  return <svg className={`ui-icon ${className}`} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
