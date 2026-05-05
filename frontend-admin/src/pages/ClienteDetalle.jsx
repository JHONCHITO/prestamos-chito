import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Row,
  Col,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined, EyeOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons';
import api from '../api/api';

const { Title, Text } = Typography;

const formatMoney = (value) => `$${Number(value || 0).toLocaleString('es-CO')}`;

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(date);
};

export default function ClienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [cliente, setCliente] = useState(null);
  const [prestamos, setPrestamos] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [clienteResponse, prestamosResponse] = await Promise.all([
          api.get(`/clientes/${id}`),
          api.get(`/prestamos/cliente/${id}`),
        ]);

        setCliente(clienteResponse.data || null);
        setPrestamos(Array.isArray(prestamosResponse.data) ? prestamosResponse.data : []);
      } catch (error) {
        console.error('Error cargando cliente:', error);
        message.error(error.response?.data?.error || 'No se pudo cargar el cliente');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const summary = useMemo(() => {
    const totalPrestado = prestamos.reduce((sum, item) => sum + Number(item.capital || 0), 0);
    const totalPagado = prestamos.reduce((sum, item) => sum + Number(item.totalPagado || 0), 0);
    const saldoPendiente = prestamos.reduce((sum, item) => {
      const totalAPagar = Number(item.totalAPagar || 0);
      const pagado = Number(item.totalPagado || 0);
      return sum + Math.max(0, totalAPagar - pagado);
    }, 0);

    return {
      totalPrestado,
      totalPagado,
      saldoPendiente,
      activos: prestamos.filter((item) => item.estado === 'activo').length,
      pagados: prestamos.filter((item) => item.estado === 'pagado').length,
    };
  }, [prestamos]);

  const columns = [
    {
      title: 'Capital',
      dataIndex: 'capital',
      key: 'capital',
      render: (value) => formatMoney(value),
    },
    {
      title: 'Interes',
      dataIndex: 'interes',
      key: 'interes',
      render: (value) => `${Number(value || 0).toLocaleString('es-CO')}%`,
    },
    {
      title: 'Total',
      dataIndex: 'totalAPagar',
      key: 'totalAPagar',
      render: (value) => formatMoney(value),
    },
    {
      title: 'Pagado',
      dataIndex: 'totalPagado',
      key: 'totalPagado',
      render: (value) => formatMoney(value),
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (value) => (
        <Tag color={value === 'pagado' ? 'green' : value === 'activo' ? 'blue' : 'red'}>
          {String(value || '').toUpperCase() || 'ACTIVO'}
        </Tag>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value) => formatDate(value),
    },
    {
      title: 'Acciones',
      key: 'acciones',
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

  if (!cliente) {
    return <Empty description="Cliente no encontrado" />;
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
          <Space style={{ justifyContent: 'space-between', width: '100%' }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/clientes')}>
              Volver
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/prestamos/nuevo', { state: { clienteId: id } })}
            >
              Hacer credito
            </Button>
          </Space>

          <Space align="center" size={16} wrap>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #1d4ed8, #0ea5e9)',
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
                {cliente.nombre}
              </Title>
              <Text type="secondary">Cedula: {cliente.cedula}</Text>
            </div>
            <Tag color={cliente.estado === 'activo' ? 'green' : 'red'}>{cliente.estado || 'activo'}</Tag>
            <Tag color="blue">{cliente.tipoCliente || 'nuevo'}</Tag>
          </Space>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Text type="secondary">Creditos</Text>
            <Title level={3} style={{ margin: 0 }}>{prestamos.length}</Title>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Text type="secondary">Activos</Text>
            <Title level={3} style={{ margin: 0 }}>{summary.activos}</Title>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Text type="secondary">Pagados</Text>
            <Title level={3} style={{ margin: 0 }}>{summary.pagados}</Title>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Text type="secondary">Saldo pendiente</Text>
            <Title level={3} style={{ margin: 0 }}>{formatMoney(summary.saldoPendiente)}</Title>
          </Card>
        </Col>
      </Row>

      <Card title="Datos del cliente">
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Telefono">{cliente.celular || cliente.telefono || '-'}</Descriptions.Item>
          <Descriptions.Item label="Direccion">{cliente.direccion || '-'}</Descriptions.Item>
          <Descriptions.Item label="Cobrador">
            {cliente.cobrador?.nombre || 'Sin asignar'} {cliente.cobrador?.cedula ? `(${cliente.cobrador.cedula})` : ''}
          </Descriptions.Item>
          <Descriptions.Item label="Creado">{formatDate(cliente.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="Ultima actualizacion">{formatDate(cliente.updatedAt)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Historial de creditos">
        {prestamos.length ? (
          <Table rowKey="_id" dataSource={prestamos} columns={columns} pagination={{ pageSize: 8 }} />
        ) : (
          <Empty description="Este cliente aun no tiene creditos registrados" />
        )}
      </Card>
    </Space>
  );
}
