// ============================================================================
// COMPONENTE: CARD (TARJETA DE CONTENIDO)
// ----------------------------------------------------------------------------
// Tarjeta base del dashboard: contenedor con borde, sombra sutil y modo
// oscuro/claro automatico. Se usa para KPIs, tablas, graficos y formularios.
//
// EJEMPLO:
//   <Card>
//     <h3 className="text-sm font-semibold text-gray-700 dark:text-hueso-100">KPI</h3>
//     <p className="text-3xl font-bold">128</p>
//   </Card>
// ============================================================================

import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors duration-200 dark:border-white/10 dark:bg-antracita-800 ${className}`}
    >
      {children}
    </div>
  );
}
