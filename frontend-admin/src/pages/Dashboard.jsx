import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin, Typography, Space, Tag, Progress, Button, Table, message } from 'antd';
import { 
  DollarOutlined, 
  UserOutlined, 
  TeamOutlined, 
  FileTextOutlined,
  RiseOutlined,
  FallOutlined,
  ClockCircleOutlined,
  WalletOutlined,
  ShopOutlined,
  PlusOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

const { Title, Text } = Typography;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    cargarDashboard();
  }, []);

  const cargarDashboard = async () => {
    try {
      setLoading(true);
      console.log('📊 Cargando datos del dashboard...');
      const response = await api.get('/dashboard');
      console.log('📊 Datos recibidos:', response.data);
      setDashboardData(response.data);
    } catch (err) {
      console.error('Error cargando dashboard:', err);
      message.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" description="Cargando datos..." />
      </div>
    );
  }

  const stats = dashboardData?.stats || {};
  const ultimosPrestamos = dashboardData?.ultimosPrestamos || [];
  const cobradoresRecientes = dashboardData?.cobradoresRecientes || [];

  const totalCartera = stats.totalCartera || 0;
  const totalRecaudado = stats.totalRecaudado || 0;
  const porCobrar = totalCartera - totalRecaudado;
  const porcentajeCobro = totalCartera > 0 ? (totalRecaudado / totalCartera) * 100 : 0;

  const prestamosColumns = [
    { title: 'Cliente', dataIndex: ['cliente', 'nombre'], key: 'cliente', render: (_, record) => record.cliente?.nombre || 'N/A' },
    { title: 'Capital', dataIndex: 'capital', key: 'capital', render: (val) => `$${val?.toLocaleString() || 0}` },
    { title: 'Total', dataIndex: 'total', key: 'total', render: (val) => `$${val?.toLocaleString() || 0}` },
    { 
      title: 'Estado', 
      dataIndex: 'estado', 
      key: 'estado',
      render: (estado) => (
        <Tag color={estado === 'pagado' ? 'green' : estado === 'activo' ? 'blue' : 'red'}>
          {estado?.toUpperCase() || 'ACTIVO'}
        </Tag>
      )
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => navigate(`/prestamos/${record._id}`)} size="small">
          Ver
        </Button>
      )
    }
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0a0f2a 0%, #0a0a1a 100%)', borderRadius: 16, padding: '24px 32px', marginBottom: 24, color: 'white' }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={2} style={{ color: '#00d4ff', marginBottom: 8 }}>Panel de Control</Title>
            <Space>
              <ClockCircleOutlined />
              <Text>{new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Tarjetas principales */}
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Cartera Total" value={totalCartera} precision={0} prefix={<DollarOutlined />} valueStyle={{ color: '#00d4ff' }} suffix="COP" />
            <Progress percent={porcentajeCobro} strokeColor="#52c41a" size="small" />
            <Text type="secondary">{porcentajeCobro.toFixed(1)}% cobrado</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Total Recaudado" value={totalRecaudado} precision={0} prefix={<RiseOutlined />} valueStyle={{ color: '#52c41a' }} suffix="COP" />
            <Tag color="success" style={{ marginTop: 8 }}>{stats.prestamosPagados || 0} préstamos pagados</Tag>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Por Cobrar" value={porCobrar} precision={0} prefix={<FallOutlined />} valueStyle={{ color: '#ff4d4f' }} suffix="COP" />
            <Text type="secondary">{stats.prestamosActivos || 0} préstamos activos</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Interés Generado" value={stats.interesGenerado || 0} precision={0} prefix={<WalletOutlined />} valueStyle={{ color: '#7b2cbf' }} suffix="COP" />
            <Tag color="processing">ROI: {totalCartera > 0 ? ((stats.interesGenerado / totalCartera) * 100).toFixed(2) : 0}%</Tag>
          </Card>
        </Col>
      </Row>

      {/* Segunda fila */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Préstamos Activos" value={stats.prestamosActivos || 0} prefix={<FileTextOutlined />} />
            <div><Tag color="green">Pagados: {stats.prestamosPagados || 0}</Tag><Tag color="red">Vencidos: {stats.prestamosVencidos || 0}</Tag></div>
            <Button type="link" style={{ marginTop: 8, padding: 0 }} onClick={() => navigate('/prestamos')}>Ver todos →</Button>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Total Clientes" value={stats.totalClientes || 0} prefix={<UserOutlined />} />
            <Button type="link" style={{ marginTop: 8, padding: 0 }} onClick={() => navigate('/clientes')}>Gestionar clientes →</Button>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Total Cobradores" value={stats.totalCobradores || 0} prefix={<TeamOutlined />} />
            <Button type="link" style={{ marginTop: 8, padding: 0 }} onClick={() => navigate('/cobradores')}>Gestionar cobradores →</Button>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Total Préstamos" value={stats.totalPrestamos || 0} prefix={<ShopOutlined />} />
            <Button type="primary" icon={<PlusOutlined />} style={{ marginTop: 8 }} onClick={() => navigate('/prestamos/nuevo')} size="small">Nuevo Préstamo</Button>
          </Card>
        </Col>
      </Row>

      {/* Últimos préstamos */}
      {ultimosPrestamos.length > 0 && (
        <Row style={{ marginTop: 24 }}>
          <Col span={24}>
            <Card title="Últimos Préstamos">
              <Table columns={prestamosColumns} dataSource={ultimosPrestamos} rowKey="_id" pagination={{ pageSize: 5 }} size="small" />
            </Card>
          </Col>
        </Row>
      )}

      {/* Cobradores recientes */}
      {cobradoresRecientes.length > 0 && (
        <Row style={{ marginTop: 24 }}>
          <Col span={24}>
            <Card title="Cobradores Activos">
              <Row gutter={[16, 16]}>
                {cobradoresRecientes.map(cobrador => (
                  <Col key={cobrador._id} xs={24} sm={12} lg={8}>
                    <Card size="small" style={{ background: '#f5f5f5' }}>
                      <Space>
                        <TeamOutlined style={{ color: '#00aa66' }} />
                        <div>
                          <div><strong>{cobrador.nombre}</strong></div>
                          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{cobrador.email}</div>
                          <div>📞 {cobrador.telefono || 'N/A'}</div>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default Dashboard;