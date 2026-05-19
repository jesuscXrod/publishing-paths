# Publishing Paths

Herramienta interna diseñada para automatizar y estandarizar la generación de rutas (paths) de publicación en **Adobe Experience Manager (AEM)** para vehículos Ford y Lincoln.

## Características
- **Generación Automática:** Crea paths de Assets, VDM, CF, XF y Sites basados en la selección de marca y región.
- **Validación por Mercado:** Filtra modelos específicos según la región (ej. US vs CA).
- **Integración con Firebase:** Autenticación de usuarios y base de datos dinámica para el catálogo de vehículos.

## Requisitos
- Cuenta de Firebase configurada con Firestore y Auth.
- Credenciales de acceso autorizadas.

## Estructura del Proyecto
- `index.html`: Interfaz de usuario principal.
- `js/app.js`: Lógica principal y conexión con Firebase.
- `js/migrate.js`: Utilidad para migrar datos locales a Firestore.
- `js/app-data.js`: Fuente de datos estática original.

## Configuración
El proyecto utiliza Firebase. Asegúrate de que las reglas de seguridad de Firestore permitan el acceso solo a usuarios autenticados.

---
*Proyecto de uso interno.*