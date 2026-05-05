import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Card, Divider, Empty, Input, List, Space, Spin, Tag, Typography } from 'antd';
import {
  ClockCircleOutlined,
  InboxOutlined,
  MessageOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { ragAPI } from '../services/api';

const { Title, Text, Paragraph } = Typography;

function formatDate(value) {
  if (!value) return 'sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'sin fecha';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function channelLabel(value = '') {
  const normalized = String(value || '').toLowerCase();
  return {
    telegram: 'Telegram',
    web: 'Web',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    facebook: 'Facebook',
    messenger: 'Messenger',
    email: 'Email',
  }[normalized] || normalized || 'Canal';
}

function channelColor(value = '') {
  const normalized = String(value || '').toLowerCase();
  return {
    telegram: 'blue',
    web: 'green',
    whatsapp: 'geekblue',
    instagram: 'magenta',
    facebook: 'volcano',
    messenger: 'purple',
    email: 'gold',
  }[normalized] || 'default';
}

export default function BandejaConversaciones() {
  const [search, setSearch] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('');
  const bottomRef = useRef(null);

  const tenantId = localStorage.getItem('tenantId') || 'sin tenant';

  const selectedConversationSummary = useMemo(
    () => conversations.find((item) => item.conversationId === selectedConversationId) || null,
    [conversations, selectedConversationId],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  useEffect(() => {
    loadConversations();

    const interval = setInterval(() => {
      loadConversations({ silent: true });
    }, 25000);

    return () => clearInterval(interval);
  }, [search]);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    }
  }, [selectedConversationId]);

  async function loadConversations({ silent = false } = {}) {
    if (!silent) {
      setLoadingConversations(true);
    }

    try {
      const response = await ragAPI.conversations({
        limit: 60,
        search: search.trim() || undefined,
      });
      const payload = response.data || {};
      const items = Array.isArray(payload.conversations) ? payload.conversations : [];

      setConversations(items);

      if (!items.length) {
        setSelectedConversationId('');
        setSelectedConversation(null);
        setMessages([]);
      } else if (!selectedConversationId) {
        setSelectedConversationId(items[0].conversationId);
      } else if (!items.some((item) => item.conversationId === selectedConversationId)) {
        setSelectedConversationId(items[0]?.conversationId || '');
      }

      setStatus(items.length ? `Se encontraron ${items.length} conversaciones.` : 'No hay conversaciones todavia.');
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
      setStatus(error.response?.data?.error || 'No se pudieron cargar las conversaciones.');
    } finally {
      if (!silent) {
        setLoadingConversations(false);
      }
    }
  }

  async function loadMessages(conversationId) {
    if (!conversationId) return;

    setLoadingMessages(true);

    try {
      const response = await ragAPI.conversationMessages(conversationId);
      const payload = response.data || {};
      setSelectedConversation(payload.conversation || null);
      setMessages(Array.isArray(payload.messages) ? payload.messages : []);
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      setSelectedConversation(null);
      setMessages([]);
      setStatus(error.response?.data?.error || 'No se pudo abrir la conversación.');
    } finally {
      setLoadingMessages(false);
    }
  }

  const refreshAll = async () => {
    await loadConversations();
    if (selectedConversationId) {
      await loadMessages(selectedConversationId);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card
        style={{
          border: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          boxShadow: '0 12px 30px rgba(15,23,42,0.08)',
        }}
      >
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Space align="center" size={12}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #0f766e, #2563eb)',
                color: '#fff',
              }}
            >
              <InboxOutlined />
            </div>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                Call Center IA
              </Title>
              <Text type="secondary">
                Visualiza los hilos que llegan por los canales integrados y revisa la respuesta automatica del RAG.
              </Text>
            </div>
          </Space>

          <Space wrap>
            <Tag color="blue">Tenant: {tenantId}</Tag>
            <Tag color="geekblue">Conversaciones: {conversations.length}</Tag>
            <Tag color="cyan">Actualizacion automatica</Tag>
          </Space>
        </Space>
      </Card>

      {status && (
        <Card style={{ borderColor: '#e5e7eb' }}>
          <Text>{status}</Text>
        </Card>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px minmax(0, 1fr) 300px',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <Card
          title="Conversaciones"
          extra={
            <Button icon={<ReloadOutlined />} onClick={refreshAll} loading={loadingConversations}>
              Refrescar
            </Button>
          }
          style={{ minHeight: 720 }}
          bodyStyle={{ display: 'grid', gap: 12 }}
        >
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={refreshAll}
            prefix={<SearchOutlined />}
            placeholder="Buscar por nombre, canal o texto"
            allowClear
          />

          {loadingConversations ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
              <Spin />
            </div>
          ) : conversations.length ? (
            <List
              dataSource={conversations}
              renderItem={(item) => {
                const active = item.conversationId === selectedConversationId;
                return (
                  <List.Item
                    key={`${item.tenantId || 'global'}-${item.conversationId}`}
                    onClick={() => setSelectedConversationId(item.conversationId)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: 14,
                      padding: '12px 14px',
                      background: active ? 'rgba(37,99,235,0.08)' : '#f8fafc',
                      border: active ? '1px solid rgba(37,99,235,0.2)' : '1px solid #e2e8f0',
                      marginBottom: 10,
                    }}
                  >
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Space align="center" wrap style={{ justifyContent: 'space-between', width: '100%' }}>
                        <Text strong ellipsis style={{ maxWidth: 190 }}>
                          {item.userName || item.title || item.preview || 'Conversacion'}
                        </Text>
                        <Tag color={channelColor(item.channel)}>{channelLabel(item.channel)}</Tag>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.preview}
                      </Text>
                      <Space wrap size={6}>
                        <Tag icon={<MessageOutlined />} color="blue">
                          {item.turnCount || 0} turnos
                        </Tag>
                        <Tag icon={<ClockCircleOutlined />} color="default">
                          {formatDate(item.updatedAt || item.createdAt)}
                        </Tag>
                        {item.important ? <Tag color="red">Importante</Tag> : null}
                      </Space>
                    </Space>
                  </List.Item>
                );
              }}
            />
          ) : (
            <Empty description="No hay conversaciones para mostrar" />
          )}
        </Card>

        <Card
          title={selectedConversationSummary?.title || selectedConversation?.title || 'Detalle de la conversacion'}
          extra={
            <Space>
              <Badge status={loadingMessages ? 'processing' : 'success'} />
              <Text type="secondary">{loadingMessages ? 'Cargando...' : 'Actualizada'}</Text>
            </Space>
          }
          style={{ minHeight: 720 }}
        >
          {loadingMessages ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <Spin />
            </div>
          ) : messages.length ? (
            <div style={{ display: 'grid', gap: 14, maxHeight: 620, overflow: 'auto', paddingRight: 6 }}>
              {messages.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: item.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '92%',
                      borderRadius: 16,
                      padding: '14px 16px',
                      background: item.role === 'user' ? 'linear-gradient(135deg, #dbeafe, #eff6ff)' : '#f8fafc',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 8px 18px rgba(15,23,42,0.04)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Space size={8} wrap>
                        <Tag color={item.role === 'user' ? 'blue' : 'green'} style={{ margin: 0 }}>
                          {item.role === 'user' ? 'Usuario' : 'Asistente'}
                        </Tag>
                        <Tag color={channelColor(item.channel)}>{channelLabel(item.channel)}</Tag>
                      </Space>
                      <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#0f172a' }}>
                        {item.content}
                      </Paragraph>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatDate(item.createdAt)}
                      </Text>
                    </Space>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          ) : (
            <Empty description="Selecciona una conversacion para ver sus mensajes" />
          )}
        </Card>

        <Card title="Resumen">
          {selectedConversation ? (
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Tag color="blue">{selectedConversation.channel || 'web'}</Tag>
              <Text strong>{selectedConversation.userName || 'Sin nombre'}</Text>
              <Text type="secondary">{selectedConversation.role || 'Sin rol'}</Text>
              <Divider style={{ margin: '10px 0' }} />
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Text>
                  <strong>Tenant:</strong> {selectedConversation.tenantId || 'global'}
                </Text>
                <Text>
                  <strong>Turnos:</strong> {selectedConversation.turnCount || 0}
                </Text>
                <Text>
                  <strong>Actualizada:</strong> {formatDate(selectedConversation.updatedAt || selectedConversation.createdAt)}
                </Text>
                <Text>
                  <strong>Fuentes:</strong> {selectedConversation.sourceCount || 0}
                </Text>
                <Text>
                  <strong>Importante:</strong> {selectedConversation.important ? 'Si' : 'No'}
                </Text>
              </Space>

              {selectedConversation.followUpQuestions?.length ? (
                <>
                  <Divider style={{ margin: '10px 0' }} />
                  <Text strong>Preguntas sugeridas</Text>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {selectedConversation.followUpQuestions.map((item) => (
                      <Tag key={item} color="geekblue" style={{ whiteSpace: 'normal', width: '100%' }}>
                        {item}
                      </Tag>
                    ))}
                  </Space>
                </>
              ) : null}
            </Space>
          ) : (
            <Empty description="Aqui veras los datos del hilo seleccionado" />
          )}
        </Card>
      </div>
    </div>
  );
}
