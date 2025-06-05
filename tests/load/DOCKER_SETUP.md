# Load Testing con Docker

Este setup te permite ejecutar tests de carga sin instalar dependencias Python en tu máquina local.

## Cómo usar

1. **Levantar todo el entorno de load testing:**
   ```bash
   cd tests/load
   docker-compose -f docker-compose.load-test.yml up --build
   ```

2. **Acceder a la interfaz web de Locust:**
   - Abre tu navegador en: http://localhost:8089
   - Configura el número de usuarios y spawn rate
   - Inicia los tests

3. **Puertos utilizados:**
   - `8089`: Locust Web UI
   - `3003`: Backend app (para load testing)
   - `3004`: Eva Bank service
   - `5434`: PostgreSQL database

4. **Ejecutar tests específicos:**
   ```bash
   # Solo levantar la infraestructura (sin Locust UI)
   docker-compose -f docker-compose.load-test.yml up db app eva-bank -d
   
   # Ejecutar test específico
   docker-compose -f docker-compose.load-test.yml run --rm load-test python load_test.py
   ```

5. **Limpiar al terminar:**
   ```bash
   docker-compose -f docker-compose.load-test.yml down -v
   ```

## Ventajas de este setup

- ✅ No necesitas instalar Python ni dependencias localmente
- ✅ Entorno completamente aislado para testing
- ✅ Base de datos separada para no afectar desarrollo
- ✅ Fácil de limpiar y reproducir
- ✅ Misma configuración en cualquier máquina 