"use client";

import { useState } from "react";
import { editProposalAction, deleteProposalAction } from "@/app/actions";
import { btnGain, btnGhost, inputCls } from "@/components/ui";

/** Editar / eliminar una propuesta (autor o admin). */
export function ProposalActions({
  groupId,
  proposalId,
  type,
  amountUsd,
  shares,
  thesis,
  canEdit,
}: {
  groupId: string;
  proposalId: string;
  type: "buy" | "sell";
  amountUsd: number | null;
  shares: number | null;
  thesis: string;
  canEdit: boolean;
}) {
  const [panel, setPanel] = useState<"none" | "edit" | "delete">("none");

  return (
    <div className="mt-3 border-t-2 border-line/20 pt-3">
      {panel === "none" && (
        <div className="flex gap-3 text-xs font-bold">
          {canEdit && (
            <button
              type="button"
              onClick={() => setPanel("edit")}
              className="text-ink2 hover:text-accent"
            >
              ✎ Editar
            </button>
          )}
          <button
            type="button"
            onClick={() => setPanel("delete")}
            className="text-ink2 hover:text-loss"
          >
            🗑 Eliminar
          </button>
        </div>
      )}

      {panel === "edit" && (
        <form
          action={editProposalAction.bind(null, groupId, proposalId)}
          className="grid gap-2"
        >
          <p className="text-xs font-extrabold text-muted">
            Editar propuesta (se reinicia la votación)
          </p>
          {type === "buy" ? (
            <input
              className={inputCls}
              name="amountUsd"
              type="number"
              min="1"
              step="0.01"
              defaultValue={amountUsd ?? undefined}
              placeholder="Monto a invertir (MXN)"
              required
            />
          ) : (
            <input
              className={inputCls}
              name="shares"
              type="number"
              min="0.0001"
              step="0.0001"
              defaultValue={shares ?? undefined}
              placeholder="Títulos a vender"
              required
            />
          )}
          <textarea
            className={`${inputCls} min-h-16`}
            name="thesis"
            defaultValue={thesis}
            required
          />
          <div className="flex gap-2">
            <button type="submit" className={`${btnGain} flex-1`}>
              Guardar cambios
            </button>
            <button
              type="button"
              onClick={() => setPanel("none")}
              className={btnGhost}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {panel === "delete" && (
        <form
          action={deleteProposalAction.bind(null, groupId, proposalId)}
          className="grid gap-2"
        >
          <p className="text-xs font-bold text-loss">
            ¿Eliminar esta propuesta? No se puede deshacer.
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-xl border-[2.5px] border-line bg-loss px-3 py-2 text-xs font-black text-white"
            >
              Sí, eliminar
            </button>
            <button
              type="button"
              onClick={() => setPanel("none")}
              className={btnGhost}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
