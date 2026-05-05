import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined, EyeOutlined, TeamOutlined } from '@ant-design/icons';
import api from '../api/api';

const { Title, Text } = Typography;

const formatMoney = (value) => `$${Number(value || 0).toLocaleString('es-CO')}`;

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(date);
};

export default function CobradorDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cobrador, setCobrador] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/cobradores/${id}`);
        const payload = response.data || {};
        setCobrador(payload.cobrador || payload || null);
        setClientes(Array.isArray(payload.clientes) ? payload.clientes : []);
        setPrestamos(Array.isArray(payload.prestamos) ? payload.prestamos : []);
        setStats(payload.stats || {});
      } catch (error) {
        console.error('Error cargando cobrador:', error);
        message.error(error.response?.data?.error || 'No se pudo cargar el cobrador');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const summary = useMemo(
    () => ({
      clientesCount: stats.clientesCount ?? clientes.length,
      prestamosCount: stats.prestamosCount ?? prestamos.length,
      cartera: stats.cartera ?? 0,
      totalRecaudado: stats.totalRecaudado ?? 0,
      prestamosActivos: stats.prestamosActivos ?? prestamos.filter((item) => item.estado === 'activo').length,
    }),
    [stats, clientes.length, prestamos],
  );

  const clientColumns = [
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    { title: 'Cedula', dataIndex: 'cedula', key: 'cedula' },
    {
      title: 'Celular',
      key: 'celular',
      render: (_, record) => record.celular || record.telefono || '-',
    },
    {
      title: 'Tipo',
      key: 'tipoCliente',
      render: (_, record) => <Tag color="blue">{record.tipoCliente || 'nuevo'}</Tag>,
    },
    {
      title: 'Estado',
      key: 'estado',
      render: (_, record) => (
        <Tag color={record.estado === 'activo' ? 'green' : 'red'}>{record.estado || 'activo'}</Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Button icon={<EyeOutlined />} onClick={() => navigate(`/clientes/${record._id}`)}>
          Ver
        </Button>
      ),
    },
  ];

  const loanColumns = [
    {
      title: 'Cliente',
      key: 'cliente',
      render: (_, record) => record.cliente?.nombre || 'Sin cliente',
    },
    {
      title: 'Capital',
      key: 'capital',
      render: (_, record) => formatMoney(record.capital),
    },
    {
      title: 'Total',
      key: 'totalAPagar',
      render: (_, record) => formatMoney(record.totalAPagar),
    },
    {
      title: 'Saldo',
      key: 'saldoPendiente',
      render: (_, record) => formatMoney(record.saldoPendiente),
    },
    {
      title: 'Estado',
      key: 'estado',
      render: (_, record) => (
        <Tag color={record.estado === 'pagado' ? 'green' : record.estado === 'activo' ? 'blue' : 'red'}>
          {String(record.estado || '').toUpperCase() || 'ACTIVO'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Button icon={<EyeOutlined />} onClick={() => navigate(`/prestamos/${record._id}`)}>
          Ver
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!cobrador) {
    return <Empty description="Cobrador no encontrado" />;
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card
        style={{
          border: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        }}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/cobradores')}>
            Volver
          </Button>

          <Space align="center" size={16} wrap>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 24,
              }}
            >
              <TeamOutlined />
            </div>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                {cobrador.nombre}
              </Title>
              <Text type="secondary">{cobrador.email}</Text>
            </div>
            <Tag color={cobrador.estado === 'activo' ? 'green' : 'red'}>{cobrador.estado || 'activo'}</Tag>
          </Space>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Text type="secondary">Clientes</Text>
            <Title level={3} style={{ margin: 0 }}>{summary.clientesCount}</Title>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Text type="secondary">Creditos</Text>
            <Title level={3} style={{ margin: 0 }}>{summary.prestamosCount}</Title>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Text type="secondary">Cartera</Text>
            <Title level={3} style={{ margin: 0 }}>{formatMoney(summary.cartera)}</Title>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Text type="secondary">Recaudado</Text>
            <Title level={3} style={{ margin: 0 }}>{formatMoney(summary.totalRecaudado)}</Title>
          </Card>
        </Col>
      </Row>

      <Card title="Datos del cobrador">
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Cedula">{cobrador.cedula || '-'}</Descriptions.Item>
          <Descriptions.Item label="Telefono">{cobrador.telefono || '-'}</Descriptions.Item>
          <Descriptions.Item label="Zona">{cobrador.zona || '-'}</Descriptions.Item>
          <Descriptions.Item label="Creado">{formatDate(cobrador.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="Ultima actualizacion">{formatDate(cobrador.updatedAt)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Clientes asignados">
        {clientes.length ? (
          <Table rowKey="_id" dataSource={clientes} columns={clientColumns} pagination={{ pageSize: 8 }} />
        ) : (
          <Empty description="Este cobrador aun no tiene clientes asignados" />
        )}
      </Card>

      <Card title="Creditos asignados">
        {prestamos.length ? (
          <Table rowKey="_id" dataSource={prestamos} columns={loanColumns} pagination={{ pageSize: 8 }} />
        ) : (
          <Empty description="Este cobrador aun no tiene creditos asignados" />
        )}
      </Card>
    </Space>
  );
}
