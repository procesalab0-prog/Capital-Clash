"use client";

import { useState } from "react";
import { updateGroupAction, deleteGroupAction } from "@/app/actions";
import { btnGhost, btnPrimary, inputCls } from "@/components/ui";
import type { GroupMode } from "@/lib/types";

/** Botones de admin para editar o eliminar el grupo (con confirmación). */
export function GroupAdminMenu({
  groupId,
  name,
  mode,
}: {
  groupId: string;
  name: string;
  mode: GroupMode;
}) {
  const [panel, setPanel] = useState<"none" | "edit" | "delete">("none");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setPanel(panel === "none" ? "edit" : "none")}
        className="rounded-lg border-[2.5px] border-line px-3 py-1.5 text-sm font-bold text-ink transition hover:border-accent hover:text-accent"
        title="Administrar grupo"
      >
        ⚙ Editar
      </button>

      {panel !== "none" && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setPanel("none")}
            aria-hidden
          />
          <div className="hard-shadow absolute right-0 z-40 mt-2 w-72 rounded-2xl border-[3px] border-line bg-surface p-4">
            {panel === "edit" ? (
              <form action={updateGroupAction.bind(null, groupId)} className="grid gap-3">
                <p className="text-sm font-extrabold">Editar grupo</p>
                <input
                  name="name"
                  defaultValue={name}
                  className={inputCls}
                  placeholder="Nombre del grupo"
                  required
                />
                <select name="mode" defaultValue={mode} className={inputCls}>
                  <option value="simulado">Simulado (capital virtual)</option>
                  <option value="real">Dinero real (registro)</option>
                </select>
                <div className="flex gap-2">
                  <button type="submit" className={`${btnPrimary} flex-1`}>
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanel("delete")}
                    className="rounded-xl border-[2.5px] border-loss px-3 py-2.5 text-sm font-extrabold text-loss transition hover:bg-loss hover:text-white"
                  >
                    Eliminar
                  </button>
                </div>
              </form>
            ) : (
              <form action={deleteGroupAction.bind(null, groupId)} className="grid gap-3">
                <p className="text-sm font-extrabold text-loss">
                  ¿Eliminar el grupo?
                </p>
                <p className="text-xs font-semibold text-ink2">
                  Se borrará el grupo <b>{name}</b> con todas sus temporadas,
                  propuestas e historial. Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPanel("edit")}
                    className={`${btnGhost} flex-1`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl border-[3px] border-line bg-loss px-4 py-2.5 text-sm font-black text-white transition active:translate-x-0.5 active:translate-y-0.5"
                  >
                    Sí, eliminar
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
