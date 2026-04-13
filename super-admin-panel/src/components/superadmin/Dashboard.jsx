import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowRightOutlined,
  BankOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  ReloadOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { getOficinas, getSuperAdminStats } from '../../api/superadmin';

const { Title, Text } = Typography;

const currencyFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('es-CO');

const surfaceStyle = {
  borderRadius: 20,
  border: '1px solid #d9e2ec',
  boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
};

const getOfficeStatusColor = (estado) => (estado ? 'green' : 'default');

const Dashboard = ({ notificaciones = [] }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    oficinas: 0,
    clientes: 0,
    cobradores: 0,
    prestamos: 0,
    carteraTotal: 0,
    prestamosActivos: 0,
    prestamosPagados: 0,
    prestamosVencidos: 0,
  });
  const [oficinas, setOficinas] = useState([]);

  useEffect(() => {
    cargarDashboard();
  }, []);

  const cargarDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, oficinasData] = await Promise.all([
        getSuperAdminStats(),
        getOficinas(),
      ]);

      setStats(statsData || {});
      setOficinas(Array.isArray(oficinasData) ? oficinasData : []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'No se pudo cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 420,
        }}
      >
        <Spin size="large" tip="Cargando resumen ejecutivo..." />
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="No se pudo cargar el dashboard"
        description={error}
        type="error"
        showIcon
      />
    );
  }

  const oficinasActivas = oficinas.filter((oficina) => oficina.estado).length;
  const oficinasInactivas = oficinas.length - oficinasActivas;
  const carteraPromedio = stats.oficinas
    ? Math.round((stats.carteraTotal || 0) / stats.oficinas)
    : 0;
  const clientesPorCobrador = stats.cobradores
    ? (stats.clientes / stats.cobradores).toFixed(1)
    : '0.0';
  const morosidad = stats.prestamos
    ? Math.round((stats.prestamosVencidos / stats.prestamos) * 100)
    : 0;
  const recuperacion = stats.prestamos
    ? Math.round((stats.prestamosPagados / stats.prestamos) * 100)
    : 0;

  const kpis = [
    {
      title: 'Oficinas operando',
      value: stats.oficinas,
      icon: <BankOutlined style={{ color: '#0f766e' }} />,
      detail: `${oficinasActivas} activas`,
    },
    {
      title: 'Cartera vigente',
      value: currencyFormatter.format(stats.carteraTotal || 0),
      icon: <DollarOutlined style={{ color: '#1d4ed8' }} />,
      detail: `Promedio ${currencyFormatter.format(carteraPromedio)} por oficina`,
    },
    {
      title: 'Préstamos activos',
      value: numberFormatter.format(stats.prestamosActivos || 0),
      icon: <ClockCircleOutlined style={{ color: '#9a3412' }} />,
      detail: `${numberFormatter.format(stats.prestamos || 0)} préstamos registrados`,
    },
    {
      title: 'Clientes atendidos',
      value: numberFormatter.format(stats.clientes || 0),
      icon: <UserOutlined style={{ color: '#475569' }} />,
      detail: `${clientesPorCobrador} clientes por cobrador`,
    },
  ];

  const healthCards = [
    {
      title: 'Recuperación de cartera',
      value: `${recuperacion}%`,
      extra: `${numberFormatter.format(stats.prestamosPagados || 0)} préstamos pagados`,
      tone: '#0f766e',
      progressStroke: '#0f766e',
      progressTrail: '#d1fae5',
    },
    {
      title: 'Riesgo de mora',
      value: `${morosidad}%`,
      extra: `${numberFormatter.format(stats.prestamosVencidos || 0)} préstamos vencidos`,
      tone: morosidad > 15 ? '#b91c1c' : '#9a3412',
      progressStroke: morosidad > 15 ? '#dc2626' : '#f59e0b',
      progressTrail: morosidad > 15 ? '#fee2e2' : '#fef3c7',
    },
    {
      title: 'Cobertura de campo',
      value: numberFormatter.format(stats.cobradores || 0),
      extra: `${numberFormatter.format(stats.clientes || 0)} clientes en gestión`,
      tone: '#334155',
      progressStroke: '#334155',
      progressTrail: '#e2e8f0',
    },
  ];

  const columnasOficinas = [
    {
      title: 'Oficina',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{record.nombre}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.tenantId}
          </Text>
        </div>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      width: 120,
      render: (estado) => (
        <Tag color={getOfficeStatusColor(estado)} style={{ borderRadius: 999 }}>
          {estado ? 'Activa' : 'Inactiva'}
        </Tag>
      ),
    },
    {
      title: 'Creación',
      dataIndex: 'fechaCreacion',
      key: 'fechaCreacion',
      width: 160,
      render: (value) =>
        value
          ? new Date(value).toLocaleDateString('es-CO', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : 'Sin fecha',
    },
  ];

  return (
    <div>
      <Card
        style={{
          ...surfaceStyle,
          marginBottom: 24,
          background:
            'linear-gradient(135deg, #f8fafc 0%, #eef2f7 45%, #e2e8f0 100%)',
        }}
        styles={{ body: { padding: 28 } }}
      >
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} lg={16}>
            <Tag
              bordered={false}
              style={{
                marginBottom: 14,
                padding: '6px 12px',
                borderRadius: 999,
                color: '#0f172a',
                background: '#dbeafe',
                fontWeight: 600,
              }}
            >
              Vista ejecutiva
            </Tag>
            <Title level={2} style={{ margin: 0, color: '#0f172a' }}>
              Resumen general del negocio
            </Title>
            <Text style={{ display: 'block', marginTop: 10, color: '#475569', fontSize: 15 }}>
              Este panel concentra el estado actual de oficinas, cartera y operación de campo
              para que el superadmin vea rápido dónde intervenir.
            </Text>
          </Col>
          <Col xs={24} lg={8}>
            <div
              style={{
                height: '100%',
                padding: 20,
                borderRadius: 18,
                background: 'rgba(255, 255, 255, 0.78)',
                border: '1px solid #dbe3ec',
              }}
            >
              <Text style={{ color: '#64748b', fontSize: 13 }}>Alertas de seguimiento</Text>
              <div style={{ marginTop: 8, fontSize: 34, fontWeight: 700, color: '#0f172a' }}>
                {notificaciones.length}
              </div>
              <Text style={{ color: '#475569' }}>
                {notificaciones.length === 1
                  ? 'empresa con pago pendiente'
                  : 'empresas con pago pendiente'}
              </Text>
              <div style={{ marginTop: 18 }}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={cargarDashboard}
                  style={{
                    borderRadius: 10,
                    borderColor: '#cbd5e1',
                    color: '#0f172a',
                    fontWeight: 600,
                  }}
                >
                  Actualizar datos
                </Button>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      <Row gutter={[20, 20]}>
        {kpis.map((item) => (
          <Col xs={24} sm={12} xl={6} key={item.title}>
            <Card style={surfaceStyle} styles={{ body: { padding: 22 } }}>
              <Space size={14} align="start">
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: 20,
                  }}
                >
                  {item.icon}
                </div>
                <div>
                  <Text style={{ color: '#64748b', fontSize: 13 }}>{item.title}</Text>
                  <div style={{ marginTop: 6, fontSize: 28, fontWeight: 700, color: '#0f172a' }}>
                    {item.value}
                  </div>
                  <Text style={{ color: '#475569', fontSize: 13 }}>{item.detail}</Text>
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[20, 20]} style={{ marginTop: 4 }}>
        {healthCards.map((card) => (
          <Col xs={24} lg={8} key={card.title}>
            <Card style={surfaceStyle} styles={{ body: { padding: 24 } }}>
              <Text style={{ color: '#64748b', fontSize: 13 }}>{card.title}</Text>
              <div style={{ marginTop: 10, fontSize: 30, fontWeight: 700, color: card.tone }}>
                {card.value}
              </div>
              <Text style={{ color: '#475569' }}>{card.extra}</Text>
              <Progress
                percent={card.title === 'Cobertura de campo' ? Math.min(stats.cobradores * 10, 100) : Number.parseInt(card.value, 10)}
                showInfo={false}
                strokeColor={card.progressStroke}
                trailColor={card.progressTrail}
                style={{ marginTop: 18 }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[20, 20]} style={{ marginTop: 4 }}>
        <Col xs={24} xl={15}>
          <Card
            title={<span style={{ color: '#0f172a', fontWeight: 700 }}>Estado de oficinas</span>}
            style={surfaceStyle}
            extra={
              <Text style={{ color: '#64748b' }}>
                {oficinasActivas} activas / {oficinasInactivas} inactivas
              </Text>
            }
            styles={{ body: { paddingTop: 12 } }}
          >
            <Table
              dataSource={oficinas.slice(0, 6)}
              columns={columnasOficinas}
              rowKey={(record) => record._id}
              pagination={false}
              locale={{ emptyText: 'Aún no hay oficinas registradas' }}
            />
          </Card>
        </Col>

        <Col xs={24} xl={9}>
          <Card
            title={<span style={{ color: '#0f172a', fontWeight: 700 }}>Alertas y enfoque</span>}
            style={surfaceStyle}
            styles={{ body: { padding: 24 } }}
          >
            {notificaciones.length > 0 ? (
              <Space direction="vertical" size={14} style={{ width: '100%' }}>
                {notificaciones.slice(0, 4).map((empresa) => (
                  <div
                    key={empresa.id || empresa.tenantId}
                    style={{
                      padding: 16,
                      borderRadius: 16,
                      background: '#fff7ed',
                      border: '1px solid #fed7aa',
                    }}
                  >
                    <Space align="start">
                      <WarningOutlined style={{ color: '#c2410c', fontSize: 18, marginTop: 4 }} />
                      <div>
                        <div style={{ fontWeight: 600, color: '#7c2d12' }}>{empresa.nombre}</div>
                        <Text style={{ color: '#9a3412', fontSize: 13 }}>
                          {empresa.diasAtraso} días de atraso · vence {empresa.fechaVencimiento}
                        </Text>
                        <div style={{ marginTop: 8, color: '#7c2d12', fontWeight: 600 }}>
                          Pendiente {currencyFormatter.format(empresa.montoPendiente || 0)}
                        </div>
                      </div>
                    </Space>
                  </div>
                ))}
              </Space>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No hay alertas pendientes en este momento"
              />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]} style={{ marginTop: 4 }}>
        <Col xs={24} md={12} xl={6}>
          <Card style={surfaceStyle} styles={{ body: { padding: 22 } }}>
            <Statistic
              title="Préstamos vencidos"
              value={stats.prestamosVencidos}
              prefix={<WarningOutlined style={{ color: '#b91c1c' }} />}
              valueStyle={{ color: '#0f172a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card style={surfaceStyle} styles={{ body: { padding: 22 } }}>
            <Statistic
              title="Préstamos pagados"
              value={stats.prestamosPagados}
              prefix={<CheckCircleOutlined style={{ color: '#0f766e' }} />}
              valueStyle={{ color: '#0f172a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card style={surfaceStyle} styles={{ body: { padding: 22 } }}>
            <Statistic
              title="Cobradores"
              value={stats.cobradores}
              prefix={<TeamOutlined style={{ color: '#334155' }} />}
              valueStyle={{ color: '#0f172a', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card style={surfaceStyle} styles={{ body: { padding: 22 } }}>
            <Statistic
              title="Clientes por oficina"
              value={stats.oficinas ? (stats.clientes / stats.oficinas).toFixed(1) : 0}
              prefix={<ShopOutlined style={{ color: '#1d4ed8' }} />}
              suffix={<ArrowRightOutlined style={{ color: '#94a3b8', fontSize: 14 }} />}
              valueStyle={{ color: '#0f172a', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
