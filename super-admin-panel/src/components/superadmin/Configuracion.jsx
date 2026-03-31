import React, { useState } from 'react';
import { Card, Typography, Form, Input, Button, message, Switch, Divider, Alert } from 'antd';
import { SaveOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const Configuracion = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleUpdateProfile = async (values) => {
    try {
      setLoading(true);
      message.success('Perfil actualizado correctamente');
    } catch (error) {
      message.error('Error al actualizar perfil: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Las contraseñas no coinciden');
      return;
    }
    
    try {
      setLoading(true);
      message.success('Contraseña cambiada correctamente');
      form.resetFields();
    } catch (error) {
      message.error('Error al cambiar contraseña: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={2} style={{ marginBottom: 24 }}>Configuración</Title>
      
      <Card title="Perfil de Usuario" style={{ marginBottom: 24 }}>
        <Form
          layout="vertical"
          onFinish={handleUpdateProfile}
          initialValues={{
            nombre: localStorage.getItem('userName'),
            email: localStorage.getItem('userEmail')
          }}
        >
          <Form.Item
            label="Nombre"
            name="nombre"
            rules={[{ required: true, message: 'Por favor ingrese su nombre' }]}
          >
            <Input prefix={<UserOutlined />} size="large" />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Por favor ingrese su email' },
              { type: 'email', message: 'Email no válido' }
            ]}
          >
            <Input size="large" disabled />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              Actualizar Perfil
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Cambiar Contraseña">
        <Form form={form} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item
            label="Contraseña Actual"
            name="currentPassword"
            rules={[{ required: true, message: 'Por favor ingrese su contraseña actual' }]}
          >
            <Input.Password prefix={<LockOutlined />} size="large" />
          </Form.Item>

          <Form.Item
            label="Nueva Contraseña"
            name="newPassword"
            rules={[
              { required: true, message: 'Por favor ingrese la nueva contraseña' },
              { min: 6, message: 'La contraseña debe tener al menos 6 caracteres' }
            ]}
          >
            <Input.Password prefix={<LockOutlined />} size="large" />
          </Form.Item>

          <Form.Item
            label="Confirmar Nueva Contraseña"
            name="confirmPassword"
            rules={[{ required: true, message: 'Por favor confirme la nueva contraseña' }]}
          >
            <Input.Password prefix={<LockOutlined />} size="large" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              Cambiar Contraseña
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Divider />

      <Card title="Configuración del Sistema">
        <Alert
          message="Configuración Global"
          description="Aquí puedes configurar parámetros globales del sistema"
          type="info"
          showIcon
        />
        
        <div style={{ marginTop: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <Text strong>Mantener sesión iniciada:</Text>
            <Switch style={{ marginLeft: 16 }} defaultChecked />
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <Text strong>Notificaciones por email:</Text>
            <Switch style={{ marginLeft: 16 }} defaultChecked />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Configuracion;