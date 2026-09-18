"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TrainerNotification } from "@ptapp/shared";

export function NotificationBell({ initial }: { initial: TrainerNotification[] }) {
  const [notifications, setNotifications] = useState(initial);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const supabase = createClient();

    async function refresh() {
      const { data } = await supabase
        .from("trainer_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setNotifications(data);
    }

    const interval = setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleOpen() {
    setOpen((v) => !v);
    if (unread === 0) return;
    const supabase = createClient();
    const ids = notifications.filter((n) => !n.read).map((n) => n.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("trainer_notifications").update({ read: true }).in("id", ids);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-base-300 transition hover:bg-base-800 hover:text-base-100"
        aria-label="Notificações"
      >
        <span className="text-lg leading-none">🔔</span>
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-volt px-1 text-[10px] font-bold text-base-950">
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute left-0 top-11 z-30 w-72 rounded-xl border border-base-700 bg-base-900 p-2 shadow-xl">
          {notifications.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-base-400">Nenhuma notificação ainda.</p>
          ) : (
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {notifications.map((n) => (
                <div key={n.id} className="rounded-lg px-3 py-2 text-sm text-base-200 hover:bg-base-800">
                  <p>{n.message}</p>
                  <p className="mt-0.5 text-xs text-base-500">
                    {new Date(n.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
