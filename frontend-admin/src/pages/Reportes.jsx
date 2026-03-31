import React, { useState } from 'react';
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
} from 'antd';
import {
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
} from '@ant-design/icons';
import api from '../api/api';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const Reportes = () => {
  const [loading, setLoading] = useState(false);
  const [reporteData, setReporteData] = useState([]);
  const [tipoReporte, setTipoReporte] = useState('prestamos');
  const [rangos, setRangos] = useState(null);

  const generarReporte = async () => {
    try {
      setLoading(true);

      const params = {};
      if (rangos?.[0]) params.desde = rangos[0].toISOString();
      if (rangos?.[1]) params.hasta = rangos[1].toISOString();

      const response = await api.get(`/reportes/${tipoReporte}`, { params });
      setReporteData(response.data);
      message.success('Reporte generado');
    } catch (error) {
      message.error('Error al generar reporte');
    } finally {
      setLoading(false);
    }
  };

  const exportarExcel = () => {
    if (!reporteData.length) {
      message.info('No hay datos para exportar');
      return;
    }
    message.info('Exportando a Excel...');
  };

  const exportarPDF = () => {
    if (!reporteData.length) {
      message.info('No hay datos para exportar');
      return;
    }
    message.info('Exportando a PDF...');
  };

  const getColumns = () => {
    if (tipoReporte === 'prestamos') {
      return [
        {
          title: 'Cliente',
          dataIndex: ['cliente', 'nombre'],
          key: 'cliente',
        },
        {
          title: 'Capital',
          dataIndex: 'capital',
          key: 'capital',
          render: (v) => `$${v?.toLocaleString()}`,
        },
        {
          title: 'Estado',
          dataIndex: 'estado',
          key: 'estado',
          render: (e) => (
            <Tag color={e === 'pagado' ? 'green' : 'blue'}>{e}</Tag>
          ),
        },
      ];
    }
    if (tipoReporte === 'clientes') {
      return [
        { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
        { title: 'Cédula', dataIndex: 'cedula', key: 'cedula' },
        { title: 'Teléfono', dataIndex: 'telefono', key: 'telefono' },
      ];
    }
    if (tipoReporte === 'cobradores') {
      return [
        { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
        { title: 'Email', dataIndex: 'email', key: 'email' },
        {
          title: 'Clientes',
          dataIndex: 'clientesAsignados',
          key: 'clientesAsignados',
          render: (v) => (Array.isArray(v) ? v.length : v || 0),
        },
      ];
    }
    return [];
  };

  return (
    <div>
      <Title level={2}>Reportes</Title>

      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text strong>Tipo:</Text>
            <Select
              style={{ width: 220, marginLeft: 16 }}
              value={tipoReporte}
              onChange={setTipoReporte}
            >
              <Option value="prestamos">Préstamos</Option>
              <Option value="clientes">Clientes</Option>
              <Option value="cobradores">Cobradores</Option>
            </Select>
          </div>

          <div>
            <Text strong>Rango de fechas:</Text>
            <RangePicker
              style={{ marginLeft: 16 }}
              onChange={setRangos}
              placeholder={['Desde', 'Hasta']}
            />
          </div>

          <Space>
            <Button
              type="primary"
              onClick={generarReporte}
              loading={loading}
              icon={<DownloadOutlined />}
            >
              Generar
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              onClick={exportarExcel}
              style={{ backgroundColor: '#52c41a', color: 'white' }}
            >
              Excel
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              onClick={exportarPDF}
              style={{ backgroundColor: '#f5222d', color: 'white' }}
            >
              PDF
            </Button>
          </Space>
        </Space>
      </Card>

      {reporteData.length > 0 && (
        <Card>
          <Table
            columns={getColumns()}
            dataSource={reporteData}
            rowKey="_id"
            loading={loading}
          />
        </Card>
      )}
    </div>
  );
};

export default Reportes;