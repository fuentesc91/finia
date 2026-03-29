# Finia — Contexto del Proyecto

## Qué es Finia

App web para categorizar y visualizar gastos personales. El usuario registra gastos en lenguaje natural y Finia los organiza automáticamente.

---

## Autenticación

- Login seguro con **Firebase Auth**
- Todos los datos son por usuario (no compartidos)

---

## Funcionalidad principal: Registro de gastos

El usuario provee:
- **Descripción** del gasto (texto libre)
- **Monto**

Finia asigna automáticamente:
- **Categoría** — inferida a partir de la descripción
- **Fecha** — fecha actual al momento del registro

### Categorías (base)
Por definir, pero deben cubrir casos comunes: Alimentación, Transporte, Entretenimiento, Salud, Servicios, Hogar, Ropa, Otros.

---

## Visualización de gastos

### Vista principal: por mes
Los gastos se agrupan y muestran organizados por mes.

### Filtros (combinables entre sí)
- **Fecha**: mes completo / fecha exacta / rango de fechas
- **Categoría**: una o varias categorías simultáneamente

### Datos agregados
- **Total** del período/categoría seleccionada según los filtros activos

---

## Roadmap futuro (fuera de alcance inicial)
- Otros tipos de reportes y tablas
- Presupuestos por categoría
- Exportación de datos
