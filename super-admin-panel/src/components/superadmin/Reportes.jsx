import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Typography, 
  Button, 
  Space, 
  Select, 
  DatePicker, 
  message, 
  Table, 
  Tag,
  Badge,
  Tooltip,
  Alert,
  Row,
  Col
} from 'antd';
import { 
  DownloadOutlined, 
  FileExcelOutlined, 
  FilePdfOutlined,
  BellOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  MailOutlined
} from '@ant-design/icons';
// importa tus APIs reales
// import { getReportesGlobales, getEmpresasMorosas } from '../../api/reportes';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const Reportes = () => {
  const [loading, setLoading] = useState(false);
  const [reporteData, setReporteData] = useState([]);
  const [tipoReporte, setTipoReporte] = useState('oficinas');
  const [empresasMorosas, setEmpresasMorosas] = useState([]);
  const [fechasReporte, setFechasReporte] = useState(null);
  const [hayOficinas, setHayOficinas] = useState(true);    // aquí controlas si ya hay oficinas creadas
  const [hayDatosMorosos, setHayDatosMorosos] = useState(true);

  useEffect(() => {
    cargarEmpresasMorosas();
  }, []);

  const cargarEmpresasMorosas = async () => {
    try {
      // EJEMPLO: reemplaza esto por tu API real
      // const resp = await getEmpresasMorosas();
      // setEmpresasMorosas(resp.data);
      // setHayDatosMorosos(resp.data.length > 0);

      // mientras tanto, asumimos que no hay nada hasta que venga del backend
      setEmpresasMorosas([]);
      setHayDatosMorosos(false);
    } catch (error) {
      console.error('Error cargando empresas morosas:', error);
      message.error('Error al cargar empresas con pagos pendientes');
      setHayDatosMorosos(false);
    }
  };

  const generarReporte = async () => {
    try {
      setLoading(true);

      // si aún no hay oficinas creadas, no generes nada
      if (!hayOficinas) {
        message.info('Aún no hay oficinas creadas. Crea al menos una oficina para generar reportes.');
        setReporteData([]);
        setLoading(false);
        return;
      }

      // Construye el payload para tu backend
      const payload = {
        tipo: tipoReporte,
        desde: fechasReporte?.[0]?.toISOString() ?? null,
        hasta: fechasReporte?.[1]?.toISOString() ?? null,
      };

      // Llama a tu API real
      // const resp = await getReportesGlobales(payload);
      // setReporteData(resp.data);

      // mientras no tengas backend, deja vacío:
      setReporteData([]);
      message.success(`Reporte de ${tipoReporte} solicitado (esperando datos del backend)`);

      setLoading(false);
    } catch (error) {
      message.error('Error al generar reporte');
      setLoading(false);
    }
  };

  const exportarExcel = () => {
    if (reporteData.length === 0) {
      message.info('No hay datos para exportar.');
      return;
    }
    message.success('Exportando a Excel...');
  };

  const exportarPDF = () => {
    if (reporteData.length === 0) {
      message.info('No hay datos para exportar.');
      return;
    }
    message.success('Exportando a PDF...');
  };

  const enviarRecordatorio = (empresa) => {
    const asunto = encodeURIComponent(`Recordatorio de Pago - ${empresa.nombre}`);
    const cuerpo = encodeURIComponent(
      `Estimado equipo de ${empresa.nombre},\n\n` +
      `Se ha detectado que el pago correspondiente al mes de ${empresa.fechaVencimiento} no ha sido realizado.\n` +
      `Monto pendiente: $${empresa.montoPendiente.toLocaleString()}\n` +
      `Días de atraso: ${empresa.diasAtraso} días\n\n` +
      `Por favor, regularice su situación a la brevedad para evitar recargos adicionales.\n\n` +
      `Saludos cordiales,\n` +
      `Equipo de Administración - Sistema Gota a Gota`
    );
    
    window.open(`mailto:${empresa.contacto}?subject=${asunto}&body=${cuerpo}`);
    message.success(`Recordatorio enviado a ${empresa.nombre}`);
  };

  const getTagColor = (dias) => {
    if (dias > 30) return 'red';
    if (dias > 15) return 'orange';
    return 'gold';
  };

  const getEstadoTexto = (dias) => {
    if (dias > 30) return 'Crítico';
    if (dias > 15) return 'Alerta';
    return 'Seguimiento';
  };

  const morososColumns = [
    { 
      title: 'Empresa', 
      dataIndex: 'nombre', 
      key: 'nombre',
      render: (text, record) => (
        <Space>
          <WarningOutlined style={{ color: record.diasAtraso > 30 ? '#ff4d4f' : '#faad14' }} />
          <strong>{text}</strong>
        </Space>
      )
    },
    { 
      title: 'Fecha Vencimiento', 
      dataIndex: 'fechaVencimiento', 
      key: 'fechaVencimiento',
      render: (fecha) => <Tag icon={<ClockCircleOutlined />}>{fecha}</Tag>
    },
    { 
      title: 'Días Atraso', 
      dataIndex: 'diasAtraso', 
      key: 'diasAtraso', 
      render: (dias) => (
        <Tag color={getTagColor(dias)} style={{ fontWeight: 'bold' }}>
          {dias} días
        </Tag>
      )
    },
    { 
      title: 'Estado', 
      key: 'estado',
      render: (_, record) => (
        <Badge 
          status={record.diasAtraso > 30 ? 'error' : record.diasAtraso > 15 ? 'warning' : 'processing'} 
          text={getEstadoTexto(record.diasAtraso)}
        />
      )
    },
    { 
      title: 'Monto Pendiente', 
      dataIndex: 'montoPendiente', 
      key: 'montoPendiente', 
      render: (monto) => (
        <span style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
          <DollarOutlined /> {monto.toLocaleString()}
        </span>
      )
    },
    { 
      title: 'Contacto', 
      dataIndex: 'contacto', 
      key: 'contacto',
      render: (contacto) => <Tag icon={<MailOutlined />}>{contacto}</Tag>
    },
    { 
      title: 'Acciones', 
      key: 'acciones',
      render: (_, record) => (
        <Tooltip title="Enviar recordatorio por email">
          <Button 
            type="primary" 
            danger={record.diasAtraso > 30}
            icon={<BellOutlined />} 
            onClick={() => enviarRecordatorio(record)}
            size="small"
          >
            Recordatorio
          </Button>
        </Tooltip>
      )
    }
  ];

  const getDynamicColumns = () => {
    switch (tipoReporte) {
      case 'oficinas':
        return [
          { title: 'Oficina', dataIndex: 'nombre', key: 'nombre' },
          { title: 'Total Préstamos', dataIndex: 'totalPrestamos', key: 'totalPrestamos' },
          { title: 'Monto Total', dataIndex: 'montoTotal', key: 'montoTotal', render: (monto) => `$${monto.toLocaleString()}` },
          { title: 'Clientes Activos', dataIndex: 'clientes', key: 'clientes' },
          { title: 'Cobradores', dataIndex: 'cobradores', key: 'cobradores' },
          { title: 'Eficiencia', dataIndex: 'eficiencia', key: 'eficiencia', render: (text) => <Tag color="green">{text}</Tag> }
        ];
      case 'prestamos':
        return [
          { title: 'Tipo de Préstamo', dataIndex: 'tipo', key: 'tipo' },
          { title: 'Cantidad', dataIndex: 'cantidad', key: 'cantidad' },
          { title: 'Monto Promedio', dataIndex: 'montoPromedio', key: 'montoPromedio', render: (monto) => `$${monto.toLocaleString()}` },
          { title: 'Tasa de Interés', dataIndex: 'tasaInteres', key: 'tasaInteres' }
        ];
      case 'cobradores':
        return [
          { title: 'Cobrador', dataIndex: 'nombre', key: 'nombre' },
          { title: 'Oficina', dataIndex: 'oficina', key: 'oficina' },
          { title: 'Clientes Asignados', dataIndex: 'clientesAsignados', key: 'clientesAsignados' },
          { title: 'Cobros Mensuales', dataIndex: 'cobrosMensuales', key: 'cobrosMensuales', render: (monto) => `$${monto.toLocaleString()}` },
          { title: 'Eficiencia', dataIndex: 'eficiencia', key: 'eficiencia', render: (text) => <Tag color="blue">{text}</Tag> }
        ];
      case 'financiero':
        return [
          { title: 'Concepto', dataIndex: 'concepto', key: 'concepto' },
          { title: 'Monto', dataIndex: 'monto', key: 'monto', render: (monto) => `$${monto.toLocaleString()}` },
          { title: 'Variación', dataIndex: 'variacion', key: 'variacion', render: (text) => (
            <Tag color={text.includes('+') ? 'green' : 'red'}>{text}</Tag>
          )}
        ];
      default:
        return [];
    }
  };

  return (
    <div>
      <Title level={2} style={{ marginBottom: 8 }}>Reportes Globales</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Análisis detallado del rendimiento de todas las oficinas
      </Text>
      
      {/* Card de filtros */}
      <Card style={{ marginBottom: 24, borderRadius: 12 }}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text strong>Tipo de Reporte:</Text>
            <Select 
              style={{ width: 220, marginLeft: 16 }} 
              value={tipoReporte}
              onChange={setTipoReporte}
            >
              <Option value="oficinas">📊 Reporte de Oficinas</Option>
              <Option value="prestamos">💰 Reporte de Préstamos</Option>
              <Option value="cobradores">👥 Reporte de Cobradores</Option>
              <Option value="financiero">📈 Reporte Financiero</Option>
            </Select>
          </div>
          
          <div>
            <Text strong>Rango de Fechas:</Text>
            <RangePicker 
              style={{ marginLeft: 16 }} 
              onChange={(dates) => setFechasReporte(dates)}
              placeholder={['Fecha inicio', 'Fecha fin']}
            />
          </div>
          
          <Space>
            <Button 
              type="primary" 
              onClick={generarReporte} 
              loading={loading}
              icon={<DownloadOutlined />}
              size="large"
            >
              Generar Reporte
            </Button>
            <Button 
              icon={<FileExcelOutlined />} 
              onClick={exportarExcel}
              style={{ backgroundColor: '#52c41a', color: 'white' }}
              size="large"
            >
              Exportar Excel
            </Button>
            <Button 
              icon={<FilePdfOutlined />} 
              onClick={exportarPDF}
              style={{ backgroundColor: '#f5222d', color: 'white' }}
              size="large"
            >
              Exportar PDF
            </Button>
          </Space>
        </Space>
      </Card>

      {!hayOficinas && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
          message="Aún no hay oficinas registradas"
          description="Crea al menos una oficina para empezar a generar reportes globales."
        />
      )}

      {/* Card de resultados del reporte */}
      {hayOficinas && reporteData.length > 0 && (
        <Card 
          title={`Resultados del Reporte - ${tipoReporte.toUpperCase()}`} 
          style={{ marginBottom: 24, borderRadius: 12 }}
        >
          <Table 
            columns={getDynamicColumns()} 
            dataSource={reporteData} 
            loading={loading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: true }}
          />
        </Card>
      )}

      {/* Card de empresas con pagos pendientes */}
      <Card 
        title={
          <Space>
            <WarningOutlined style={{ color: '#b38d8e' }} />
            <span style={{ color: '#ff4d4f' }}>⚠️ Pagos Pendientes</span>
            <Badge count={empresasMorosas.length} style={{ backgroundColor: '#ff4d4f' }} />
          </Space>
        }
        style={{ borderRadius: 12, borderColor: '#ff4d4f' }}
      >
        {hayDatosMorosos && empresasMorosas.length > 0 ? (
          <>
            <Alert
              message="Atención"
              description={`Tenemos ${empresasMorosas.length} empresas con pagos atrasados. Envía recordatorios inmediatamente para saldar estos atrasos.`}
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Table 
              columns={morososColumns} 
              dataSource={empresasMorosas} 
              rowKey="id"
              pagination={{ pageSize: 5 }}
              scroll={{ x: true }}
            />
          </>
        ) : (
          <Alert
            message="Todo en orden"
            description="No hay empresas con pagos pendientes (o el backend aún no reporta morosos)."
            type="success"
            showIcon
          />
        )}
      </Card>

      {/* Resumen adicional */}
      {hayDatosMorosos && empresasMorosas.length > 0 && (
        <Card 
          style={{ 
            marginTop: 24, 
            borderRadius: 12, 
            background: 'linear-gradient(135deg, #815454, #fff)',
            borderLeft: '4px solid #a69090'
          }}
          bodyStyle={{ padding: '16px' }}
        >
          <Space orientation="vertical" style={{ width: '100%' }} size={12}>
            <Text strong>📊 Resumen de Pagos Pendientes:</Text>
            <Row gutter={16}>
              <Col span={8}>
                <div>
                  <div style={{ color: '#8c8c8c', fontSize: 12 }}>Total Adeudado</div>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#ff4d4f' }}>
                    ${empresasMorosas.reduce((sum, e) => sum + e.montoPendiente, 0).toLocaleString()}
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div>
                  <div style={{ color: '#8c8c8c', fontSize: 12 }}>Promedio Atraso</div>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#7a8ad0' }}>
                    {Math.round(empresasMorosas.reduce((sum, e) => sum + e.diasAtraso, 0) / empresasMorosas.length)} días
                  </div>
                </div>
              </Col>
              <Col span={8}>
                <div>
                  <div style={{ color: '#8c8c8c', fontSize: 12 }}>Empresas Críticas</div>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#ff4d4f' }}>
                    {empresasMorosas.filter(e => e.diasAtraso > 30).length}
                  </div>
                </div>
              </Col>
            </Row>
          </Space>
        </Card>
      )}
    </div>
  );
};

export default Reportes;