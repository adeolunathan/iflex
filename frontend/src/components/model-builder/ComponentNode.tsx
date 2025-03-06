// frontend/src/components/model-builder/ComponentNode.tsx

import React from 'react';
import { Handle, Position, NodeProps } from 'react-flow-renderer';
import { ModelComponent, ComponentType, DataType } from '../../types/model';

interface ComponentNodeProps extends NodeProps {
  data: {
    component: ModelComponent;
  };
}

const getNodeColor = (type: ComponentType) => {
  switch (type) {
    case ComponentType.INPUT:
      return '#9BE9A8'; // Green
    case ComponentType.FORMULA:
      return '#F8C471'; // Orange
    case ComponentType.REFERENCE:
      return '#AED6F1'; // Blue
    case ComponentType.AGGREGATION:
      return '#D2B4DE'; // Purple
    default:
      return '#E5E7E9'; // Gray
  }
};

const getDataTypeLabel = (dataType: DataType) => {
  switch (dataType) {
    case DataType.NUMBER:
      return '#';
    case DataType.PERCENTAGE:
      return '%';
    case DataType.CURRENCY:
      return '$';
    case DataType.DATE:
      return '📅';
    case DataType.TEXT:
      return 'Aa';
    case DataType.BOOLEAN:
      return '✓/✗';
    default:
      return '';
  }
};

const ComponentNode: React.FC<ComponentNodeProps> = ({ data }) => {
  const { component } = data;
  const nodeColor = getNodeColor(component.type);
  const dataTypeLabel = getDataTypeLabel(component.dataType);

  return (
    <div
      style={{
        padding: '10px',
        borderRadius: '5px',
        backgroundColor: nodeColor,
        border: '1px solid #666',
        width: '200px',
      }}
    >
      {/* Input handle */}
      {component.type !== ComponentType.INPUT && (
        <Handle
          type="target"
          position={Position.Top}
          style={{ background: '#555' }}
        />
      )}
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <div style={{ fontWeight: 'bold', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {component.name}
        </div>
        <div style={{ 
          backgroundColor: '#fff', 
          borderRadius: '3px', 
          padding: '0 4px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {dataTypeLabel}
        </div>
      </div>
      
      {component.type === ComponentType.FORMULA && component.formula && (
        <div style={{ 
          fontSize: '12px', 
          backgroundColor: 'rgba(255,255,255,0.5)',
          padding: '3px',
          borderRadius: '3px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {component.formula}
        </div>
      )}
      
      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#555' }}
      />
    </div>
  );
};

export default ComponentNode;