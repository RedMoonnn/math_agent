import React, { useState } from 'react';
import { Modal, Input, Button, Select, Form, message } from 'antd';
import { questionAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

const { TextArea } = Input;
const { Option } = Select;

interface QuestionDialogProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuestionDialog: React.FC<QuestionDialogProps> = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    try {
      // 先验证表单字段
      const values = await form.validateFields();
      console.log("提交问题:", values);
      setLoading(true);
      
      // 提交问题到API
      try {
        const response = await questionAPI.createQuestion({
          title: values.title,
          content: values.content,
          category: values.category,
          difficulty: values.difficulty,
        });
        
        console.log("提交问题成功:", response.data);
        message.success('问题提交成功！');
        
        // 获取问题ID
        const questionId = response.data.id;
        
        // 获取AI回答（如果失败也继续流程）
        try {
          console.log("请求AI回答，问题ID:", questionId);
          await questionAPI.getAIAnswer(questionId);
          message.success('AI已生成回答');
        } catch (aiError: any) {
          console.error('获取AI回答失败:', aiError);
          message.info('AI回答正在生成中，请稍后在问题详情页查看');
        }
        
        // 重置表单并关闭对话框
        form.resetFields();
        onClose();
        
        // 成功回调
        if (onSuccess) {
          onSuccess();
        }
        
        // 导航到问题详情页
        navigate(`/questions/${questionId}`);
      } catch (submitError: any) {
        console.error('提交问题失败:', submitError);
        
        // 处理各种API错误
        if (submitError.response) {
          const status = submitError.response.status;
          const errorMsg = submitError.response.data?.detail || '未知错误';
          
          if (status === 401) {
            message.error('请先登录后再提交问题');
          } else if (status === 400) {
            message.error(`提交失败: ${errorMsg}`);
          } else if (status === 422) {
            message.error('表单数据格式错误，请检查输入');
          } else {
            message.error(`提交失败: ${errorMsg}`);
          }
        } else if (submitError.request) {
          message.error('网络请求失败，请检查网络连接');
        } else {
          message.error('提交问题失败，请稍后重试');
        }
      }
    } catch (formError) {
      console.error('表单验证失败:', formError);
      message.warning('请完成所有必填字段');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="提出数学问题"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
          提交
        </Button>,
      ]}
      width={700}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          category: '代数',
          difficulty: 'medium'
        }}
      >
        <Form.Item
          name="title"
          label="问题标题"
          rules={[{ required: true, message: '请输入问题标题' }]}
        >
          <Input placeholder="例如：求解一元二次方程" />
        </Form.Item>
        
        <Form.Item
          name="content"
          label="问题内容"
          rules={[{ required: true, message: '请输入问题内容' }]}
        >
          <TextArea 
            placeholder="请详细描述您的数学问题..." 
            autoSize={{ minRows: 4, maxRows: 8 }}
          />
        </Form.Item>
        
        <Form.Item
          name="category"
          label="问题类别"
          rules={[{ required: true, message: '请选择问题类别' }]}
        >
          <Select placeholder="选择问题类别">
            <Option value="代数">代数</Option>
            <Option value="几何">几何</Option>
            <Option value="微积分">微积分</Option>
            <Option value="概率统计">概率统计</Option>
            <Option value="三角函数">三角函数</Option>
            <Option value="数列">数列</Option>
            <Option value="其他">其他</Option>
          </Select>
        </Form.Item>
        
        <Form.Item
          name="difficulty"
          label="难度级别"
          rules={[{ required: true, message: '请选择难度级别' }]}
        >
          <Select placeholder="选择难度级别">
            <Option value="easy">简单</Option>
            <Option value="medium">中等</Option>
            <Option value="hard">困难</Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default QuestionDialog; 