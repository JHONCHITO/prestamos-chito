import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Tag,
  Card,
  Row,
  Col,
  Typography,
  Spin,
  Descriptions,
  Alert
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  DeleteOutlined,
  ShopOutlined,
  CopyOutlined,
  CheckOutlined
} from '@ant-design/icons';
import {
  getOficinas,
  crearOficina,
  cambiarEstadoOficina,
  eliminarOficina,
  getDetalleOficina
} from '../../api/superadmin';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const OficinasManager = () => {
  const [oficinas, setOficinas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [credencialesModalVisible, setCredencialesModalVisible] = useState(false);
  const [selectedOficina, setSelectedOficina] = useState(null);
  const [detalleData, setDetalleData] = useState(null);
  const [nuevasCredenciales, setNuevasCredenciales] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    cargarOficinas();
  }, []);

  const cargarOficinas = async () => {
    try {
      setLoading(true);
      const data = await getOficinas();
      setOficinas(data);
    } catch (error) {
      message.error('Error al cargar oficinas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearOficina = async (values) => {
    try {
      setLoading(true);
      const result = await crearOficina(values);
      
      // Guardar las credenciales para mostrarlas en un modal
      setNuevasCredenciales({
        tenant: result.tenant,
        admin: result.admin,
        cobrador: result.cobrador
      });
      
      setModalVisible(false);
      form.resetFields();
      setCredencialesModalVisible(true);
      cargarOficinas();
      
    } catch (error) {
      message.error('Error al crear oficina: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    message.success(`${field} copiado al portapapeles`);
  };

  const handleCambiarEstado = async (id, estadoActual) => {
    try {
      await cambiarEstadoOficina(id, !estadoActual);
      message.success('Estado actualizado correctamente');
      cargarOficinas();
    } catch (error) {
      message.error('Error al cambiar estado: ' + error.message);
    }
  };

  const handleEliminarOficina = async (id) => {
    try {
      await eliminarOficina(id);
      message.success('Oficina eliminada correctamente');
      cargarOficinas();
    } catch (error) {
      message.error('Error al eliminar oficina: ' + error.message);
    }
  };

  const handleVerDetalle = async (oficina) => {
    try {
      setLoading(true);
      const data = await getDetalleOficina(oficina._id);
      setDetalleData(data);
      setSelectedOficina(oficina);
      setDetailModalVisible(true);
    } catch (error) {
      message.error('Error al cargar detalle: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'nombre',
      key: 'nombre',
      render: (text) => (
        <Space>
          <ShopOutlined style={{ color: '#1890ff' }} />
          <strong>{text}</strong>
        </Space>
      )
    },
    {
      title: 'Código',
      dataIndex: 'codigoEmpresa',
      key: 'codigoEmpresa',
      render: (text) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Dirección',
      dataIndex: 'direccion',
      key: 'direccion',
      render: (text) => text || 'No especificada'
    },
    {
      title: 'Teléfono',
      dataIndex: 'telefono',
      key: 'telefono',
      render: (text) => text || 'No especificado'
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado) => (
        <Tag color={estado ? 'green' : 'red'}>
          {estado ? 'ACTIVA' : 'INACTIVA'}
        </Tag>
      )
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleVerDetalle(record)}
          >
            Ver
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => handleCambiarEstado(record._id, record.estado)}
            style={{ color: record.estado ? '#ff4d4f' : '#52c41a' }}
          >
            {record.estado ? 'Desactivar' : 'Activar'}
          </Button>
          <Popconfirm
            title="¿Está seguro de eliminar esta oficina?"
            description="Se eliminarán todos los datos asociados"
            onConfirm={() => handleEliminarOficina(record._id)}
            okText="Sí, eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button danger type="link" size="small" icon={<DeleteOutlined />}>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Card>
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>Gestión de Oficinas</Title>
            <Text type="secondary">Administra todas las oficinas del sistema</Text>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setModalVisible(true)}
              size="large"
            >
              Nueva Oficina
            </Button>
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={oficinas}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Modal para crear oficina */}
      <Modal
        title="Crear Nueva Oficina"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCrearOficina}>
          <Form.Item
            name="nombre"
            label="Nombre de la Oficina"
            rules={[{ required: true, message: 'Por favor ingrese el nombre' }]}
          >
            <Input placeholder="Ej: Oficina Norte" size="large" />
          </Form.Item>

          <Form.Item name="direccion" label="Dirección">
            <TextArea rows={3} placeholder="Dirección completa" />
          </Form.Item>

          <Form.Item name="telefono" label="Teléfono">
            <Input placeholder="Número de teléfono" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                Crear Oficina
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                Cancelar
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal para mostrar credenciales después de crear */}
      <Modal
        title="✅ Oficina Creada Exitosamente"
        open={credencialesModalVisible}
        onCancel={() => setCredencialesModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setCredencialesModalVisible(false)}>
            Entendido
          </Button>
        ]}
        width={700}
      >
        {nuevasCredenciales && (
          <div>
            <Alert
              message="¡Importante!"
              description="Guarda estas credenciales en un lugar seguro. Serán necesarias para acceder al panel de la oficina."
              type="warning"
              showIcon
              style={{ marginBottom: 20 }}
            />
            
            <Card title="Información de la Oficina" size="small" style={{ marginBottom: 16 }}>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Nombre">
                  <strong>{nuevasCredenciales.tenant.nombre}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Código Empresa">
                  <Tag color="blue">{nuevasCredenciales.tenant.codigoEmpresa}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="ID de Tenant">
                  <Text code>{nuevasCredenciales.tenant.tenantId}</Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Row gutter={16}>
              <Col span={12}>
                <Card 
                  title="👑 Administrador de Oficina" 
                  size="small"
                  style={{ borderColor: '#1890ff' }}
                >
                  <Paragraph>
                    <Text strong>Email:</Text><br />
                    <Text code>{nuevasCredenciales.admin.email}</Text>
                    <Button
                      type="link"
                      icon={copiedField === 'admin_email' ? <CheckOutlined /> : <CopyOutlined />}
                      onClick={() => copyToClipboard(nuevasCredenciales.admin.email, 'admin_email')}
                      size="small"
                    >
                      {copiedField === 'admin_email' ? 'Copiado!' : 'Copiar'}
                    </Button>
                  </Paragraph>
                  <Paragraph>
                    <Text strong>Contraseña:</Text><br />
                    <Text code>{nuevasCredenciales.admin.password}</Text>
                    <Button
                      type="link"
                      icon={copiedField === 'admin_pass' ? <CheckOutlined /> : <CopyOutlined />}
                      onClick={() => copyToClipboard(nuevasCredenciales.admin.password, 'admin_pass')}
                      size="small"
                    >
                      {copiedField === 'admin_pass' ? 'Copiado!' : 'Copiar'}
                    </Button>
                  </Paragraph>
                </Card>
              </Col>
              <Col span={12}>
                <Card 
                  title="👥 Cobrador Principal" 
                  size="small"
                  style={{ borderColor: '#52c41a' }}
                >
                  <Paragraph>
                    <Text strong>Email:</Text><br />
                    <Text code>{nuevasCredenciales.cobrador.email}</Text>
                    <Button
                      type="link"
                      icon={copiedField === 'cobrador_email' ? <CheckOutlined /> : <CopyOutlined />}
                      onClick={() => copyToClipboard(nuevasCredenciales.cobrador.email, 'cobrador_email')}
                      size="small"
                    >
                      {copiedField === 'cobrador_email' ? 'Copiado!' : 'Copiar'}
                    </Button>
                  </Paragraph>
                  <Paragraph>
                    <Text strong>Contraseña:</Text><br />
                    <Text code>{nuevasCredenciales.cobrador.password}</Text>
                    <Button
                      type="link"
                      icon={copiedField === 'cobrador_pass' ? <CheckOutlined /> : <CopyOutlined />}
                      onClick={() => copyToClipboard(nuevasCredenciales.cobrador.password, 'cobrador_pass')}
                      size="small"
                    >
                      {copiedField === 'cobrador_pass' ? 'Copiado!' : 'Copiar'}
                    </Button>
                  </Paragraph>
                </Card>
              </Col>
            </Row>

            <Alert
              message="Acceso a los paneles"
              description={
                <div>
                  <p>🔐 <strong>Panel de Administrador:</strong> Usa el email y contraseña del administrador</p>
                  <p>💰 <strong>Panel de Cobrador:</strong> Usa el email y contraseña del cobrador</p>
                </div>
              }
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          </div>
        )}
      </Modal>

      {/* Modal para ver detalle de oficina */}
      <Modal
        title="Detalle de Oficina"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[<Button key="close" onClick={() => setDetailModalVisible(false)}>Cerrar</Button>]}
        width={700}
      >
        {detalleData && selectedOficina && (
          <Spin spinning={loading}>
            <Descriptions title="Información de la Oficina" bordered column={1}>
              <Descriptions.Item label="Nombre">{selectedOficina.nombre}</Descriptions.Item>
              <Descriptions.Item label="Código Empresa">
                <Tag color="blue">{selectedOficina.codigoEmpresa}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Dirección">{selectedOficina.direccion || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Teléfono">{selectedOficina.telefono || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Estado">
                <Tag color={selectedOficina.estado ? 'green' : 'red'}>
                  {selectedOficina.estado ? 'Activa' : 'Inactiva'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
            
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Card title="Estadísticas" size="small">
                  <p><strong>Cobradores:</strong> {detalleData.stats?.cobradores || 0}</p>
                  <p><strong>Clientes:</strong> {detalleData.stats?.clientes || 0}</p>
                  <p><strong>Préstamos Totales:</strong> {detalleData.stats?.totalPrestamos || 0}</p>
                  <p><strong>Préstamos Activos:</strong> {detalleData.stats?.prestamosActivos || 0}</p>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="Administradores" size="small">
                  {detalleData.admins?.map(admin => (
                    <p key={admin._id}>📧 {admin.email}</p>
                  ))}
                </Card>
              </Col>
            </Row>
            
            <Card title="Cobradores" size="small" style={{ marginTop: 16 }}>
              {detalleData.cobradores?.map(cobrador => (
                <p key={cobrador._id}>👤 {cobrador.nombre} - 📧 {cobrador.email}</p>
              ))}
            </Card>
          </Spin>
        )}
      </Modal>
    </div>
  );
};

export default OficinasManager;