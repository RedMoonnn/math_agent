import React, { useEffect, useState } from 'react';
import { List, Card, Tag, Button, Space, message, Modal, Form, Input, Select, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { questionAPI } from '../services/api';
import { setQuestions, setLoading, setError, addQuestion } from '../store/slices/questionSlice';

const { TextArea } = Input;
const { Option } = Select;
const { Text } = Typography;

const QuestionList: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { questions, loading } = useSelector((state: RootState) => state.questions);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchQuestions = async () => {
    try {
      setFetchError(null);
      dispatch(setLoading(true));
      dispatch(setError(null));
      console.log('正在获取问题列表...');
      
      // 使用正斜杠确保请求路径正确
      const response = await questionAPI.getQuestions();
      
      console.log('获取到问题列表:', response.data);
      
      // 确保我们能够处理后端返回的不同格式的difficulty值
      const normalizedQuestions = response.data.map((q: any) => ({
        ...q,
        difficulty: q.difficulty ? q.difficulty.toUpperCase() : 'UNKNOWN'
      }));
      
      dispatch(setQuestions(normalizedQuestions));
    } catch (error: any) {
      console.error('获取问题列表失败:', error);
      let errorMessage = '获取问题列表失败';
      
      if (error.response) {
        // 服务器返回了错误
        errorMessage = `服务器错误 (${error.response.status}): ${error.response.data?.detail || error.response.statusText}`;
        console.error('响应数据:', error.response.data);
      } else if (error.request) {
        // 请求发送了但没有收到响应
        errorMessage = '无法连接到服务器，请检查后端服务是否运行';
        console.error('请求错误:', error.request);
      } else {
        // 其他错误
        errorMessage = `请求错误: ${error.message}`;
      }
      
      setFetchError(errorMessage);
      dispatch(setError(errorMessage));
      message.error(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleCreateQuestion = () => {
    if (!isAuthenticated) {
      message.warning('请先登录后再创建问题！');
      navigate('/login');
      return;
    }
    
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      
      console.log('正在提交问题:', values);
      const response = await questionAPI.createQuestion({
        title: values.title,
        content: values.content,
        category: values.category,
        difficulty: values.difficulty,
      });
      
      console.log('问题创建成功:', response.data);
      dispatch(addQuestion(response.data));
      message.success('问题创建成功！');
      setIsModalVisible(false);
      form.resetFields();
    } catch (error: any) {
      console.error('创建问题失败:', error);
      const errorMessage = error.response?.data?.detail || error.message || '提交失败';
      message.error(`创建问题失败：${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
      case 'EASY':
        return 'green';
      case 'medium':
      case 'MEDIUM':
        return 'orange';
      case 'hard':
      case 'HARD':
        return 'red';
      default:
        return 'default';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
      case 'EASY':
        return '简单';
      case 'medium':
      case 'MEDIUM':
        return '中等';
      case 'hard':
      case 'HARD':
        return '困难';
      default:
        return difficulty || '未知';
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined key="plus-icon" />}
          onClick={handleCreateQuestion}
        >
          新建问题
        </Button>
        <Button
          icon={<ReloadOutlined key="reload-icon" />}
          onClick={fetchQuestions}
          loading={loading}
        >
          刷新列表
        </Button>
      </Space>

      {fetchError && (
        <div style={{ marginBottom: 16 }}>
          <Text type="danger">获取问题列表失败：{fetchError}</Text>
          <div style={{ marginTop: 8 }}>
            <Text>请检查后端服务是否正常运行或尝试刷新页面。</Text>
          </div>
        </div>
      )}

      <List
        grid={{ gutter: 16, column: 3 }}
        dataSource={questions}
        loading={loading}
        locale={{ emptyText: '暂无问题，点击"新建问题"创建一个吧！' }}
        renderItem={(question) => (
          <List.Item>
            <Card
              hoverable
              title={question.title}
              onClick={() => navigate(`/questions/${question.id}`)}
            >
              <p>{question.content.substring(0, 100)}...</p>
              <Space>
                <Tag color={getDifficultyColor(question.difficulty)}>
                  {getDifficultyText(question.difficulty)}
                </Tag>
                {question.category && <Tag color="blue">{question.category}</Tag>}
              </Space>
            </Card>
          </List.Item>
        )}
      />
      
      <Modal
        title="创建新问题"
        open={isModalVisible}
        onCancel={handleModalCancel}
        footer={[
          <Button key="back" onClick={handleModalCancel}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={submitting}
            onClick={handleModalSubmit}
          >
            提交
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          name="questionForm"
        >
          <Form.Item
            name="title"
            label="问题标题"
            rules={[{ required: true, message: '请输入问题标题！' }]}
          >
            <Input placeholder="请输入问题标题" />
          </Form.Item>
          
          <Form.Item
            name="content"
            label="问题内容"
            rules={[{ required: true, message: '请输入问题内容！' }]}
          >
            <TextArea rows={4} placeholder="请输入问题内容" />
          </Form.Item>
          
          <Form.Item
            name="category"
            label="问题分类"
            rules={[{ required: true, message: '请选择问题分类！' }]}
          >
            <Select placeholder="请选择问题分类">
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
            label="问题难度"
            rules={[{ required: true, message: '请选择问题难度！' }]}
          >
            <Select placeholder="请选择问题难度">
              <Option value="EASY">简单</Option>
              <Option value="MEDIUM">中等</Option>
              <Option value="HARD">困难</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default QuestionList; 