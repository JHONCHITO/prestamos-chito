import React, { useState, useEffect } from "react";
import { Layout, Menu, Avatar, Dropdown, Space, Typography, Tooltip } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  DollarOutlined,
  TeamOutlined,
  FileTextOutlined,
  SettingOutlined,
  CalendarOutlined,
  WalletOutlined,
  BankOutlined
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import Notificaciones from "./Notificaciones";

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const AdminLayout = ({ children, user, onLogout }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState("dashboard");
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();
  const location = useLocation();

  const userName = user?.nombre || "Administrador";
  const userEmail = user?.email || "admin@empresa.com";

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const path = location.pathname.substring(1);
    setSelectedMenu(path || "dashboard");
  }, [location]);

  const handleLogout = () => {
    onLogout();
    navigate("/login");
  };

  const menuItems = [
    { key: "dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
    { key: "prestamos", icon: <DollarOutlined />, label: "Préstamos" },
    { key: "clientes", icon: <TeamOutlined />, label: "Clientes" },
    { key: "cobradores", icon: <UserOutlined />, label: "Cobradores" },
    { key: "cartera", icon: <WalletOutlined />, label: "Cartera" },
    { key: "calendario", icon: <CalendarOutlined />, label: "Calendario" },
    { key: "reportes", icon: <FileTextOutlined />, label: "Reportes" },
    { key: "configuracion", icon: <SettingOutlined />, label: "Configuración" },
  ];

  const userMenuItems = [
    { key: "profile", icon: <UserOutlined />, label: "Mi Perfil", onClick: () => navigate("/perfil") },
    { key: "logout", icon: <LogoutOutlined />, label: "Cerrar Sesión", onClick: handleLogout },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{
          background: "#001529", // Azul Marino
          boxShadow: "2px 0 10px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{
          padding: "24px 16px",
          textAlign: "center",
          borderBottom: "1px solid rgba(184, 134, 11, 0.3)", // Dorado suave
          marginBottom: 16
        }}>
          <BankOutlined style={{ fontSize: 32, color: "#B8860B", marginBottom: 8 }} />
          <Title level={4} style={{ margin: 0, color: "#B8860B", fontSize: collapsed ? 12 : 18 }}>
            {collapsed ? "GG" : "GOTA A GOTA"}
          </Title>
          {!collapsed && (
            <Text style={{ color: "#d4af37", fontSize: 10, display: "block", letterSpacing: 1 }}>
              GESTIÓN FINANCIERA
            </Text>
          )}
        </div>

        <Menu
          theme="dark"
          selectedKeys={[selectedMenu]}
          mode="inline"
          items={menuItems}
          onClick={(item) => navigate(`/${item.key}`)}
          style={{ background: "transparent" }}
        />
      </Sider>

      <Layout>
        <Header style={{
          padding: "0 24px",
          background: "#fff",
          borderBottom: "2px solid #B8860B", // Línea dorada superior
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 1000
        }}>
          <div>
            <Title level={4} style={{ margin: 0, color: "#001529" }}>
              Panel de Administración
            </Title>
          </div>

          <Space size="large">
            <Tooltip title="Hora actual">
              <Text strong style={{ color: "#B8860B", fontFamily: "monospace" }}>
                {currentTime.toLocaleTimeString("es-CO")}
              </Text>
            </Tooltip>
            <Notificaciones />
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: "pointer", padding: "4px 8px", borderRadius: 8, background: "#f0f2f5" }}>
                <Avatar icon={<UserOutlined />} style={{ background: "#B8860B" }} />
                <div style={{ lineHeight: "1.2" }}>
                  <div style={{ fontWeight: "bold", fontSize: 13 }}>{userName}</div>
                  <div style={{ fontSize: 11, color: "#8c8c8c" }}>{userEmail}</div>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: "24px", background: "#fdfaf0" }}>
          <div style={{
            padding: 24,
            background: "#fff",
            borderRadius: 8,
            minHeight: "calc(100vh - 112px)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
          }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
