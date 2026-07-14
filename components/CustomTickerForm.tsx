"use client";

import { useState } from "react";
import { createCustomTickerAction } from "@/app/actions";
import { btnPrimary, Card, inputCls } from "@/components/ui";

/**
 * "¿No aparece en el mercado?" — cualquier miembro puede dar de alta una
 * acción con símbolo, nombre y precio propios (útil para una empresa
 * privada, una broma del grupo, o cualquier cosa que FMP no cubra).
 */
export function CustomTickerForm({ groupId }: { groupId: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-bold text-accent hover:underline"
      >
        + ¿No aparece en el mercado? Crea tu propia acción
      </button>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-extrabold">Acción personalizada</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-bold text-muted hover:text-ink"
        >
          Cancelar
        </button>
      </div>
      <form
        action={createCustomTickerAction.bind(null, groupId)}
        className="grid gap-3 sm:grid-cols-3"
      >
        <input
          name="ticker"
          className={`${inputCls} uppercase`}
          placeholder="Símbolo (ej. MIEMPRESA)"
          maxLength={10}
          required
        />
        <input
          name="companyName"
          className={inputCls}
          placeholder="Nombre de la empresa"
          required
        />
        <input
          name="priceUsd"
          type="number"
          min="0.01"
          step="0.01"
          className={inputCls}
          placeholder="Precio (USD)"
          required
        />
        <button type="submit" className={`${btnPrimary} sm:col-span-3`}>
          Agregar al mercado
        </button>
      </form>
      <p className="mt-2 text-xs font-semibold text-muted">
        Su precio queda fijo (no se cotiza en ningún lado) hasta que el grupo
        decida actualizarlo.
      </p>
    </Card>
  );
}
