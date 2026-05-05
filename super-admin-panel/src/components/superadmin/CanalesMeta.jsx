import React, { useEffect, useMemo, useState } from 'react';
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
  MessageOutlined,
  ReloadOutlined,
  SaveOutlined,
  SendOutlined,
  ThunderboltOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { metaAPI } from '../../api/api';
import { getOficinas } from '../../api/superadmin';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const unwrap = (response) => response?.data ?? response;

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

export default function CanalesMeta() {
  const [configForm] = Form.useForm();
  const [campaignForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [integration, setIntegration] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [oficinas, setOficinas] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const currentCampaignMode = Form.useWatch('sendMode', campaignForm) || 'text';

  useEffect(() => {
    const loadOficinas = async () => {
      try {
        const data = await getOficinas();
        const list = Array.isArray(data) ? data : data?.oficinas || [];
        setOficinas(list);
        if (list.length > 0) {
          const firstTenant = list[0].tenantId || list[0].codigoEmpresa || list[0]._id;
          setSelectedTenantId(firstTenant);
        }
      } catch (error) {
        message.error(error.response?.data?.error || error.message || 'No se pudieron cargar las oficinas');
      }
    };

    loadOficinas();
  }, []);

  useEffect(() => {
    if (selectedTenantId) {
      loadData(selectedTenantId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTenantId]);

  const loadData = async (tenantId = selectedTenantId) => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const [configResponse, campaignsResponse] = await Promise.all([
        metaAPI.getConfig({ targetTenantId: tenantId }),
        metaAPI.listCampaigns({ limit: 25, targetTenantId: tenantId }),
      ]);

      const configData = unwrap(configResponse);
      const campaignData = unwrap(campaignsResponse);

      const config = configData?.integration || configData;
      setIntegration(config);
      configForm.setFieldsValue({ ...defaultConfig, ...config });

      setCampaigns(Array.isArray(campaignData?.campaigns) ? campaignData.campaigns : []);
      campaignForm.setFieldsValue(defaultCampaign);
      setPreviewData(null);
    } catch (error) {
      message.error(error.response?.data?.error || error.message || 'No se pudo cargar Meta');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (values) => {
    if (!selectedTenantId) {
      message.warning('Selecciona una oficina primero');
      return;
    }

    try {
      setSavingConfig(true);
      const response = await metaAPI.saveConfig({ ...values, targetTenantId: selectedTenantId });
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
    channel: 'whatsapp',
    autoSend,
    targetTenantId: selectedTenantId,
  });

  const handlePreview = async () => {
    if (!selectedTenantId) {
      message.warning('Selecciona una oficina primero');
      return;
    }

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
    if (!selectedTenantId) {
      message.warning('Selecciona una oficina primero');
      return;
    }

    try {
      const values = await campaignForm.validateFields();
      setSavingCampaign(true);
      const response = await metaAPI.createCampaign(buildCampaignPayload(values, autoSend));
      const data = unwrap(response);
      const campaign = data?.campaign || data;
      message.success(autoSend ? 'Campana creada y enviada' : 'Borrador guardado');
      setCampaigns((prev) => [campaign, ...prev].slice(0, 25));
      setPreviewData(null);
      campaignForm.resetFields();
      campaignForm.setFieldsValue(defaultCampaign);
      await loadData(selectedTenantId);
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
    if (!selectedTenantId) {
      message.warning('Selecciona una oficina primero');
      return;
    }

    try {
      setSavingCampaign(true);
      const response = await metaAPI.sendCampaign(record._id, { targetTenantId: selectedTenantId });
      const data = unwrap(response);
      const updated = data?.campaign || data;
      setCampaigns((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
      message.success('Campana enviada');
    } catch (error) {
      message.error(error.response?.data?.error || error.message || 'No se pudo enviar la campana');
    } finally {
      setSavingCampaign(false);
    }
  };

  const campaignColumns = useMemo(() => ([
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
  ]), [savingCampaign, selectedTenantId]);

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
            Configura WhatsApp, Instagram y Facebook por oficina y crea campañas salientes de WhatsApp.
          </Paragraph>
        </div>

        <Alert
          type="info"
          showIcon
          message="Selector de oficina"
          description="Elige la oficina antes de cargar la integracion o crear campanas. Todo se guarda aislado por tenant."
        />

        <Card size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>Oficina activa</Text>
            <Select
              showSearch
              placeholder="Selecciona una oficina"
              value={selectedTenantId || undefined}
              onChange={setSelectedTenantId}
              optionFilterProp="children"
              style={{ maxWidth: 420 }}
              options={oficinas.map((oficina) => ({
                value: oficina.tenantId || oficina.codigoEmpresa || oficina._id,
                label: `${oficina.nombre || oficina.tenantId || oficina.codigoEmpresa} (${oficina.tenantId || oficina.codigoEmpresa || oficina._id})`,
              }))}
            />
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
          extra={(
            <Button icon={<ReloadOutlined />} onClick={() => loadData(selectedTenantId)} loading={loading}>
              Recargar
            </Button>
          )}
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
              <Col xs={24} md={6}>
                <Form.Item name={['channels', 'whatsapp', 'enabled']} label="Habilitado" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name={['channels', 'whatsapp', 'phoneNumberId']} label="Phone Number ID">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name={['channels', 'whatsapp', 'businessAccountId']} label="Business Account ID">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name={['channels', 'whatsapp', 'accessToken']} label="Access token">
                  <Input.Password />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name={['channels', 'whatsapp', 'welcomeMessage']} label="Mensaje de bienvenida">
                  <TextArea rows={3} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name={['channels', 'whatsapp', 'fallbackMessage']} label="Mensaje de respaldo">
                  <TextArea rows={3} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name={['channels', 'whatsapp', 'defaultReplyMode']} label="Modo de respuesta">
                  <Select
                    options={[
                      { value: 'auto', label: 'Automático' },
                      { value: 'manual', label: 'Manual' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Instagram</Divider>
            <Row gutter={16}>
              <Col xs={24} md={6}>
                <Form.Item name={['channels', 'instagram', 'enabled']} label="Habilitado" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name={['channels', 'instagram', 'pageId']} label="Page ID">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name={['channels', 'instagram', 'instagramUserId']} label="Instagram User ID">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name={['channels', 'instagram', 'accessToken']} label="Access token">
                  <Input.Password />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Facebook</Divider>
            <Row gutter={16}>
              <Col xs={24} md={6}>
                <Form.Item name={['channels', 'facebook', 'enabled']} label="Habilitado" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name={['channels', 'facebook', 'pageId']} label="Page ID">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name={['channels', 'facebook', 'accessToken']} label="Access token">
                  <Input.Password />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name={['channels', 'facebook', 'defaultReplyMode']} label="Modo de respuesta">
                  <Select
                    options={[
                      { value: 'auto', label: 'Automático' },
                      { value: 'manual', label: 'Manual' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={savingConfig} disabled={!selectedTenantId}>
                Guardar configuracion
              </Button>
            </Space>
          </Form>
        </Card>

        <Card
          title="Campañas WhatsApp"
          extra={(
            <Space>
              <Button icon={<ThunderboltOutlined />} onClick={() => handleCreateCampaign(false)} loading={savingCampaign} disabled={!selectedTenantId}>
                Guardar borrador
              </Button>
              <Button type="primary" icon={<SendOutlined />} onClick={() => handleCreateCampaign(true)} loading={savingCampaign} disabled={!selectedTenantId}>
                Crear y enviar
              </Button>
            </Space>
          )}
        >
          <Form form={campaignForm} layout="vertical" initialValues={defaultCampaign}>
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="name" label="Nombre de campaña" rules={[{ required: true, message: 'Define un nombre' }]}>
                  <Input placeholder="Campaña mayo" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="channel" label="Canal">
                  <Select
                    options={[
                      { value: 'whatsapp', label: 'WhatsApp' },
                      { value: 'instagram', label: 'Instagram' },
                      { value: 'facebook', label: 'Facebook' },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="sendMode" label="Modo de envío">
                  <Select
                    options={[
                      { value: 'text', label: 'Texto' },
                      { value: 'template', label: 'Plantilla' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="templateName" label="Nombre de plantilla" rules={currentCampaignMode === 'template' ? [{ required: true, message: 'Define una plantilla' }] : []}>
                  <Input placeholder="welcome_message" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="templateLanguage" label="Idioma">
                  <Input placeholder="es" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name={['audience', 'filter', 'tipoCliente']} label="Tipo de cliente">
                  <Select
                    allowClear
                    options={[
                      { value: 'nuevo', label: 'Nuevo' },
                      { value: 'recurrente', label: 'Recurrente' },
                      { value: 'moroso', label: 'Moroso' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="message"
              label="Mensaje"
              rules={currentCampaignMode === 'text' ? [{ required: true, message: 'Escribe el mensaje' }] : []}
            >
              <TextArea rows={5} placeholder="Escribe el contenido de la campaña" />
            </Form.Item>

            <Form.Item name={['audience', 'filter', 'search']} label="Buscar en destinatarios">
              <Input placeholder="Nombre, cedula o celular" />
            </Form.Item>

            <Space>
              <Button icon={<EyeOutlined />} onClick={handlePreview} loading={savingCampaign} disabled={!selectedTenantId}>
                Previsualizar
              </Button>
            </Space>
          </Form>

          {previewData && (
            <Card size="small" style={{ marginTop: 16 }} title="Previsualizacion">
              <Text strong>Total contactos: {previewData.total || 0}</Text>
              <Divider style={{ margin: '12px 0' }} />
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(previewData.preview || previewData, null, 2)}</pre>
            </Card>
          )}
        </Card>

        <Card title="Campañas recientes">
          <Table
            columns={campaignColumns}
            dataSource={campaigns}
            rowKey="_id"
            pagination={{ pageSize: 10 }}
            size="small"
          />
        </Card>
      </Space>
    </Spin>
  );
}
