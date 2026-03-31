import React, { useState } from 'react';
import { Card, Typography, Form, Input, Button, message, Switch, Divider, Alert, Space } from 'antd';
import { SaveOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import api from '../api/api';

const { Title, Text } = Typography;

const Configuracion = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleUpdateProfile = async (values) => {
    try {
      setLoading(true);
      await api.put('/auth/perfil', values);
      message.success('Perfil actualizado');
      localStorage.setItem('admin_user', JSON.stringify({ ...JSON.parse(localStorage.getItem('admin_user')), nombre: values.nombre }));
    } catch (error) {
      message.error('Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values) => {
    if (values.newPassword !== values.confirmPassword) return message.error('Las contraseñas no coinciden');
    try {
      setLoading(true);
      await api.post('/auth/cambiar-password', { currentPassword: values.currentPassword, newPassword: values.newPassword });
      message.success('Contraseña cambiada');
      form.resetFields(['currentPassword', 'newPassword', 'confirmPassword']);
    } catch (error) {
      message.error('Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={2}>Configuración</Title>
      <Card title="Perfil de Usuario" style={{ marginBottom: 24 }}>
        <Form layout="vertical" onFinish={handleUpdateProfile} initialValues={{ nombre: JSON.parse(localStorage.getItem('admin_user'))?.nombre }}>
          <Form.Item name="nombre" label="Nombre"><Input prefix={<UserOutlined />} /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>Actualizar Perfil</Button></Form.Item>
        </Form>
      </Card>
      <Card title="Cambiar Contraseña">
        <Form form={form} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item name="currentPassword" label="Contraseña Actual" rules={[{ required: true }]}><Input.Password prefix={<LockOutlined />} /></Form.Item>
          <Form.Item name="newPassword" label="Nueva Contraseña" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
          <Form.Item name="confirmPassword" label="Confirmar" rules={[{ required: true }]}><Input.Password /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" loading={loading}>Cambiar Contraseña</Button></Form.Item>
        </Form>
      </Card>
      <Divider />
      <Card title="Configuración del Sistema">
        <Alert message="Configuración Global" description="Aquí puedes configurar parámetros del sistema" type="info" showIcon />
        <div style={{ marginTop: 24 }}><Text strong>Notificaciones:</Text><Switch style={{ marginLeft: 16 }} defaultChecked /></div>
      </Card>
    </div>
  );
};

export default Configuracion;