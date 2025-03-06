// frontend/src/components/model-builder/ComponentPanel.tsx

import React, { useState } from 'react';
import { ModelComponent, ComponentType, DataType } from '../../types/model';

interface ComponentPanelProps {
  selectedComponent: ModelComponent | null;
  onAddComponent: (type: ComponentType) => void;
  onUpdateComponent: (component: ModelComponent) => void;
  onDeleteComponent: (componentId: string) => void;
  availableComponents: ModelComponent[];
}

const ComponentPanel: React.FC<ComponentPanelProps> = ({
  selectedComponent,
  onAddComponent,
  onUpdateComponent,
  onDeleteComponent,
  availableComponents,
}) => {
  const [editedComponent, setEditedComponent] = useState<ModelComponent | null>(selectedComponent);
  
  React.useEffect(() => {
    setEditedComponent(selectedComponent);
  }, [selectedComponent]);
  
  if (!editedComponent) {
    return (
      <div>
        <h3>Component Panel</h3>
        <div style={{ marginBottom: '20px' }}>
          <p>Select a component to edit or add a new one:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <button 
              onClick={() => onAddComponent(ComponentType.INPUT)}
              style={{ 
                padding: '8px 12px', 
                backgroundColor: '#9BE9A8',
                border: '1px solid #666',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Add Input
            </button>
            <button 
              onClick={() => onAddComponent(ComponentType.FORMULA)}
              style={{ 
                padding: '8px 12px', 
                backgroundColor: '#F8C471',
                border: '1px solid #666',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Add Formula
            </button>
            <button 
              onClick={() => onAddComponent(ComponentType.REFERENCE)}
              style={{ 
                padding: '8px 12px', 
                backgroundColor: '#AED6F1',
                border: '1px solid #666',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Add Reference
            </button>
            <button 
              onClick={() => onAddComponent(ComponentType.AGGREGATION)}
              style={{ 
                padding: '8px 12px', 
                backgroundColor: '#D2B4DE',
                border: '1px solid #666',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Add Aggregation
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  const handleChange = (field: keyof ModelComponent, value: string | string[]) => {
    if (!editedComponent) return;
    
    setEditedComponent({
      ...editedComponent,
      [field]: value,
    });
  };
  
  const handleSave = () => {
    if (!editedComponent) return;
    onUpdateComponent(editedComponent);
  };
  
  const handleDelete = () => {
    if (!editedComponent) return;
    onDeleteComponent(editedComponent.id);
  };
  
  return (
    <div>
      <h3>Edit Component</h3>
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Name:</label>
        <input
          type="text"
          value={editedComponent.name}
          onChange={(e) => handleChange('name', e.target.value)}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Description:</label>
        <textarea
          value={editedComponent.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '60px' }}
        />
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Type:</label>
        <select
          value={editedComponent.type}
          onChange={(e) => handleChange('type', e.target.value)}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          disabled
        >
          {Object.values(ComponentType).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Data Type:</label>
        <select
          value={editedComponent.dataType}
          onChange={(e) => handleChange('dataType', e.target.value)}
          style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          {Object.values(DataType).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      
      {(editedComponent.type === ComponentType.FORMULA || 
        editedComponent.type === ComponentType.AGGREGATION) && (
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Formula:</label>
          <textarea
            value={editedComponent.formula || ''}
            onChange={(e) => handleChange('formula', e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', minHeight: '60px' }}
            placeholder="Enter formula (e.g., A + B or SUM(A,B))"
          />
        </div>
      )}
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>References:</label>
        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ccc', borderRadius: '4px', padding: '8px' }}>
          {editedComponent.references && editedComponent.references.length > 0 ? (
            editedComponent.references.map((refId) => {
              const refComponent = availableComponents.find(c => c.id === refId);
              return (
                <div key={refId} style={{ marginBottom: '5px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ flex: 1 }}>{refComponent ? refComponent.name : refId}</span>
                  <button
                    onClick={() => {
                      if (!editedComponent.references) return;
                      handleChange(
                        'references',
                        editedComponent.references.filter(id => id !== refId)
                      );
                    }}
                    style={{ 
                      border: 'none', 
                      background: 'none', 
                      color: 'red', 
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })
          ) : (
            <p style={{ color: '#999', margin: 0 }}>No references yet. Connect components on the canvas.</p>
          )}
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        <button
          onClick={handleSave}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Save
        </button>
        <button
          onClick={handleDelete}
          style={{ 
            padding: '8px 16px', 
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default ComponentPanel;