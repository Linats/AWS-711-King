import { useState } from 'react';
import { App as AntApp, Button, Card, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { CampaignDto } from '@coupon/shared';
import { useDemo } from '@/app/demo-context';
import { PageHeader } from '@/components/common/Page';
import { statusLabel } from '@/demo';

const { Text } = Typography;

/** 活动管理：创建草稿、发布/暂停、软删除 */
export default function CampaignManagement() {
  const { campaigns, addCampaign, updateCampaignStatus } = useDemo();
  const { message } = AntApp.useApp();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const save = async () => {
    const values = await form.validateFields();
    addCampaign(values);
    setOpen(false);
    form.resetFields();
    message.success('活动草稿创建成功，确认信息后可发布');
  };

  const columns = [
    { title: '活动', dataIndex: 'name', render: (_: unknown, row: CampaignDto) => <Space direction="vertical" size={0}><Text strong>{row.name}</Text><Text type="secondary">{row.couponType === 'discount' ? `${row.value} 折` : `¥${row.value}`}</Text></Space> },
    { title: '状态', dataIndex: 'status', render: (value: string) => <Tag color={value === 'active' ? 'green' : value === 'draft' ? 'blue' : 'default'}>{statusLabel[value]}</Tag> },
    { title: '库存', render: (_: unknown, row: CampaignDto) => <Text>{row.remainingStock} / {row.totalStock}</Text> },
    { title: '有效期', render: (_: unknown, row: CampaignDto) => `${new Date(row.startTime).toLocaleDateString()} - ${new Date(row.endTime).toLocaleDateString()}` },
    {
      title: '操作', render: (_: unknown, row: CampaignDto) => <Space>
        <Button type="link" onClick={() => updateCampaignStatus(row.id, row.status === 'active' ? 'paused' : 'active')}>{row.status === 'active' ? '暂停' : '发布'}</Button>
        <Button type="link" danger onClick={() => updateCampaignStatus(row.id, 'deleted')}>删除</Button>
      </Space>
    }
  ];

  return <>
    <PageHeader
      title="活动管理" subtitle="创建和维护优惠券活动，实时掌握库存与状态流转"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>创建活动</Button>}
    />
    <Card className="panel">
      <Table rowKey="id" dataSource={campaigns.filter((item) => item.status !== 'deleted')} columns={columns} pagination={{ pageSize: 6 }} scroll={{ x: 760 }} />
    </Card>
    <Modal title="创建优惠券活动" open={open} onCancel={() => setOpen(false)} onOk={() => void save()} okText="创建草稿" width={680}>
      <Form form={form} layout="vertical" initialValues={{ couponType: 'fixed', perUserLimit: 1, totalStock: 100 }}>
        <Form.Item name="name" label="活动名称" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="description" label="活动说明"><Input.TextArea /></Form.Item>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="couponType" label="券类型"><Select options={[{ value: 'fixed', label: '满减券' }, { value: 'discount', label: '折扣券' }]} /></Form.Item></Col>
          <Col span={12}><Form.Item name="value" label="面额/折扣" rules={[{ required: true }]}><InputNumber min={0.1} className="full-width" /></Form.Item></Col>
          <Col span={12}><Form.Item name="totalStock" label="总库存"><InputNumber min={1} max={100000} className="full-width" /></Form.Item></Col>
          <Col span={12}><Form.Item name="perUserLimit" label="每人限领"><InputNumber min={1} className="full-width" /></Form.Item></Col>
          <Col span={12}><Form.Item name="startTime" label="开始时间" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item></Col>
          <Col span={12}><Form.Item name="endTime" label="结束时间" rules={[{ required: true }]}><Input type="datetime-local" /></Form.Item></Col>
        </Row>
      </Form>
    </Modal>
  </>;
}
