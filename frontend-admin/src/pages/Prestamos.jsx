import React, { useEffect, useState } from 'react';
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../api/api';

const { Title, Text } = Typography;
const { Option } = Select;

const Prestamos = () => {
  const [prestamos, setPrestamos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cobradores, setCobradores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPrestamo, setEditingPrestamo] = useState(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    cargarPrestamos();
    cargarClientes();
    cargarCobradores();
  }, []);

  const cargarPrestamos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/prestamos');
      setPrestamos(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      message.error(error.response?.data?.error || 'Error al cargar préstamos');
    } finally {
      setLoading(false);
    }
  };

  const cargarClientes = async () => {
    try {
      const response = await api.get('/clientes');
      setClientes(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
  };

  const cargarCobradores = async () => {
    try {
      const response = await api.get('/cobradores');
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data || response.data?.cobradores || [];
      setCobradores(data.filter((item) => item.estado !== 'inactivo'));
    } catch (error) {
      console.error('Error cargando cobradores:', error);
    }
  };

  const autoAsignarCobrador = (clienteId) => {
    const cliente = clientes.find((item) => item._id === clienteId);
    const cobradorId = cliente?.cobrador?._id || cliente?.cobrador || '';
    if (cobradorId) {
      form.setFieldsValue({ cobradorId });
    }
  };

  const handleGuardar = async (values) => {
    try {
      setSaving(true);

      const payload = {
        clienteId: values.clienteId,
        cobradorId: values.cobradorId,
        capital: values.capital,
        interes: values.interes,
        numeroCuotas: values.plazo,
        fechaInicio: values.fechaInicio ? values.fechaInicio.toISOString() : undefined,
        fechaVencimiento: values.fechaVencimiento ? values.fechaVencimiento.toISOString() : undefined,
        notas: values.notas || '',
      };

      if (editingPrestamo) {
        await api.put(`/prestamos/${editingPrestamo._id}`, payload);
        message.success('Préstamo actualizado');
      } else {
        await api.post('/prestamos', payload);
        message.success('Préstamo creado');
      }

      setModalVisible(false);
      form.resetFields();
      setEditingPrestamo(null);
      cargarPrestamos();
    } catch (error) {
      message.error(error.response?.data?.error || 'Error al guardar préstamo');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (id) => {
    try {
      await api.delete(`/prestamos/${id}`);
      message.success('Préstamo eliminado');
      cargarPrestamos();
    } catch (error) {
      message.error(error.response?.data?.error || 'Error al eliminar préstamo');
    }
  };

  const openCreateModal = () => {
    setEditingPrestamo(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record) => {
    setEditingPrestamo(record);
    form.setFieldsValue({
      clienteId: record.cliente?._id || record.cliente || '',
      cobradorId: record.cobrador?._id || record.cobrador || '',
      capital: record.capital,
      interes: record.interes,
      plazo: record.numeroCuotas || record.plazo || 30,
      fechaInicio: record.fechaInicio ? dayjs(record.fechaInicio) : null,
      fechaVencimiento: record.fechaVencimiento ? dayjs(record.fechaVencimiento) : null,
      notas: record.notas || '',
    });
    setModalVisible(true);
  };

  const columns = [
    {
      title: 'Cliente',
      key: 'cliente',
      render: (_, record) => record.cliente?.nombre || 'N/A',
    },
    {
      title: 'Cobrador',
      key: 'cobrador',
      render: (_, record) => record.cobrador?.nombre || 'N/A',
    },
    {
      title: 'Capital',
      dataIndex: 'capital',
      key: 'capital',
      render: (val) => `$${Number(val || 0).toLocaleString('es-CO')}`,
    },
    {
      title: 'Interés',
      dataIndex: 'interes',
      key: 'interes',
      render: (val) => `${Number(val || 0).toLocaleString('es-CO')}%`,
    },
    {
      title: 'Total',
      dataIndex: 'totalAPagar',
      key: 'totalAPagar',
      render: (val) => `$${Number(val || 0).toLocaleString('es-CO')}`,
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado) => (
        <Tag
          color={
            estado === 'pagado'
              ? 'green'
              : estado === 'activo'
              ? 'blue'
              : 'red'
          }
        >
          {String(estado || '').toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => navigate(`/prestamos/${record._id}`)}
          >
            Ver
          </Button>
          {record.estado !== 'pagado' && (
            <Button
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            >
              Editar
            </Button>
          )}
          <Popconfirm
            title="¿Eliminar?"
            onConfirm={() => handleEliminar(record._id)}
          >
            <Button danger icon={<DeleteOutlined />}>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 16,
            gap: 16,
            alignItems: 'center',
          }}
        >
          <div>
            <Title level={3} style={{ marginBottom: 4 }}>Préstamos</Title>
            <Text type="secondary">Selecciona cliente, cobrador y plazo para registrar el crédito completo.</Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            Nuevo Préstamo
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={prestamos}
          rowKey="_id"
          loading={loading}
        />
      </Card>

      <Modal
        title={editingPrestamo ? 'Editar Préstamo' : 'Nuevo Préstamo'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingPrestamo(null);
          form.resetFields();
        }}
        footer={null}
        width={700}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleGuardar}>
          <Form.Item
            name="clienteId"
            label="Cliente"
            rules={[{ required: true, message: 'Selecciona un cliente' }]}
          >
            <Select
              showSearch
              optionFilterProp="children"
              placeholder="Seleccionar cliente"
              onChange={autoAsignarCobrador}
            >
              {clientes.map((item) => (
                <Option key={item._id} value={item._id}>
                  {item.nombre} - {item.cedula}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="cobradorId"
            label="Cobrador"
            rules={[{ required: true, message: 'Selecciona un cobrador' }]}
          >
            <Select
              showSearch
              optionFilterProp="children"
              placeholder="Seleccionar cobrador"
            >
              {cobradores.map((item) => (
                <Option key={item._id} value={item._id}>
                  {item.nombre} - {item.cedula}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="capital"
            label="Capital"
            rules={[{ required: true, message: 'El capital es obligatorio' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              step={1000}
            />
          </Form.Item>

          <Form.Item
            name="interes"
            label="Interés (%)"
            rules={[{ required: true, message: 'El interés es obligatorio' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              step={1}
            />
          </Form.Item>

          <Form.Item
            name="plazo"
            label="Plazo (días)"
            rules={[{ required: true, message: 'El plazo es obligatorio' }]}
          >
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>

          <Form.Item
            name="fechaInicio"
            label="Fecha Inicio"
            rules={[{ required: true, message: 'La fecha de inicio es obligatoria' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="fechaVencimiento" label="Fecha Vencimiento">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="notas" label="Notas">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving}>
              Guardar
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Prestamos;
