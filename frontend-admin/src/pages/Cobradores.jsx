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

const Cobradores = () => {
  const [cobradores, setCobradores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCobrador, setEditingCobrador] = useState(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    cargarCobradores();
  }, []);

  const cargarCobradores = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cobradores');
      setCobradores(response.data);
    } catch (error) {
      message.error('Error al cargar cobradores');
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async (values) => {
    try {
      setLoading(true);
      if (editingCobrador) {
        await api.put(`/cobradores/${editingCobrador._id}`, values);
        message.success('Cobrador actualizado');
      } else {
        await api.post('/cobradores', values);
        message.success('Cobrador creado');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingCobrador(null);
      cargarCobradores();
    } catch (error) {
      message.error('Error al guardar cobrador');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id) => {
    try {
      await api.delete(`/cobradores/${id}`);
      message.success('Cobrador eliminado');
      cargarCobradores();
    } catch (error) {
      message.error('Error al eliminar cobrador');
    }
  };

  const columns = [
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Cédula', dataIndex: 'cedula', key: 'cedula' },
    { title: 'Teléfono', dataIndex: 'telefono', key: 'telefono' },
    {
      title: 'Acciones',
      key: 'acciones',
      render: (_, record) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => navigate(`/cobradores/${record._id}`)}
          >
            Ver
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => {
              setEditingCobrador(record);
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
          <Title level={3}>Cobradores</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingCobrador(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            Nuevo Cobrador
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={cobradores}
          rowKey="_id"
          loading={loading}
        />
      </Card>

      <Modal
        title={editingCobrador ? 'Editar Cobrador' : 'Nuevo Cobrador'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingCobrador(null);
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
            name="email"
            label="Email"
            rules={[{ required: true, type: 'email' }]}
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
          <Form.Item
            name="password"
            label="Contraseña"
            rules={[{ required: !editingCobrador }]}
          >
            <Input.Password />
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

export default Cobradores;