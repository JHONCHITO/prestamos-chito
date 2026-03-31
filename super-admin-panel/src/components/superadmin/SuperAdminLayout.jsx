import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import {
  Layout,
  Menu,
  Avatar,
  Badge,
  Dropdown,
  Space,
  Typography,
  Button,
  Tooltip,
  Modal,
  message,
  Tag,
} from 'antd';
import {
  DashboardOutlined,
  ShopOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  NotificationOutlined,
  SunOutlined,
  MoonOutlined,
  StopOutlined,
  WarningOutlined,
  MessageOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import OficinasManager from './OficinasManager';
import Reportes from './Reportes';
import Configuracion from './Configuracion';
import {
  getOficinas,
  cambiarEstadoOficina,
  getEmpresasMorosas,
} from '../../api/superadmin';
import './SuperAdminLayout.css';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const SuperAdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [notificacionesSocket, setNotificacionesSocket] = useState([]);
  const [loading, setLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const navigate = useNavigate();

  const userName = localStorage.getItem('userName') || 'Super Admin';
  const userEmail = localStorage.getItem('userEmail') || 'admin@super.com';

  // Socket.io
  useEffect(() => {
        const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
        const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('✅ Conectado al servidor WebSocket');
      newSocket.emit('join-superadmin');
    });

    newSocket.on('nueva-notificacion', (data) => {
      console.log('🔔 Nueva notificación de pago:', data);
      setNotificacionesSocket((prev) => [
        {
          ...data,
          id: Date.now(),
          leida: false,
        },
        ...prev,
      ]);
      message.success(data.mensaje, 4);
    });

    newSocket.on('recordatorio-enviado', (data) => {
      console.log('✅ Recordatorio enviado:', data);
      message.success(`✅ ${data.mensaje}`, 3);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error);
      message.warning('Conectando al servidor de notificaciones...', 2);
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, []);

  // Verificar pagos pendientes
  const verificarPagosPendientes = async () => {
    try {
      setLoading(true);

      try {
        const morosas = await getEmpresasMorosas();
        if (morosas && morosas.length > 0) {
          setNotificaciones(morosas);
          if (morosas.length > 0) {
            message.warning(
              `${morosas.length} empresa(s) con pagos pendientes`,
              3,
            );
          }
          return;
        }
      } catch (apiError) {
        console.log('API de pagos no disponible, usando simulación');
      }

      const oficinas = await getOficinas();
      const hoy = new Date();
      const morosas = [];

      for (const empresa of oficinas) {
        if (!empresa.estado) continue;

        const fechaCreacion = new Date(empresa.fechaCreacion);
        const diasDesdeCreacion = Math.floor(
          (hoy - fechaCreacion) / (1000 * 60 * 60 * 24),
        );

        if (diasDesdeCreacion >= 30) {
          const fechaVencimiento = new Date(fechaCreacion);
          fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 1);

          if (fechaVencimiento <= hoy) {
            const diasAtraso = Math.floor(
              (hoy - fechaVencimiento) / (1000 * 60 * 60 * 24),
            );
            const empresasMorosasSimuladas = ['popayan2', 'cali22'];
            if (
              empresasMorosasSimuladas.includes(
                empresa.tenantId?.toLowerCase(),
              )
            ) {
              morosas.push({
                id: empresa._id,
                nombre: empresa.nombre,
                tenantId: empresa.tenantId,
                fechaCreacion: empresa.fechaCreacion,
                fechaVencimiento: fechaVencimiento
                  .toISOString()
                  .split('T')[0],
                diasAtraso,
                montoPendiente: 350000,
                contacto: `admin@${empresa.tenantId}.com`,
                estado: empresa.estado,
              });
            }
          }
        }
      }

      setNotificaciones(morosas);

      if (morosas.length > 0) {
        message.warning(
          `${morosas.length} empresa(s) con pagos pendientes`,
          3,
        );
      }
    } catch (error) {
      console.error('Error verificando pagos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verificarPagosPendientes();
    const interval = setInterval(verificarPagosPendientes, 21600000);
    return () => clearInterval(interval);
  }, []);

  const enviarRecordatorioApp = (empresa) => {
    if (socket && socket.connected) {
      console.log('📤 Enviando recordatorio a:', empresa.nombre);
      socket.emit('enviar-recordatorio', {
        tenantId: empresa.tenantId,
        empresa: empresa.nombre,
        monto: empresa.montoPendiente,
        diasAtraso: empresa.diasAtraso,
        fechaVencimiento: empresa.fechaVencimiento,
      });
      message.loading({
        content: `Enviando recordatorio a ${empresa.nombre}...`,
        key: 'recordatorio',
        duration: 1,
      });
    } else {
      message.error('No hay conexión con el servidor de notificaciones');
    }
  };

  const desactivarEmpresa = async (empresa) => {
    Modal.confirm({
      title: `⚠️ Desactivar empresa ${empresa.nombre}`,
      content: `Esta empresa tiene ${empresa.diasAtraso} días de atraso en el pago. ¿Está seguro de desactivarla?`,
      okText: 'Sí, desactivar',
      cancelText: 'Cancelar',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await cambiarEstadoOficina(empresa.id, false);
          message.success(
            `Empresa ${empresa.nombre} desactivada correctamente`,
          );
          verificarPagosPendientes();
        } catch (error) {
          message.error('Error al desactivar empresa: ' + error.message);
        }
      },
    });
  };

  const marcarComoLeida = (id) => {
    setNotificacionesSocket((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, leida: true } : notif,
      ),
    );
  };

  const eliminarNotificacion = (id) => {
    setNotificacionesSocket((prev) =>
      prev.filter((notif) => notif.id !== id),
    );
  };

  const notificacionesNoLeidas = notificacionesSocket.filter(
    (n) => !n.leida,
  ).length;

  const notificationMenu = {
    items: [
      ...notificacionesSocket.slice(0, 5).map((notif) => ({
        key: notif.id,
        label: (
          <div
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid #f0f0f0',
              background: notif.leida
                ? 'transparent'
                : 'rgba(24,144,255,0.05)',
              cursor: 'pointer',
            }}
            onClick={() => marcarComoLeida(notif.id)}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 4,
              }}
            >
              {notif.type === 'pago' ? (
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
              ) : (
                <MessageOutlined style={{ color: '#1890ff' }} />
              )}
              <Text strong style={{ fontSize: 13 }}>
                {notif.mensaje}
              </Text>
            </div>
            <div style={{ fontSize: 11, color: '#999' }}>
              {new Date(notif.fecha).toLocaleString()}
            </div>
            <Button
              type="link"
              size="small"
              style={{ padding: 0, marginTop: 4, fontSize: 11 }}
              onClick={(e) => {
                e.stopPropagation();
                eliminarNotificacion(notif.id);
              }}
            >
              Eliminar
            </Button>
          </div>
        ),
      })),
      ...(notificacionesSocket.length > 0 && notificaciones.length > 0
        ? [{ type: 'divider' }]
        : []),
      ...notificaciones.map((empresa) => ({
        key: `morosa-${empresa.id}`,
        label: (
          <div
            style={{
              padding: '8px 0',
              minWidth: 280,
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <Space>
                <WarningOutlined
                  style={{
                    color:
                      empresa.diasAtraso > 30 ? '#ff4d4f' : '#faad14',
                  }}
                />
                <Text
                  strong
                  style={{
                    color:
                      empresa.diasAtraso > 30 ? '#ff4d4f' : '#faad14',
                  }}
                >
                  {empresa.nombre}
                </Text>
              </Space>
              <Tag
                color={empresa.diasAtraso > 30 ? 'red' : 'orange'}
              >
                {empresa.diasAtraso} días
              </Tag>
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#666',
                marginBottom: 8,
              }}
            >
              Vence: {empresa.fechaVencimiento} | Adeuda: $
              {empresa.montoPendiente.toLocaleString()}
            </div>
            <Space size={8}>
              <Button
                size="small"
                type="primary"
                icon={<MessageOutlined />}
                onClick={() => enviarRecordatorioApp(empresa)}
              >
                Enviar Recordatorio
              </Button>
              <Button
                size="small"
                danger
                icon={<StopOutlined />}
                onClick={() => desactivarEmpresa(empresa)}
              >
                Desactivar
              </Button>
            </Space>
          </div>
        ),
      })),
    ].filter(Boolean),
  };

  if (notificationMenu.items.length === 0) {
    notificationMenu.items = [
      {
        key: 'empty',
        label: (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            <Text type="secondary">No hay notificaciones</Text>
          </div>
        ),
      },
    ];
  }

  const renderContent = () => {
    switch (selectedMenu) {
      case 'dashboard':
        return <Dashboard notificaciones={notificaciones} />;
      case 'oficinas':
        return <OficinasManager />;
      case 'reportes':
        return <Reportes />;
      case 'configuracion':
        return <Configuracion />;
      default:
        return <Dashboard notificaciones={notificaciones} />;
    }
  };

  const handleLogout = () => {
    if (socket) socket.disconnect();
    localStorage.clear();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Cerrar Sesión',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout
      style={{ minHeight: '100vh' }}
      className={darkMode ? 'dark-theme' : 'light-theme'}
    >
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        style={{
          background: 'linear-gradient(180deg, #0d1b2a 0%, #1b263b 100%)',
          boxShadow: '4px 0 20px rgba(0,0,0,0.4)',
        }}
      >
        {/* LOGO NUEVO */}
        <div className="logo-container">
          <div
            className="logo-icon"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
  width={collapsed ? 34 : 40}
  height={collapsed ? 34 : 40}
  viewBox="0 0 64 64"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  aria-label="Logo CHITO Banco"
>
  <defs>
    <linearGradient id="chitoBank" x1="0" y1="0" x2="64" y2="64">
      <stop offset="0%" stopColor="#fbc02d" />
      <stop offset="100%" stopColor="#ffb300" />
    </linearGradient>
  </defs>

  {/* Círculo de fondo suave */}
  <circle
    cx="32"
    cy="32"
    r="30"
    stroke="url(#chitoBank)"
    strokeWidth="2.5"
    opacity="0.2"
  />

  {/* Techo del banco */}
  <path
    d="M12 24L32 12L52 24"
    stroke="url(#chitoBank)"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  />

  {/* Columnas */}
  <line
    x1="18"
    y1="26"
    x2="18"
    y2="44"
    stroke="url(#chitoBank)"
    strokeWidth="3"
    strokeLinecap="round"
  />
  <line
    x1="26"
    y1="26"
    x2="26"
    y2="44"
    stroke="url(#chitoBank)"
    strokeWidth="3"
    strokeLinecap="round"
  />
  <line
    x1="38"
    y1="26"
    x2="38"
    y2="44"
    stroke="url(#chitoBank)"
    strokeWidth="3"
    strokeLinecap="round"
  />
  <line
    x1="46"
    y1="26"
    x2="46"
    y2="44"
    stroke="url(#chitoBank)"
    strokeWidth="3"
    strokeLinecap="round"
  />

  {/* Base */}
  <rect
    x="14"
    y="44"
    width="36"
    height="4"
    rx="2"
    fill="url(#chitoBank)"
  />
</svg>
          </div>

          {!collapsed && (
            <div className="logo-text" style={{ lineHeight: 1.1 }}>
              <Title
                level={4}
                style={{
                  margin: 0,
                  color: '#4fc3f7',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                }}
              >
                JR-CHITO
              </Title>
              <Text
                style={{
                  color: '#90a4ae',
                  fontSize: 12,
                  letterSpacing: '0.3px',
                }}
              >
                Control Galáctico
              </Text>
            </div>
          )}
        </div>

        <Menu
          theme="dark"
          selectedKeys={[selectedMenu]}
          mode="inline"
          items={[
            {
              key: 'dashboard',
              icon: <DashboardOutlined />,
              label: 'Dashboard',
            },
            { key: 'oficinas', icon: <ShopOutlined />, label: 'Oficinas' },
            {
              key: 'reportes',
              icon: <BarChartOutlined />,
              label: 'Reportes',
            },
            {
              key: 'configuracion',
              icon: <SettingOutlined />,
              label: 'Configuración',
            },
          ]}
          onClick={(item) => setSelectedMenu(item.key)}
          style={{ background: 'transparent' }}
        />

        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: collapsed ? 20 : 70,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: socket?.connected ? '#52c41a' : '#ff4d4f',
              boxShadow: socket?.connected ? '0 0 5px #52c41a' : 'none',
            }}
          />
          {!collapsed && (
            <Text style={{ color: '#90a4ae', fontSize: 10 }}>
              {socket?.connected ? 'Conectado' : 'Sin conexión'}
            </Text>
          )}
        </div>
      </Sider>

      <Layout>
        <Header
          style={{
            padding: '0 24px',
            background: darkMode
              ? 'rgba(13, 27, 42, 0.97)'
              : 'rgba(255, 255, 255, 0.97)',
            backdropFilter: 'blur(10px)',
            borderBottom: `1px solid ${
              darkMode ? '#1b263b' : '#dce3ea'
            }`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
          }}
        >
          <div>
            <Title
              level={4}
              style={{
                margin: 0,
                background:
                  'linear-gradient(135deg, #4fc3f7, #1565c0)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Panel de Control Galáctico
            </Title>
          </div>

          <div>
            <Space size="large">
              <Tooltip title="Cambiar tema">
                <Button
                  type="text"
                  icon={darkMode ? <SunOutlined /> : <MoonOutlined />}
                  onClick={() => setDarkMode(!darkMode)}
                  style={{ fontSize: 18 }}
                />
              </Tooltip>

              <Dropdown
                menu={notificationMenu}
                placement="bottomRight"
                trigger={['click']}
                overlayStyle={{
                  maxWidth: 380,
                  maxHeight: 500,
                  overflow: 'auto',
                }}
              >
                <Badge
                  count={notificacionesNoLeidas + notificaciones.length}
                  offset={[-5, 5]}
                  style={{ backgroundColor: '#ff4d4f' }}
                >
                  <Button
                    type="text"
                    icon={
                      <NotificationOutlined style={{ fontSize: 18 }} />
                    }
                    style={{
                      background:
                        notificacionesNoLeidas + notificaciones.length >
                        0
                          ? 'rgba(255,77,79,0.1)'
                          : 'transparent',
                    }}
                  />
                </Badge>
              </Dropdown>

              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
              >
                <Space style={{ cursor: 'pointer' }}>
                  <Avatar
                    icon={<UserOutlined />}
                    style={{
                      background:
                        'linear-gradient(135deg, #4fc3f7, #1565c0)',
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{userName}</div>
                    <div
                      style={{ fontSize: 12, color: '#90a4ae' }}
                    >
                      {userEmail}
                    </div>
                  </div>
                </Space>
              </Dropdown>
            </Space>
          </div>
        </Header>

        <Content style={{ margin: '24px' }}>
          <div
            style={{
              padding: 24,
              minHeight: 360,
              background: darkMode
                ? 'rgba(13, 27, 42, 0.85)'
                : '#fff',
              borderRadius: 16,
              backdropFilter: darkMode ? 'blur(10px)' : 'none',
            }}
          >
            {renderContent()}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default SuperAdminLayout;
