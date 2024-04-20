import { Card, Empty } from 'antd';

export function Space() {
  return (
    <Card
      title="Tree Shaking Analysis"
      bodyStyle={{ paddingTop: 0 }}
      className="tree-shaking-page"
    >
      <Empty style={{ marginTop: 30 }} />
    </Card>
  );
}
