import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Progress,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined, DollarOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../api/api';

const { Title, Text } = Typography;

const formatMoney = (value) => `$${Number(value || 0).toLocaleString('es-CO')}`;

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export default function PrestamoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [prestamo, setPrestamo] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/prestamos/${id}`);
        setPrestamo(response.data || null);
      } catch (error) {
        console.error('Error cargando prestamo:', error);
        message.error(error.response?.data?.error || 'No se pudo cargar el credito');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const summary = useMemo(() => {
    const totalAPagar = Number(prestamo?.totalAPagar || 0);
    const totalPagado = Number(prestamo?.totalPagado || 0);
    const saldoPendiente = prestamo?.saldoPendiente ?? Math.max(0, totalAPagar - totalPagado);
    const porcentajePagado = prestamo?.porcentajePagado ?? (totalAPagar > 0 ? (totalPagado / totalAPagar) * 100 : 0);

    return { totalAPagar, totalPagado, saldoPendiente, porcentajePagado };
  }, [prestamo]);

  const paymentColumns = [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', render: (value) => formatDate(value) },
    { title: 'Monto', dataIndex: 'monto', key: 'monto', render: (value) => formatMoney(value) },
    { title: 'Metodo', dataIndex: 'metodo', key: 'metodo', render: (value) => value || 'efectivo' },
    { title: 'Observacion', dataIndex: 'observacion', key: 'observacion', render: (value) => value || '-' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!prestamo) {
    return <Empty description="Credito no encontrado" />;
  }

  const estado = String(prestamo.estado || 'activo').toLowerCase();

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
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/prestamos')}>
              Volver
            </Button>
            <Tag color={estado === 'pagado' ? 'green' : estado === 'activo' ? 'blue' : 'red'}>
              {estado.toUpperCase()}
            </Tag>
          </Space>

          <Space align="center" size={16} wrap>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: 'linear-gradient(135deg, #0f766e, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 24,
              }}
            >
              <DollarOutlined />
            </div>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                {prestamo.cliente?.nombre || 'Sin cliente'}
              </Title>
              <Text type="secondary">Credito #{prestamo._id}</Text>
            </div>
          </Space>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Text type="secondary">Capital</Text>
            <Title level={3} style={{ margin: 0 }}>{formatMoney(prestamo.capital)}</Title>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Text type="secondary">Total a pagar</Text>
            <Title level={3} style={{ margin: 0 }}>{formatMoney(summary.totalAPagar)}</Title>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Text type="secondary">Pagado</Text>
            <Title level={3} style={{ margin: 0 }}>{formatMoney(summary.totalPagado)}</Title>
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Text type="secondary">Saldo</Text>
            <Title level={3} style={{ margin: 0 }}>{formatMoney(summary.saldoPendiente)}</Title>
          </Card>
        </Col>
      </Row>

      <Card>
        <Progress percent={Number(summary.porcentajePagado || 0)} status={estado === 'pagado' ? 'success' : 'active'} />
      </Card>

      <Card title="Datos del credito">
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Cliente">
            <Button type="link" onClick={() => navigate(`/clientes/${prestamo.cliente?._id}`)} style={{ padding: 0 }}>
              {prestamo.cliente?.nombre || '-'}
            </Button>
          </Descriptions.Item>
          <Descriptions.Item label="Cobrador">
            <Button type="link" onClick={() => navigate(`/cobradores/${prestamo.cobrador?._id}`)} style={{ padding: 0 }}>
              {prestamo.cobrador?.nombre || '-'}
            </Button>
          </Descriptions.Item>
          <Descriptions.Item label="Interes">{Number(prestamo.interes || 0).toLocaleString('es-CO')}%</Descriptions.Item>
          <Descriptions.Item label="Cuotas">{prestamo.numeroCuotas || 0}</Descriptions.Item>
          <Descriptions.Item label="Frecuencia">{prestamo.frecuencia || 'diario'}</Descriptions.Item>
          <Descriptions.Item label="Fecha inicio">{formatDate(prestamo.fechaInicio)}</Descriptions.Item>
          <Descriptions.Item label="Fecha vencimiento">{formatDate(prestamo.fechaVencimiento)}</Descriptions.Item>
          <Descriptions.Item label="Ultimo pago">{formatDate(prestamo.ultimoPago)}</Descriptions.Item>
          <Descriptions.Item label="Notas">{prestamo.notas || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Pagos registrados">
        {Array.isArray(prestamo.pagos) && prestamo.pagos.length ? (
          <Table
            rowKey={(record) => record._id || `${record.fecha}-${record.monto}`}
            dataSource={prestamo.pagos}
            columns={paymentColumns}
            pagination={{ pageSize: 8 }}
          />
        ) : (
          <Empty description="Este credito aun no tiene pagos registrados" />
        )}
      </Card>
    </Space>
  );
}
