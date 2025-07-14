import React, { useEffect, useState } from 'react';
import { Rule } from '@rsdoctor/types';
import { Badge, Card, Space, Typography, Col, Row, Tag } from 'antd';
import ReactMarkdown from 'react-markdown';
import { Title } from '../../../components/Title';
import { Size } from '../../../constants';
import { useUrlQuery } from '../../../utils';

export const Page: React.FC = () => {
  const query = useUrlQuery();

  const defaultErrorCode =
    query[Rule.RsdoctorRuleClientConstant.UrlQueryForErrorCode] || '';

  const [ruleMessage, setRuleMessage] = useState<Rule.RuleMessage>(
    Rule.RuleErrorMap[defaultErrorCode as keyof typeof Rule.RuleErrorMap],
  );

  const dataSource = Object.values(Rule.RuleErrorMap)!;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <Row gutter={Size.BasePadding / 2}>
      <Col span={8}>
        <Card title={<Title text="list of the error codes." />} bordered>
          <Space direction="vertical">
            {dataSource.map((e, i) => (
              <Space
                style={{
                  marginTop: i === 0 ? 0 : Size.BasePadding / 2,
                  cursor: 'pointer',
                }}
                onClick={() => setRuleMessage(e)}
                key={e.code}
                align="center"
              >
                <Badge status="default" />
                <Typography.Text code>
                  <a>{e.code}</a>
                </Typography.Text>
                <Typography.Text
                  style={{
                    color:
                      ruleMessage && ruleMessage.code === e.code
                        ? '#1890ff'
                        : undefined,
                  }}
                >
                  {e.title}
                </Typography.Text>
              </Space>
            ))}
          </Space>
        </Card>
      </Col>
      <Col span={16}>
        {ruleMessage ? (
          <Card
            title={
              <Row justify="space-between">
                <Space>
                  <Typography.Text code>{ruleMessage.code}</Typography.Text>
                  <Typography.Text>{ruleMessage.title}</Typography.Text>
                </Space>
                <div>
                  <Tag>{ruleMessage.category}</Tag>
                </div>
              </Row>
            }
            bodyStyle={{ paddingTop: 0 }}
            bordered
          >
            <Typography.Paragraph>
              {ruleMessage.type === 'markdown' ? (
                // TODO: ReactMarkdown 将带来体积增大 100 KB，需用其他组件或方案优化掉
                <ReactMarkdown>{ruleMessage.description}</ReactMarkdown>
              ) : (
                <Typography.Text>{ruleMessage.description}</Typography.Text>
              )}
            </Typography.Paragraph>
          </Card>
        ) : (
          <Card
            title={
              'This page lists all the error codes emitted by the Rsdoctor.'
            }
            bordered
          >
            <Typography.Text>
              click the error code in left bar to show more details.
            </Typography.Text>
          </Card>
        )}
      </Col>
    </Row>
  );
};

export * from './constants';
