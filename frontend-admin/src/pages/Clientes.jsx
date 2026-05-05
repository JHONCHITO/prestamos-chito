import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

const { Title, Text } = Typography;
const { Option } = Select;

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [cobradores, setCobradores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    cargarClientes();
    cargarCobradores();
  }, []);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/clientes');
      setClientes(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      message.error(error.response?.data?.error || 'Error al cargar clientes');
    } finally {
      setLoading(false);
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

  const handleGuardar = async (values) => {
    try {
      setSaving(true);

      const payload = {
        ...values,
        celular: values.celular || values.telefono || '',
        telefono: values.telefono || values.celular || '',
        cobrador: values.cobrador,
      };

      if (!payload.cobrador) {
        message.error('Selecciona un cobrador');
        return;
      }

      if (editingCliente) {
        await api.put(`/clientes/${editingCliente._id}`, payload);
        message.success('Cliente actualizado');
      } else {
        await api.post('/clientes', payload);
        message.success('Cliente creado');
      }

      setModalVisible(false);
      form.resetFields();
      setEditingCliente(null);
      cargarClientes();
    } catch (error) {
      message.error(error.response?.data?.error || 'Error al guardar cliente');
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (id) => {
    try {
      await api.delete(`/clientes/${id}`);
      message.success('Cliente desactivado');
      cargarClientes();
    } catch (error) {
      message.error(error.response?.data?.error || 'Error al eliminar cliente');
    }
  };

  const openCreateModal = () => {
    setEditingCliente(null);
    form.resetFields();
    setModalVisible(true);
  };

  const openEditModal = (record) => {
    setEditingCliente(record);
    form.setFieldsValue({
      nombre: record.nombre || '',
      cedula: record.cedula || '',
      celular: record.celular || record.telefono || '',
      telefono: record.telefono || record.celular || '',
      direccion: record.direccion || '',
      cobrador: record.cobrador?._id || record.cobrador || '',
    });
    setModalVisible(true);
  };

  const columns = [
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    { title: 'Cédula', dataIndex: 'cedula', key: 'cedula' },
    {
      title: 'Teléfono',
      key: 'telefono',
      render: (_, record) => record.celular || record.telefono || '-',
    },
    { title: 'Dirección', dataIndex: 'direccion', key: 'direccion' },
    {
      title: 'Cobrador',
      key: 'cobrador',
      render: (_, record) => record.cobrador?.nombre || 'Sin asignar',
    },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => navigate(`/clientes/${record._id}`)}
          >
            Ver
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            Editar
          </Button>
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
            <Title level={3} style={{ marginBottom: 4 }}>Clientes</Title>
            <Text type="secondary">Cada cliente debe quedar asignado a un cobrador activo.</Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
          >
            Nuevo Cliente
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={clientes}
          rowKey="_id"
          loading={loading}
        />
      </Card>

      <Modal
        title={editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingCliente(null);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        {cobradores.length === 0 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="No hay cobradores activos"
            description="Debes crear al menos un cobrador activo para poder guardar clientes."
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleGuardar}>
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="cedula"
            label="Cédula"
            rules={[{ required: true, message: 'La cédula es obligatoria' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="celular"
            label="Teléfono"
            rules={[{ required: true, message: 'El teléfono es obligatorio' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="direccion"
            label="Dirección"
            rules={[{ required: true, message: 'La dirección es obligatoria' }]}
          >
            <Input.TextArea />
          </Form.Item>

          <Form.Item
            name="cobrador"
            label="Cobrador"
            rules={[{ required: true, message: 'Selecciona un cobrador' }]}
          >
            <Select placeholder="Selecciona un cobrador" showSearch optionFilterProp="children">
              {cobradores.map((item) => (
                <Option key={item._id} value={item._id}>
                  {item.nombre} - {item.cedula}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saving} disabled={cobradores.length === 0}>
              Guardar
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Clientes;
