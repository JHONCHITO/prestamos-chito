import React from 'react';
import { Card, Divider, Space, Typography, Alert, Button } from 'antd';
import { MailOutlined, PhoneOutlined, LinkOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text, List } = Typography;

const APP_NAME = 'Prestamos Chito';
const SUPPORT_EMAIL = 'jhon6683chito@gmail.com';
const SUPPORT_PHONE = '+57 318 709 2130';
const LAST_UPDATED = '9 de mayo de 2026';

function PageShell({ title, subtitle, children, extra }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '32px 16px',
        background: 'linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)',
      }}
    >
      <Card
        style={{
          maxWidth: 980,
          margin: '0 auto',
          borderRadius: 20,
          boxShadow: '0 16px 48px rgba(15, 23, 42, 0.08)',
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text type="secondary" style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
              {APP_NAME}
            </Text>
            <Title level={1} style={{ marginBottom: 8, marginTop: 8 }}>
              {title}
            </Title>
            <Paragraph style={{ fontSize: 16, marginBottom: 0 }}>{subtitle}</Paragraph>
          </div>

          {extra}

          <div>{children}</div>

          <Divider />

          <Space direction="vertical" size={4}>
            <Text type="secondary">Actualizada: {LAST_UPDATED}</Text>
            <Text type="secondary">
              Contacto: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </Text>
            <Text type="secondary">Teléfono: {SUPPORT_PHONE}</Text>
          </Space>
        </Space>
      </Card>
    </div>
  );
}

export function PrivacyPolicyPage() {
  return (
    <PageShell
      title="Política de Privacidad"
      subtitle="Esta página explica cómo Prestamos Chito trata la información de clientes, prospectos y conversaciones recibidas por WhatsApp, Instagram, Facebook y otros canales."
      extra={
        <Alert
          type="info"
          showIcon
          message="Uso de datos"
          description="La información se usa para evaluar solicitudes de préstamo, gestionar cartera, responder mensajes, registrar pagos, dar soporte y cumplir obligaciones operativas y de seguridad."
        />
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card size="small">
          <Title level={4}>Datos que podemos recopilar</Title>
          <List
            dataSource={[
              'Nombre, cédula, teléfono, ciudad y datos de contacto.',
              'Información relacionada con solicitudes de préstamo, cartera, pagos y estado de crédito.',
              'Mensajes, audios, archivos o imágenes enviados por los canales de atención.',
              'Datos técnicos mínimos para operación, auditoría y seguridad.',
            ]}
            renderItem={(item) => <List.Item>{item}</List.Item>}
          />
        </Card>

        <Card size="small">
          <Title level={4}>Cómo usamos la información</Title>
          <Paragraph>
            Usamos estos datos para atender solicitudes, responder mensajes automáticamente o con
            apoyo humano, administrar oficinas, asignar cobradores, registrar pagos, generar
            reportes y mejorar la calidad del servicio.
          </Paragraph>
        </Card>

        <Card size="small">
          <Title level={4}>Compartición y acceso</Title>
          <Paragraph>
            La información se comparte solo con personal autorizado de la oficina correspondiente
            y con los proveedores tecnológicos necesarios para operar la plataforma. No vendemos
            información personal.
          </Paragraph>
        </Card>

        <Card size="small">
          <Title level={4}>Conservación y seguridad</Title>
          <Paragraph>
            Conservamos la información mientras sea necesaria para prestar el servicio, cumplir
            obligaciones legales y mantener trazabilidad operativa. Aplicamos controles de acceso
            y separación por oficina o tenant.
          </Paragraph>
        </Card>
      </Space>
    </PageShell>
  );
}

export function TermsOfServicePage() {
  return (
    <PageShell
      title="Términos del Servicio"
      subtitle="Condiciones generales de uso para los canales digitales y la operación de Prestamos Chito."
      extra={
        <Alert
          type="warning"
          showIcon
          message="Importante"
          description="Al usar nuestros canales, aceptas que las conversaciones pueden registrarse para fines operativos, de atención y auditoría."
        />
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card size="small">
          <Title level={4}>1. Uso permitido</Title>
          <Paragraph>
            Los canales de Prestamos Chito deben usarse para consultas, solicitudes, seguimiento
            de crédito, pagos y comunicaciones relacionadas con la operación de la empresa.
          </Paragraph>
        </Card>

        <Card size="small">
          <Title level={4}>2. Responsabilidad del usuario</Title>
          <Paragraph>
            El usuario se compromete a proporcionar información veraz y a no usar los canales para
            fraude, spam, suplantación o actividades ilegales.
          </Paragraph>
        </Card>

        <Card size="small">
          <Title level={4}>3. Automatización</Title>
          <Paragraph>
            Parte de la atención puede ser automatizada mediante inteligencia artificial. Si la
            conversación requiere revisión humana, el sistema puede derivarla a un agente.
          </Paragraph>
        </Card>

        <Card size="small">
          <Title level={4}>4. Cambios</Title>
          <Paragraph>
            Prestamos Chito puede actualizar estos términos cuando sea necesario para la operación,
            seguridad o cumplimiento normativo.
          </Paragraph>
        </Card>
      </Space>
    </PageShell>
  );
}

export function DataDeletionPage() {
  return (
    <PageShell
      title="Solicitud de Eliminación de Datos"
      subtitle="Si deseas que eliminemos tus datos asociados a nuestra plataforma, sigue estos pasos."
      extra={
        <Alert
          type="success"
          showIcon
          message="Cómo solicitarlo"
          description="Envíanos un correo con tu nombre completo, número de teléfono, oficina o canal de contacto y la solicitud clara de eliminación o revisión de datos."
        />
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card size="small">
          <Title level={4}>Pasos</Title>
          <List
            dataSource={[
              'Escribe a nuestro correo de soporte.',
              'Indica tu nombre completo y el teléfono con el que nos contactaste.',
              'Explica si quieres eliminar, corregir o consultar tus datos.',
              'Nuestro equipo validará la solicitud y te responderá por el mismo medio.',
            ]}
            renderItem={(item) => <List.Item>{item}</List.Item>}
          />
        </Card>

        <Card size="small">
          <Title level={4}>Contacto directo</Title>
          <Space direction="vertical" size={8}>
            <Button icon={<MailOutlined />} href={`mailto:${SUPPORT_EMAIL}?subject=Solicitud%20de%20eliminaci%C3%B3n%20de%20datos`}>
              Escribir al correo de soporte
            </Button>
            <Button icon={<PhoneOutlined />} href={`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`}>
              Llamar a soporte
            </Button>
            <Button icon={<LinkOutlined />} href="https://prestamos-chito.vercel.app" target="_blank" rel="noreferrer">
              Ir al sitio
            </Button>
          </Space>
        </Card>
      </Space>
    </PageShell>
  );
}

export function AuthorizationCancelledPage() {
  return (
    <PageShell
      title="Autorización Cancelada"
      subtitle="Esta página se muestra si el usuario cancela el proceso de autorización o inicio de sesión."
      extra={
        <Alert
          type="warning"
          showIcon
          message="Proceso cancelado"
          description="No se ha realizado ningún cambio. Puedes volver al canal o cerrar esta ventana."
        />
      }
    >
      <Card size="small">
        <Title level={4}>¿Qué significa?</Title>
        <Paragraph>
          El usuario decidió no continuar con el flujo de autorización. No se recopila información
          adicional en esta pantalla.
        </Paragraph>
      </Card>
    </PageShell>
  );
}
