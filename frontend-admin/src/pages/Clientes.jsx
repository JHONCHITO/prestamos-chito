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
  Card,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';

const { Title } = Typography;

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    cargarClientes();
  }, []);

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/clientes');
      setClientes(response.data);
    } catch (error) {
      message.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async (values) => {
    try {
      setLoading(true);
      if (editingCliente) {
        await api.put(`/clientes/${editingCliente._id}`, values);
        message.success('Cliente actualizado');
      } else {
        await api.post('/clientes', values);
        message.success('Cliente creado');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingCliente(null);
      cargarClientes();
    } catch (error) {
      message.error('Error al guardar cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id) => {
    try {
      await api.delete(`/clientes/${id}`);
      message.success('Cliente eliminado');
      cargarClientes();
    } catch (error) {
      message.error('Error al eliminar cliente');
    }
  };

  const columns = [
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    { title: 'Cédula', dataIndex: 'cedula', key: 'cedula' },
    { title: 'Teléfono', dataIndex: 'telefono', key: 'telefono' },
    { title: 'Dirección', dataIndex: 'direccion', key: 'direccion' },
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
            onClick={() => {
              setEditingCliente(record);
              form.setFieldsValue(record);
              setModalVisible(true);
            }}
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
          }}
        >
          <Title level={3}>Clientes</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingCliente(null);
              form.resetFields();
              setModalVisible(true);
            }}
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
      >
        <Form form={form} layout="vertical" onFinish={handleGuardar}>
          <Form.Item
            name="nombre"
            label="Nombre"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="cedula"
            label="Cédula"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="telefono" label="Teléfono">
            <Input />
          </Form.Item>
          <Form.Item name="direccion" label="Dirección">
            <Input.TextArea />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Guardar
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Clientes;