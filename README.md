# Backend - Oh Sansi

Backend del proyecto Oh Sansi, desarrollado con Node.js, Express, TypeScript y Prisma ORM.

## Instalación y configuración

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/elCheetah/back_oh_sansi.git
   cd back_oh_sansi
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Configurar el archivo .env con tu base de datos (PostgreSQL opcional para pruebas):
   ```env
   DATABASE_URL="postgresql://usuario:password@localhost:5432/oh_sansi"
   PORT=3000
   ```

4. Ejecutar migraciones e inicializar Prisma:
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

> **Nota:** PostgreSQL es opcional si Supabase no responde; puedes usarlo localmente para pruebas de desarrollo.

## Desarrollo

1. Ejecutar en modo desarrollo con recarga automática:
   ```bash
   npm run dev
   ```

2. Compilar TypeScript antes de subir cambios:
   ```bash
   npx tsc
   ```
   ó
   ```bash
   npm run build
   ```
   Esto genera la carpeta `dist/` lista para producción.

## Git - Subir cambios y manejo de versiones

1. Ver cambios actuales:
   ```bash
   git status
   ```

2. Agregar cambios para commit:
   ```bash
   git add .
   ```
   Usa esto para preparar todos los cambios que quieras subir.

3. Guardar cambios en stash temporalmente:
   ```bash
   git stash
   ```
   Útil si necesitas cambiar de rama sin perder cambios no comiteados.

4. Recuperar cambios del stash:
   ```bash
   git stash pop
   ```
   Aplica los cambios guardados nuevamente en tu rama.

5. Hacer commit de tus cambios:
   ```bash
   git commit -m "Mensaje descriptivo del cambio"
   ```

6. Subir cambios al repositorio remoto:
   ```bash
   git push origin nombre-de-la-rama
   ```

7. Actualizar tu rama con cambios remotos:
   ```bash
   git pull
   ```
   Mantiene tu rama sincronizada con la rama remota antes de subir nuevos cambios.

8. Quita node_modules del staging en caso de haber errores en el deploy 
   ```bash
   git rm -r --cached node_modules
   ```
