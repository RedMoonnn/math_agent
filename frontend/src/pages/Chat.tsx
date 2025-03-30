import React, { useState } from 'react';
import { Row, Col, Typography, Card, Divider, Alert, Button } from 'antd';
import ChatWidget from '../components/ChatWidget';
import MathDisplay from '../components/MathDisplay';

const { Title, Text, Paragraph } = Typography;

/**
 * 数学聊天页面组件
 * 提供快速向AI提问的界面
 */
const Chat: React.FC = () => {
  const [showExamples, setShowExamples] = useState(true);
  
  // 预设的示例问题
  const examples = [
    {
      title: "求解一元二次方程",
      content: "如何求解一元二次方程 ax² + bx + c = 0？",
      answer: `一元二次方程 $ax^2 + bx + c = 0$ $(a \\neq 0)$ 的解法:

$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

其中判别式 $\\Delta = b^2 - 4ac$ 决定了方程解的性质：
- 如果 $\\Delta > 0$，方程有两个不同的实数解
- 如果 $\\Delta = 0$，方程有一个二重实数解
- 如果 $\\Delta < 0$，方程有两个不同的复数解`
    },
    {
      title: "微积分基础",
      content: "请解释导数的几何意义是什么？",
      answer: `导数的几何意义是函数图像在某点处的切线斜率。

如果函数 $y = f(x)$ 在点 $(x_0, f(x_0))$ 处的导数为 $f'(x_0)$，则在该点处的切线方程为：

$$y - f(x_0) = f'(x_0)(x - x_0)$$

导数还可以表示函数在该点处的变化率，这在物理学中常用来表示速度（位移对时间的导数）。`
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card>
            <Title level={2}>数学聊天助手</Title>
            <Text>
              使用我们的聊天助手快速获取数学问题的解答。您可以输入文字描述问题，或拍照上传数学题目。
            </Text>
            <Divider />
            <Alert
              message="使用技巧"
              description="使用TeX格式可以输入专业的数学公式，例如 $E=mc^2$ 表示 E=mc²。您也可以拍照上传数学题目图片，我们会自动识别。"
              type="info"
              showIcon
            />
          </Card>
        </Col>
        
        {showExamples && (
          <Col span={24}>
            <Card title="问题示例">
              <Row gutter={[16, 16]}>
                {examples.map((example, index) => (
                  <Col span={12} key={index}>
                    <Card 
                      title={example.title}
                      size="small"
                      extra={
                        <Button 
                          type="link" 
                          onClick={() => setShowExamples(false)}
                        >
                          隐藏示例
                        </Button>
                      }
                    >
                      <Paragraph strong>{example.content}</Paragraph>
                      <Divider dashed />
                      <MathDisplay content={example.answer} />
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        )}
        
        <Col span={24}>
          <ChatWidget />
        </Col>
      </Row>
    </div>
  );
};

export default Chat; 