import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Modal, List, Badge, Button, message, Typography, Space, Tag, Avatar, Tooltip } from 'antd';
import { BellOutlined, WarningOutlined, CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, MailOutlined } from '@ant-design/icons';

const { Text } = Typography;

const Notificaciones = () => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [socket, setSocket] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const tenantId = localStorage.getItem('tenantId');

  useEffect(() => {
    // Verificar tenantId de forma más amigable
    if (!tenantId) {
      console.log('⚠️ No hay tenantId, esperando login...');
      return;
    }

    console.log('🏢 Conectando con tenantId:', tenantId);

    // Conectar al servidor WebSocket
    const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL?.replace('/api', '') ||
  'https://prestamos-chito-backend.onrender.com';

const newSocket = io(SOCKET_URL, {
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 10000
});

    newSocket.on('connect', () => {
      console.log('✅ Conectado al servidor de notificaciones');
      newSocket.emit('join-tenant', tenantId);
      console.log('📡 Unido a sala tenant:', tenantId);
    });

    newSocket.on('recibido-recordatorio', (data) => {
      console.log('🔔 Recordatorio recibido:', data);
      
      const nuevaNotificacion = {
        id: Date.now(),
        ...data,
        leida: false,
        fecha: new Date()
      };
      
      setNotificaciones(prev => [nuevaNotificacion, ...prev]);
      
      // Mostrar notificación visual
      message.warning({
        content: data.mensaje,
        duration: 10,
        icon: <WarningOutlined />,
        style: { marginTop: '20vh' }
      });
      
      // Cambiar título si la pestaña no está activa
      if (document.hidden) {
        document.title = '⚠️ Nuevo Recordatorio - Gota a Gota';
        setTimeout(() => {
          document.title = 'Panel Administrador - Gota a Gota';
        }, 8000);
      }
      
      // Reproducir sonido de notificación (opcional)
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(e => console.log('Error reproduciendo sonido:', e));
      } catch (e) {}
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Desconectado del servidor de notificaciones');
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error);
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [tenantId]);

  const marcarComoLeida = (id) => {
    setNotificaciones(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, leida: true } : notif
      )
    );
  };

  const eliminarNotificacion = (id) => {
    setNotificaciones(prev => prev.filter(notif => notif.id !== id));
    message.success('Notificación eliminada');
  };

  const eliminarTodas = () => {
    setNotificaciones([]);
    message.success('Todas las notificaciones eliminadas');
  };

  const marcarTodasLeidas = () => {
    setNotificaciones(prev =>
      prev.map(notif => ({ ...notif, leida: true }))
    );
    message.success('Todas las notificaciones marcadas como leídas');
  };

  const notificacionesNoLeidas = notificaciones.filter(n => !n.leida).length;

  const formatFecha = (fecha) => {
    const date = new Date(fecha);
    const ahora = new Date();
    const diffMs = ahora - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMs / 3600000);
    const diffDias = Math.floor(diffMs / 86400000);
    
    if (diffMin < 1) return 'Ahora mismo';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHoras < 24) return `Hace ${diffHoras} horas`;
    if (diffDias < 7) return `Hace ${diffDias} días`;
    
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* Botón de campana en el header */}
      <Tooltip title={notificacionesNoLeidas > 0 ? `${notificacionesNoLeidas} notificaciones no leídas` : 'Notificaciones'}>
        <Badge count={notificacionesNoLeidas} offset={[-5, 5]} style={{ backgroundColor: '#ff4d4f' }}>
          <Button
            type="text"
            icon={<BellOutlined style={{ fontSize: 20, color: '#00aa66' }} />}
            onClick={() => setModalVisible(true)}
            style={{ 
              padding: '8px',
              height: 'auto',
              background: notificacionesNoLeidas > 0 ? 'rgba(255,77,79,0.1)' : 'transparent'
            }}
          />
        </Badge>
      </Tooltip>

      {/* Modal de notificaciones */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <BellOutlined />
              <span>Notificaciones de Pago</span>
              {notificacionesNoLeidas > 0 && (
                <Tag color="red">{notificacionesNoLeidas} nuevas</Tag>
              )}
            </Space>
            <Space>
              {notificaciones.length > 0 && (
                <>
                  <Button size="small" onClick={marcarTodasLeidas}>
                    Marcar todas leídas
                  </Button>
                  <Button size="small" danger onClick={eliminarTodas}>
                    Eliminar todas
                  </Button>
                </>
              )}
            </Space>
          </div>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            Cerrar
          </Button>
        ]}
        width={550}
        styles={{ body: { maxHeight: 500, overflow: 'auto', padding: '16px' } }}
      >
        {notificaciones.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <BellOutlined style={{ fontSize: 64, color: '#ccc' }} />
            <p style={{ marginTop: 16, color: '#999', fontSize: 16 }}>
              No hay notificaciones
            </p>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Cuando recibas recordatorios de pago aparecerán aquí
            </Text>
          </div>
        ) : (
          <List
            dataSource={notificaciones}
            renderItem={(notif) => (
              <div
                style={{
                  padding: '12px 16px',
                  marginBottom: '12px',
                  background: notif.leida ? '#fafafa' : '#fff7e6',
                  borderRadius: '12px',
                  borderLeft: `4px solid ${notif.leida ? '#d9d9d9' : '#ff4d4f'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
                onClick={() => marcarComoLeida(notif.id)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Space align="start">
                    <Avatar 
                      size="small" 
                      icon={<WarningOutlined />} 
                      style={{ 
                        backgroundColor: notif.leida ? '#d9d9d9' : '#ff4d4f',
                        marginTop: 2
                      }} 
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <Text strong style={{ color: '#ff4d4f' }}>
                          {notif.empresa}
                        </Text>
                        <Tag color="red" size="small">
                          {notif.diasAtraso} días atraso
                        </Tag>
                      </div>
                      
                      <div style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: 14 }}>{notif.mensaje}</Text>
                      </div>
                      
                      <div style={{ fontSize: 11, color: '#999', display: 'flex', gap: 16 }}>
                        <span>📅 Vence: {notif.fechaVencimiento}</span>
                        <span>💰 Monto: ${notif.monto?.toLocaleString()}</span>
                      </div>
                      
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 6 }}>
                        {formatFecha(notif.fecha)}
                      </div>
                    </div>
                  </Space>
                  
                  {!notif.leida && (
                    <Badge status="processing" color="red" />
                  )}
                </div>
                
                <div style={{ position: 'absolute', bottom: 8, right: 12 }}>
                  <Button
                    type="link"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      eliminarNotificacion(notif.id);
                    }}
                    style={{ padding: 0, color: '#999' }}
                  />
                </div>
              </div>
            )}
          />
        )}
      </Modal>
    </>
  );
};

export default Notificaciones;