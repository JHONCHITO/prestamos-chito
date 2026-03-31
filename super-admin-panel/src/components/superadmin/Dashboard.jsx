import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Spin, 
  Alert, 
  Typography, 
  Button, 
  Space
} from 'antd';
import { 
  ShopOutlined, 
  UserOutlined, 
  DollarOutlined, 
  TeamOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';
import { getSuperAdminStats } from '../../api/superadmin';

const { Title, Text } = Typography;

const Dashboard = ({ notificaciones = [] }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    oficinas: 0,
    clientes: 0,
    cobradores: 0,
    prestamos: 0,
    carteraTotal: 0,
    prestamosActivos: 0,
    prestamosPagados: 0,
    prestamosVencidos: 0
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      setLoading(true);
      const data = await getSuperAdminStats();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
      <Spin size="large" tip="Cargando estadísticas galácticas..." />
    </div>
  );
  
  if (error) return <Alert message="Error" description={error} type="error" showIcon />;

  const prestamosData = [
    { name: 'Activos', value: stats.prestamosActivos, color: '#52c41a' },
    { name: 'Pagados', value: stats.prestamosPagados, color: '#1890ff' },
    { name: 'Vencidos', value: stats.prestamosVencidos, color: '#892716' }
  ];

  const distribucionData = [
    { name: 'Oficinas', cantidad: stats.oficinas },
    { name: 'Cobradores', cantidad: stats.cobradores },
    { name: 'Clientes', cantidad: stats.clientes },
    { name: 'Préstamos', cantidad: stats.prestamos }
  ];

  const trendData = [
    { mes: 'Ene', prestamos: 4, cobros: 3 },
    { mes: 'Feb', prestamos: 6, cobros: 4 },
    { mes: 'Mar', prestamos: 8, cobros: 6 },
    { mes: 'Abr', prestamos: 12, cobros: 9 },
    { mes: 'May', prestamos: 10, cobros: 8 },
    { mes: 'Jun', prestamos: 15, cobros: 12 },
  ];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <Title level={2} style={{ 
          background: 'linear-gradient(135deg, #f77987, #6a84db)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 8
        }}>
          Panel de Control super-admin-chito
        </Title>
        <Text type="secondary">Bienvenido al sistema de administrador chito galáctico</Text>
      </div>

      {notificaciones.length > 0 && (
        <div style={{ 
          marginBottom: 16, 
          padding: '8px 16px', 
          background: 'rgba(255,77,79,0.1)', 
          borderRadius: 8,
          borderLeft: '3px solid #ff4d4f'
        }}>
          <Space>
            <WarningOutlined style={{ color: '#ff4d4f' }} />
            <Text type="secondary">
              {notificaciones.length} empresa{notificaciones.length > 1 ? 's' : ''} con pagos pendientes.
              <Button type="link" size="small" onClick={() => window.location.href = '/superadmin/reportes'}>
                Ver detalles →
              </Button>
            </Text>
          </Space>
        </div>
      )}

      {/* Tarjetas de estadísticas */}
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" style={{ borderRadius: 16 }}>
            <Statistic
              title="Oficinas"
              value={stats.oficinas}
              prefix={<ShopOutlined />}
              styles={{ content: { color: '#00d4ff', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" style={{ borderRadius: 16 }}>
            <Statistic
              title="Cobradores"
              value={stats.cobradores}
              prefix={<TeamOutlined />}
              styles={{ content: { color: '#2c40bf', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" style={{ borderRadius: 16 }}>
            <Statistic
              title="Clientes"
              value={stats.clientes}
              prefix={<UserOutlined />}
              styles={{ content: { color: '#5e0656', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" style={{ borderRadius: 16 }}>
            <Statistic
              title="Préstamos Totales"
              value={stats.prestamos}
              prefix={<FileTextOutlined />}
              styles={{ content: { color: '#fa1634', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Segunda fila */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card title="Cartera Total" className="stat-card" style={{ borderRadius: 16 }}>
            <Statistic
              value={stats.carteraTotal}
              precision={2}
              prefix={<DollarOutlined />}
              suffix="COP"
              styles={{ content: { color: '#cf1322', fontSize: '28px', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card title="Préstamos Activos" className="stat-card" style={{ borderRadius: 16 }}>
            <Statistic
              value={stats.prestamosActivos}
              prefix={<CheckCircleOutlined />}
              styles={{ content: { color: '#35850e', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card title="Préstamos Vencidos" className="stat-card" style={{ borderRadius: 16 }}>
            <Statistic
              value={stats.prestamosVencidos}
              prefix={<CloseCircleOutlined />}
              styles={{ content: { color: '#f5222d', fontWeight: 'bold' } }}
            />
          </Card>
        </Col>
      </Row>

      {/* Gráficos – NUEVA INTERFAZ */}
      {/* Fila 1: Barras horizontales + Área apilada */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        {/* Barras horizontales: Distribución de Préstamos */}
        <Col xs={24} lg={12}>
          <Card
            title="Distribución de Préstamos"
            style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={prestamosData}
                layout="vertical"
                margin={{ top: 10, right: 10, left: 40, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,0,0,0.06)"
                  horizontal={false}
                  vertical
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: '#595959' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#595959' }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  formatter={(value, name) => [`${value}`, name]}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #773c3c',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#9f4e4e' }} />
                <Bar
                  dataKey="value"
                  name="Cantidad"
                  radius={[8, 8, 8, 8]}
                >
                  {prestamosData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Área apilada: Préstamos vs Cobros */}
        <Col xs={24} lg={12}>
          <Card
            title="Préstamos vs Cobros (Acumulado)"
            style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          >
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={trendData}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,0,0,0.06)"
                  horizontal
                  vertical={false}
                />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 12, fill: '#553939' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#5c0909' }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  formatter={(value, name) => {
                    const label = name === 'prestamos' ? 'Préstamos' : 'Cobros';
                    return [value, label];
                  }}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #3a4b5a',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#595959' }} />
                <defs>
                  <linearGradient id="areaPrestamos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#141a83" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="areaCobros" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0b1365" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#52c41a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="prestamos"
                  name="Préstamos"
                  stroke="#3f11bf"
                  strokeWidth={2}
                  fill="url(#areaPrestamos)"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="cobros"
                  name="Cobros"
                  stroke="#bc59a8"
                  strokeWidth={2}
                  fill="url(#areaCobros)"
                  stackId="1"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Fila 2: Líneas suaves + Barras agrupadas */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        {/* Líneas suaves: Préstamos y Cobros */}
        <Col xs={24} lg={12}>
          <Card
            title="Tendencia Detallada"
            style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={trendData}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,0,0,0.06)"
                  horizontal
                  vertical={false}
                />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 12, fill: '#4f1a1a' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#711d1d' }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  formatter={(value, name) => {
                    const label = name === 'cobros' ? 'Cobros' : 'Préstamos';
                    return [value, label];
                  }}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #9f2727',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#595959' }} />
                <Line
                  type="monotone"
                  dataKey="prestamos"
                  name="Préstamos"
                  stroke="#0b5b6b"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#1b0b93' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="cobros"
                  name="Cobros"
                  stroke="#ddf05c"
                  strokeWidth={2}
                  dot={{ r: 4, fill: '#1a64c4' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Barras agrupadas: Distribución General */}
        <Col xs={24} lg={12}>
          <Card
            title="Distribución General"
            style={{ borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={distribucionData}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,0,0,0.06)"
                  horizontal
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: '#595959' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#595959' }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  formatter={(value) => [`${value}`, 'Cantidad']}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e8e8e8',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#595959' }} />
                <Bar
                  dataKey="cantidad"
                  name="Cantidad"
                  fill="#1db7e6"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;