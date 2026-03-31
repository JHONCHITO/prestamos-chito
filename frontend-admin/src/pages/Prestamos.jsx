import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  Card,
  Typography,
  InputNumber,
  DatePicker,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../api/api';

const { Title } = Typography;
const { Option } = Select;

const Prestamos = () => {
  const [prestamos, setPrestamos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPrestamo, setEditingPrestamo] = useState(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    cargarPrestamos();
    cargarClientes();
  }, []);

  const cargarPrestamos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/prestamos');
      // ajusta si tu backend devuelve { prestamos: [...] }
      setPrestamos(response.data);
    } catch (error) {
      message.error('Error al cargar préstamos');
    } finally {
      setLoading(false);
    }
  };

  const cargarClientes = async () => {
    try {
      const response = await api.get('/clientes');
      setClientes(response.data);
    } catch (error) {
      console.error('Error cargando clientes');
    }
  };

  const handleGuardar = async (values) => {
    try {
      setLoading(true);
      const data = {
        ...values,
        fechaInicio: values.fechaInicio?.toISOString(),
        fechaVencimiento: values.fechaVencimiento?.toISOString(),
      };
      if (editingPrestamo) {
        await api.put(`/prestamos/${editingPrestamo._id}`, data);
        message.success('Préstamo actualizado');
      } else {
        await api.post('/prestamos', data);
        message.success('Préstamo creado');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingPrestamo(null);
      cargarPrestamos();
    } catch (error) {
      message.error('Error al guardar préstamo');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id) => {
    try {
      await api.delete(`/prestamos/${id}`);
      message.success('Préstamo eliminado');
      cargarPrestamos();
    } catch (error) {
      message.error('Error al eliminar préstamo');
    }
  };

  const columns = [
    {
      title: 'Cliente',
      dataIndex: ['cliente', 'nombre'],
      key: 'cliente',
      render: (_, record) => record.cliente?.nombre || 'N/A',
    },
    {
      title: 'Capital',
      dataIndex: 'capital',
      key: 'capital',
      render: (val) => `$${val?.toLocaleString() || 0}`,
    },
    {
      title: 'Interés',
      dataIndex: 'interes',
      key: 'interes',
      render: (val) => `$${val?.toLocaleString() || 0}`,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (val) => `$${val?.toLocaleString() || 0}`,
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
          {estado?.toUpperCase()}
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
              onClick={() => {
                setEditingPrestamo(record);
                form.setFieldsValue({
                  ...record,
                  fechaInicio: record.fechaInicio
                    ? dayjs(record.fechaInicio)
                    : null,
                  fechaVencimiento: record.fechaVencimiento
                    ? dayjs(record.fechaVencimiento)
                    : null,
                });
                setModalVisible(true);
              }}
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
          }}
        >
          <Title level={3}>Préstamos</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingPrestamo(null);
              form.resetFields();
              setModalVisible(true);
            }}
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
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleGuardar}>
          <Form.Item
            name="clienteId"
            label="Cliente"
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              optionFilterProp="children"
              placeholder="Seleccionar cliente"
            >
              {clientes.map((c) => (
                <Option key={c._id} value={c._id}>
                  {c.nombre} - {c.cedula}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="capital"
            label="Capital"
            rules={[{ required: true }]}
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
            rules={[{ required: true }]}
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
            rules={[{ required: true }]}
          >
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
          <Form.Item
            name="fechaInicio"
            label="Fecha Inicio"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="fechaVencimiento" label="Fecha Vencimiento">
            <DatePicker style={{ width: '100%' }} />
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

export default Prestamos;