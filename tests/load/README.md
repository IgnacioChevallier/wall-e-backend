# Wall-E Load Testing

Sistema de pruebas de carga y estrés para la API de Wall-E usando Locust.

## 📋 Requisitos

- Python 3.11+
- Wall-E backend ejecutándose
- Eva-bank service ejecutándose
- PostgreSQL database

## 🚀 Instalación

```bash
# Instalar dependencias Python
cd tests/load
pip install -r requirements.txt

# Configurar variables de entorno
cp env.example .env
# Editar .env con tu configuración
```

## 🧪 Tipos de Tests

### Load Testing (Carga Normal)
Simula uso normal con 50-200 usuarios concurrentes:

```bash
# Ejecución simple
locust -f load_test.py --host=http://localhost:3000

# Ejecución automatizada
./scripts/run_load_test.sh

# Con parámetros específicos
locust -f load_test.py --host=http://localhost:3000 --users=100 --spawn-rate=10 --run-time=10m --headless
```

### Stress Testing (Prueba de Estrés)
Encuentra el punto de quiebre con 500-2000+ usuarios:

```bash
# Ejecución simple
locust -f stress_test.py --host=http://localhost:3000

# Ejecución automatizada
./scripts/run_stress_test.sh

# Con parámetros específicos
locust -f stress_test.py --host=http://localhost:3000 --users=1000 --spawn-rate=50 --run-time=15m --headless
```

## 🔧 Configuración

### Variables de Entorno (.env)
```bash
API_HOST=http://localhost:3000
LOAD_TEST_USERS=100
STRESS_TEST_USERS=1000
DATABASE_URL=postgresql://postgres:password@localhost:5432/walle_db
```

### Journeys de Usuario

1. **NewUserJourney**: Registro → Login → Balance → Cargar dinero
2. **ExistingUserJourney**: Login → Transferencias P2P → Historial
3. **FrequentUserJourney**: Múltiples transferencias → DEBIN requests
4. **DebinMassiveLoad**: Carga masiva de DEBIN (solo stress testing)

## 📊 Reportes

Los tests generan reportes automáticos:

- **HTML**: `reports/load_test_TIMESTAMP.html`
- **CSV**: `reports/load_test_TIMESTAMP_stats.csv`
- **Logs**: `reports/load_test_TIMESTAMP.log`

### Ver reportes en tiempo real
```bash
# Abrir interfaz web de Locust
locust -f load_test.py --host=http://localhost:3000
# Ir a http://localhost:8089
```

## 🧹 Limpieza de Datos

```bash
# Limpiar datos de test de la última hora
python3 scripts/cleanup_test_data.py --hours=1

# Limpiar transacciones de más de 7 días
python3 scripts/cleanup_test_data.py --days=7

# Ver estadísticas sin limpiar
python3 scripts/cleanup_test_data.py --stats-only
```

## 🎯 Endpoints Testeados

- `POST /auth/register` - Registro de usuarios
- `POST /auth/login` - Autenticación
- `GET /wallet/balance` - Consulta de saldo
- `POST /wallet/topup/manual` - Carga manual de dinero
- `POST /wallet/topup/debin` - Solicitudes DEBIN
- `POST /transactions/p2p` - Transferencias P2P
- `GET /transactions` - Historial de transacciones

## 📈 Métricas y Umbrales

### Load Testing
- **Tiempo de respuesta promedio**: < 500ms
- **Percentil 95**: < 1000ms
- **Tasa de fallas**: < 1%
- **Requests por segundo**: > 50 RPS

### Stress Testing
- **Tiempo de respuesta promedio**: < 5000ms
- **Tasa de fallas**: < 10%
- **CPU**: < 90%
- **Memoria**: < 85%

## 🔄 CI/CD Integration

Los tests se ejecutan automáticamente en GitHub Actions:

- **Trigger manual**: Workflow dispatch con parámetros
- **Schedule**: Diariamente a las 2 AM UTC
- **Reportes**: Se suben como artifacts

## 🛠️ Troubleshooting

### Error de conexión
```bash
# Verificar que los servicios estén ejecutándose
curl http://localhost:3000/health
curl http://localhost:3001/health
```

### Error de autenticación
```bash
# Verificar JWT_SECRET en variables de entorno
echo $JWT_SECRET
```

### Base de datos llena
```bash
# Limpiar datos de test
python3 scripts/cleanup_test_data.py --hours=24
```

## 📝 Ejemplo de Uso Rápido

```bash
# 1. Iniciar servicios
npm run start:dev  # En wall-e-backend/
npm start          # En eva-bank/

# 2. Ejecutar test de carga
cd tests/load
./scripts/run_load_test.sh

# 3. Ver reporte
open reports/load_test_*.html

# 4. Limpiar datos
python3 scripts/cleanup_test_data.py --hours=1
```

## 🚨 Advertencias

- **Stress testing** puede afectar el rendimiento del sistema
- Usar solo en entornos de **desarrollo/testing**
- Monitorear recursos del sistema durante stress tests
- Limpiar datos de test regularmente 