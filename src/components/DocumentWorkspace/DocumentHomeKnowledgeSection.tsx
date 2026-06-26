import { Button } from 'antd'
import { ApartmentOutlined, DatabaseOutlined } from '@ant-design/icons'

interface DocumentHomeKnowledgeSectionProps {
  onOpen: () => void
}

export function DocumentHomeKnowledgeSection({ onOpen }: DocumentHomeKnowledgeSectionProps) {
  return (
    <section className="knowledge-home-section" aria-labelledby="knowledge-home-title">
      <div className="section-heading">
        <DatabaseOutlined />
        <div>
          <h2 id="knowledge-home-title">知识库</h2>
          <p>管理项目里的结构化知识集合。</p>
        </div>
      </div>
      <div className="knowledge-home-body">
        <div className="knowledge-home-main">
          <span className="knowledge-home-icon"><ApartmentOutlined /></span>
          <div>
            <h3>文档知识图谱</h3>
            <p>导入规范化知识源后，在项目内搜索记录、查看节点详情和图谱关系。</p>
          </div>
        </div>
        <Button type="primary" icon={<DatabaseOutlined />} onClick={onOpen}>
          打开知识库
        </Button>
      </div>
    </section>
  )
}
