import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  CheckCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  SaveOutlined,
  SendOutlined,
  ThunderboltOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { API_URL, metaAPI } from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const unwrap = (response) => response?.data ?? response;

function dedupeCampaigns(list = []) {
  const seen = new Set();

  return list.filter((item) => {
    const key = item?._id
      ? String(item._id)
      : `${String(item?.name || '')}:${String(item?.channel || '')}:${String(item?.createdAt || '')}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

const channelLabel = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
};

const statusColor = {
  draft: 'default',
  queued: 'blue',
  processing: 'gold',
  completed: 'green',
  partial: 'orange',
  failed: 'red',
};

const statusLabel = {
  draft: 'Borrador',
  queued: 'En cola',
  processing: 'Procesando',
  completed: 'Completada',
  partial: 'Parcial',
  failed: 'Fallida',
};

const defaultConfig = {
  name: 'Meta Office',
  active: true,
  autoReplyEnabled: true,
  webhookVerifyToken: '',
  webhookAppSecret: '',
  graphApiVersion: 'v21.0',
  channels: {
    whatsapp: {
      enabled: true,
      senderId: '',
      accessToken: '',
      verifyToken: '',
      appSecret: '',
      businessAccountId: '',
      phoneNumberId: '',
      defaultReplyMode: 'auto',
      welcomeMessage: '',
      fallbackMessage: '',
    },
    instagram: {
      enabled: false,
      senderId: '',
      accessToken: '',
      verifyToken: '',
      appSecret: '',
      pageId: '',
      instagramUserId: '',
      defaultReplyMode: 'auto',
      welcomeMessage: '',
      fallbackMessage: '',
    },
    facebook: {
      enabled: false,
      senderId: '',
      accessToken: '',
      verifyToken: '',
      appSecret: '',
      pageId: '',
      defaultReplyMode: 'auto',
      welcomeMessage: '',
      fallbackMessage: '',
    },
  },
};

const defaultCampaign = {
  name: '',
  channel: 'whatsapp',
  sendMode: 'text',
  templateName: '',
  templateLanguage: 'es',
  message: '',
  audience: {
    filter: {
      estado: 'activo',
      tipoCliente: '',
      search: '',
    },
  },
};

const WEBHOOK_URL = `${String(API_URL || '').replace(/\/api\/?$/, '')}/api/meta/webhook`;

export default function CanalesMeta() {
  const [configForm] = Form.useForm();
  const [campaignForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [integration, setIntegration] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [previewData, setPreviewData] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [configResponse, campaignsResponse] = await Promise.all([
        metaAPI.getConfig(),
        metaAPI.listCampaigns({ limit: 25 }),
      ]);

      const configData = unwrap(configResponse);
      const campaignData = unwrap(campaignsResponse);

      const config = configData?.integration || configData;
      setIntegration(config);
      configForm.setFieldsValue({ ...defaultConfig, ...config });

      setCampaigns(dedupeCampaigns(Array.isArray(campaignData?.campaigns) ? campaignData.campaigns : []));
      campaignForm.setFieldsValue(defaultCampaign);
    } catch (error) {
      message.error(error.response?.data?.error || error.message || 'No se pudo cargar Meta');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveConfig = async (values) => {
    try {
      setSavingConfig(true);
      const response = await metaAPI.saveConfig(values);
      const data = unwrap(response);
      const config = data?.integration || data;
      setIntegration(config);
      message.success('Configuracion de Meta guardada');
    } catch (error) {
      message.error(error.response?.data?.error || error.message || 'No se pudo guardar la configuracion');
    } finally {
      setSavingConfig(false);
    }
  };

  const buildCampaignPayload = (values, autoSend = true) => ({
    ...values,
    channel: values.channel || 'whatsapp',
    autoSend,
  });

  const handlePreview = async () => {
    try {
      const values = await campaignForm.validateFields();
      setSavingCampaign(true);
      const response = await metaAPI.previewCampaign(buildCampaignPayload(values, false));
      const data = unwrap(response);
      setPreviewData(data);
      message.success(`Previsualizacion lista: ${data.total || 0} contactos`);
    } catch (error) {
      if (error?.errorFields) {
        return;
      }
      message.error(error.response?.data?.error || error.message || 'No se pudo previsualizar');
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleCreateCampaign = async (autoSend = true) => {
    try {
      const values = await campaignForm.validateFields();
      setSavingCampaign(true);
      const response = await metaAPI.createCampaign(buildCampaignPayload(values, autoSend));
      const data = unwrap(response);
      const campaign = data?.campaign || data;
      message.success(autoSend ? 'Campana creada y enviada' : 'Borrador guardado');
      setCampaigns((prev) => dedupeCampaigns([campaign, ...prev]).slice(0, 25));
      setPreviewData(null);
      campaignForm.resetFields();
      campaignForm.setFieldsValue(defaultCampaign);
      await loadData();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }
      message.error(error.response?.data?.error || error.message || 'No se pudo crear la campana');
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleSendExisting = async (record) => {
    try {
      setSavingCampaign(true);
      const response = await metaAPI.sendCampaign(record._id);
      const data = unwrap(response);
      const updated = data?.campaign || data;
      setCampaigns((prev) => dedupeCampaigns(prev.map((item) => (item._id === updated._id ? updated : item))));
      message.success('Campana enviada');
    } catch (error) {
      message.error(error.response?.data?.error || error.message || 'No se pudo enviar la campana');
    } finally {
      setSavingCampaign(false);
    }
  };

  const currentCampaignMode = Form.useWatch('sendMode', campaignForm) || 'text';

  const campaignColumns = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Canal',
      dataIndex: 'channel',
      key: 'channel',
      render: (value) => <Tag color="blue">{channelLabel[value] || value}</Tag>,
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (value) => <Tag color={statusColor[value] || 'default'}>{statusLabel[value] || value}</Tag>,
    },
    {
      title: 'Destino',
      dataIndex: ['totals', 'total'],
      key: 'total',
      render: (_, record) => `${record.totals?.sent || 0}/${record.totals?.total || 0}`,
    },
    {
      title: 'Fallos',
      dataIndex: ['totals', 'failed'],
      key: 'failed',
      render: (_, record) => record.totals?.failed || 0,
    },
    {
      title: 'Creada',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value) => (value ? new Date(value).toLocaleString('es-CO') : '-'),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<SendOutlined />}
            onClick={() => handleSendExisting(record)}
            disabled={savingCampaign || record.status === 'processing'}
          >
            Enviar
          </Button>
        </Space>
      ),
    },
  ];

  const summaryCard = (title, field, channelKey) => {
    const config = integration?.channels?.[channelKey] || {};
    return (
      <Card size="small" style={{ height: '100%' }}>
        <Space direction="vertical" style={{ width: '100%' }} size={4}>
          <Space style={{ justifyContent: 'space-between', width: '100%' }}>
            <Text strong>{title}</Text>
            <Tag color={config.enabled ? 'green' : 'red'}>{config.enabled ? 'Activo' : 'Inactivo'}</Tag>
          </Space>
          <Text type="secondary">{field}: {config.senderId || config.phoneNumberId || config.pageId || config.instagramUserId || '-'}</Text>
          <Text type="secondary">Modo: {config.defaultReplyMode || 'auto'}</Text>
        </Space>
      </Card>
    );
  };

  return (
    <Spin spinning={loading}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>Canales Meta</Title>
          <Paragraph style={{ marginBottom: 0 }}>
            Conecta WhatsApp, Instagram y Facebook al mismo cerebro IA y administra campanas de difusion por WhatsApp.
          </Paragraph>
        </div>

        <Alert
          type="info"
          showIcon
          message="Mensajeria unificada"
          description="Los mensajes entrantes de WhatsApp, Instagram y Facebook pasan por el mismo RAG y quedan visibles en la bandeja de conversacion."
        />

        <Card size="small" title="Datos para conectar Meta">
          <Space direction="vertical" style={{ width: '100%' }} size={4}>
            <Text strong>Webhook callback URL</Text>
            <Input value={WEBHOOK_URL} readOnly />
            <Text type="secondary">
              Usa esta URL en Meta Developer. El verify token debe coincidir con el que guardes en la integracion.
            </Text>
          </Space>
        </Card>

        <Card size="small" title="Que va en cada campo">
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Text strong>General</Text>
            <Text type="secondary">
              webhookVerifyToken es la clave compartida del webhook. webhookAppSecret es el App Secret de la app de Meta. graphApiVersion normalmente va en v21.0.
            </Text>
            <Text strong>WhatsApp</Text>
            <Text type="secondary">
              phoneNumberId es el Phone Number ID de WhatsApp Cloud API. businessAccountId es el WABA ID. accessToken debe ser el token permanente. senderId puede ser el mismo phoneNumberId.
            </Text>
            <Text strong>Instagram</Text>
            <Text type="secondary">
              instagramUserId o pageId identifica la cuenta conectada. accessToken y appSecret deben pertenecer a la misma app de Meta.
            </Text>
            <Text strong>Facebook</Text>
            <Text type="secondary">
              pageId es la pagina conectada a Messenger. accessToken y appSecret deben coincidir con la app de Meta.
            </Text>
            <Text type="secondary">
              defaultReplyMode: auto = responde solo, auto_then_human = responde y deriva, human_only = solo humano.
            </Text>
          </Space>
        </Card>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            {summaryCard('WhatsApp', 'Phone ID', 'whatsapp')}
          </Col>
          <Col xs={24} md={8}>
            {summaryCard('Instagram', 'IG User', 'instagram')}
          </Col>
          <Col xs={24} md={8}>
            {summaryCard('Facebook', 'Page ID', 'facebook')}
          </Col>
        </Row>

        <Card
          title="Configuracion Meta por oficina"
          extra={
            <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
              Recargar
            </Button>
          }
        >
          <Form
            form={configForm}
            layout="vertical"
            onFinish={handleSaveConfig}
            initialValues={defaultConfig}
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="name" label="Nombre de la integracion">
                  <Input placeholder="Meta Oficina Principal" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="active" label="Activo" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="autoReplyEnabled" label="Auto respuesta" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="webhookVerifyToken" label="Verify token webhook">
                  <Input placeholder="Token compartido del webhook" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="webhookAppSecret" label="App secret webhook">
                  <Input.Password placeholder="Secreto de Meta App" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="graphApiVersion" label="Graph API version">
                  <Input placeholder="v21.0" />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">WhatsApp</Divider>
            <Row gutter={16}>
              <Col xs={24} md={4}>
                <Form.Item name={['channels', 'whatsapp', 'enabled']} label="Activo" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col xs={24} md={10}>
                <Form.Item name={['channels', 'whatsapp', 'senderId']} label="Sender ID / Phone Number ID">
                  <Input placeholder="123456789" />
                </Form.Item>
              </Col>
              <Col xs={24} md={10}>
                <Form.Item name={['channels', 'whatsapp', 'accessToken']} label="Access token">
                  <Input.Password placeholder="EAAG..." />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name={['channels', 'whatsapp', 'verifyToken']} label="Verify token">
                  <Input placeholder="Verify token WhatsApp" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name={['channels', 'whatsapp', 'appSecret']} label="App secret">
                  <Input.Password placeholder="App secret WhatsApp" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name={['channels', 'whatsapp', 'businessAccountId']} label="Business account ID">
                  <Input placeholder="123456789" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name={['channels', 'whatsapp', 'phoneNumberId']} label="Phone number ID">
                  <Input placeholder="123456789" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name={['channels', 'whatsapp', 'defaultReplyMode']} label="Modo de respuesta">
                  <Select
                    options={[
                      { value: 'auto', label: 'Auto' },
                      { value: 'auto_then_human', label: 'Auto y derivar' },
                      { value: 'human_only', label: 'Solo humano' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name={['channels', 'whatsapp', 'notes']} label="Notas">
                  <Input placeholder="Notas internas" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name={['channels', 'whatsapp', 'welcomeMessage']} label="Mensaje de bienvenida">
              <TextArea rows={2} placeholder="Hola, soy el asistente..." />
            </Form.Item>
            <Form.Item name={['channels', 'whatsapp', 'fallbackMessage']} label="Fallback de voz o audio">
              <TextArea rows={2} placeholder="No pude leer tu mensaje..." />
            </Form.Item>

            <Divider orientation="left">Instagram</Divider>
            <Row gutter={16}>
              <Col xs={24} md={4}>
                <Form.Item name={['channels', 'instagram', 'enabled']} label="Activo" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col xs={24} md={10}>
                <Form.Item name={['channels', 'instagram', 'senderId']} label="Sender ID / IG User ID">
                  <Input placeholder="123456789" />
                </Form.Item>
              </Col>
              <Col xs={24} md={10}>
                <Form.Item name={['channels', 'instagram', 'accessToken']} label="Access token">
                  <Input.Password placeholder="EAAG..." />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name={['channels', 'instagram', 'pageId']} label="Page ID">
                  <Input placeholder="123456789" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name={['channels', 'instagram', 'appSecret']} label="App secret">
                  <Input.Password placeholder="App secret Instagram" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name={['channels', 'instagram', 'defaultReplyMode']} label="Modo de respuesta">
                  <Select
                    options={[
                      { value: 'auto', label: 'Auto' },
                      { value: 'auto_then_human', label: 'Auto y derivar' },
                      { value: 'human_only', label: 'Solo humano' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Facebook</Divider>
            <Row gutter={16}>
              <Col xs={24} md={4}>
                <Form.Item name={['channels', 'facebook', 'enabled']} label="Activo" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col xs={24} md={10}>
                <Form.Item name={['channels', 'facebook', 'senderId']} label="Sender ID / Page ID">
                  <Input placeholder="123456789" />
                </Form.Item>
              </Col>
              <Col xs={24} md={10}>
                <Form.Item name={['channels', 'facebook', 'accessToken']} label="Access token">
                  <Input.Password placeholder="EAAG..." />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name={['channels', 'facebook', 'pageId']} label="Page ID">
                  <Input placeholder="123456789" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name={['channels', 'facebook', 'appSecret']} label="App secret">
                  <Input.Password placeholder="App secret Facebook" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name={['channels', 'facebook', 'defaultReplyMode']} label="Modo de respuesta">
                  <Select
                    options={[
                      { value: 'auto', label: 'Auto' },
                      { value: 'auto_then_human', label: 'Auto y derivar' },
                      { value: 'human_only', label: 'Solo humano' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={savingConfig}
            >
              Guardar configuracion
            </Button>
          </Form>
        </Card>

        <Card
          title="Difusion WhatsApp"
          extra={<Tag color="blue">Campanas masivas</Tag>}
        >
          <Form
            form={campaignForm}
            layout="vertical"
            initialValues={defaultCampaign}
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="name"
                  label="Nombre de campana"
                  rules={[{ required: true, message: 'Ingresa el nombre de la campana' }]}
                >
                  <Input placeholder="Campana preventiva agosto" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="sendMode" label="Modo">
                  <Select
                    options={[
                      { value: 'text', label: 'Texto' },
                      { value: 'template', label: 'Plantilla' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="templateLanguage" label="Idioma de plantilla">
                  <Input placeholder="es" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={24}>
                <Form.Item
                  name="message"
                  label="Mensaje"
                  rules={[{ required: true, message: 'Ingresa el mensaje' }]}
                >
                  <TextArea rows={5} placeholder="Hola {{nombre}}, este es un recordatorio..." />
                </Form.Item>
              </Col>
            </Row>

            {currentCampaignMode === 'template' ? (
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="templateName"
                    label="Nombre de plantilla"
                    rules={[{ required: true, message: 'Ingresa el nombre de la plantilla' }]}
                  >
                    <Input placeholder="recordatorio_pago" />
                  </Form.Item>
                </Col>
              </Row>
            ) : null}

            <Divider orientation="left">Audiencia</Divider>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name={['audience', 'filter', 'estado']} label="Estado">
                  <Select
                    allowClear
                    placeholder="Todos"
                    options={[
                      { value: 'activo', label: 'Activo' },
                      { value: 'inactivo', label: 'Inactivo' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name={['audience', 'filter', 'tipoCliente']} label="Tipo de cliente">
                  <Select
                    allowClear
                    placeholder="Todos"
                    options={[
                      { value: 'nuevo', label: 'Nuevo' },
                      { value: 'recurrente', label: 'Recurrente' },
                      { value: 'moroso', label: 'Moroso' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name={['audience', 'filter', 'search']} label="Buscar">
                  <Input placeholder="Nombre, cedula, telefono..." />
                </Form.Item>
              </Col>
            </Row>

            <Space wrap>
              <Button
                icon={<EyeOutlined />}
                onClick={handlePreview}
                loading={savingCampaign}
              >
                Previsualizar
              </Button>
              <Button
                icon={<SaveOutlined />}
                onClick={() => handleCreateCampaign(false)}
                loading={savingCampaign}
              >
                Guardar borrador
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => handleCreateCampaign(true)}
                loading={savingCampaign}
              >
                Crear y enviar
              </Button>
            </Space>
          </Form>

          {previewData ? (
            <Card size="small" style={{ marginTop: 16 }} title="Previsualizacion">
              <Text strong>Total estimado: {previewData.total || 0}</Text>
              <Divider style={{ margin: '12px 0' }} />
              <Space direction="vertical" style={{ width: '100%' }}>
                {Array.isArray(previewData.sample) ? previewData.sample.map((item) => (
                  <Card size="small" key={`${item.clientId || item.destination}`}>
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Space>
                        <Tag color="geekblue">{item.name || item.destination}</Tag>
                        <Text type="secondary">{item.destination}</Text>
                      </Space>
                      <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                        {item.renderedMessage}
                      </Paragraph>
                    </Space>
                  </Card>
                )) : null}
              </Space>
            </Card>
          ) : null}
        </Card>

        <Card
          title="Campanas recientes"
          extra={
            <Space>
              <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
                Recargar
              </Button>
            </Space>
          }
        >
          <Table
            rowKey="_id"
            columns={campaignColumns}
            dataSource={campaigns}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </Space>
    </Spin>
  );
}
