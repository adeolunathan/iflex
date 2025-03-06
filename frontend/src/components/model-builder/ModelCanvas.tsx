// frontend/src/components/model-builder/ModelCanvas.tsx

import React, { useState, useCallback } from 'react';
import ReactFlow, { 
  Controls, 
  Background, 
  MiniMap, 
  Node, 
  Edge, 
  NodeChange,
  EdgeChange,
  Connection,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges
} from 'react-flow-renderer';
import { v4 as uuidv4 } from 'uuid';
import { ModelComponent, ComponentType, DataType } from '../../types/model';
import ComponentNode from './ComponentNode';
import ComponentPanel from './ComponentPanel';

interface ModelCanvasProps {
  modelId: string;
  components: ModelComponent[];
  onComponentsChange: (components: ModelComponent[]) => void;
}

const nodeTypes = {
  component: ComponentNode,
};

const ModelCanvas: React.FC<ModelCanvasProps> = ({ 
  modelId,
  components,
  onComponentsChange
}) => {
  // Convert components to ReactFlow nodes
  const initialNodes: Node[] = components.map(component => ({
    id: component.id,
    type: 'component',
    position: component.position,
    data: { component },
  }));

  // Create edges from component references
  const createEdges = (components: ModelComponent[]): Edge[] => {
    const edges: Edge[] = [];
    
    components.forEach(component => {
      if (component.references && component.references.length > 0) {
        component.references.forEach(referenceId => {
          edges.push({
            id: `e-${referenceId}-${component.id}`,
            source: referenceId,
            target: component.id,
            animated: true,
          });
        });
      }
    });
    
    return edges;
  };

  const initialEdges = createEdges(components);

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedComponent, setSelectedComponent] = useState<ModelComponent | null>(null);

  // Handle node changes (e.g., position)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const newNodes = applyNodeChanges(changes, nodes);
      setNodes(newNodes);
      
      // Update component positions
      const updatedComponents = components.map(component => {
        const node = newNodes.find(n => n.id === component.id);
        if (node) {
          return {
            ...component,
            position: node.position,
          };
        }
        return component;
      });
      
      onComponentsChange(updatedComponents);
    },
    [nodes, components, onComponentsChange]
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges(prev => applyEdgeChanges(changes, prev));
      
      // After edge deletion, update component references
      const deletions = changes.filter(change => change.type === 'remove');
      if (deletions.length > 0) {
        const updatedComponents = [...components];
        
        deletions.forEach(deletion => {
          const edge = edges.find(e => e.id === deletion.id);
          if (edge) {
            const targetComponent = updatedComponents.find(c => c.id === edge.target);
            if (targetComponent && targetComponent.references) {
              targetComponent.references = targetComponent.references.filter(
                ref => ref !== edge.source
              );
            }
          }
        });
        
        onComponentsChange(updatedComponents);
      }
    },
    [edges, components, onComponentsChange]
  );

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges(prev => addEdge({
        ...connection,
        animated: true,
        id: `e-${connection.source}-${connection.target}`,
      }, prev));
      
      // Update component references
      const updatedComponents = [...components];
      const targetComponent = updatedComponents.find(c => c.id === connection.target);
      if (targetComponent) {
        if (!targetComponent.references) {
          targetComponent.references = [];
        }
        
        if (!targetComponent.references.includes(connection.source as string)) {
          targetComponent.references.push(connection.source as string);
        }
        
        onComponentsChange(updatedComponents);
      }
    },
    [components, onComponentsChange]
  );

  // Handle node selection
  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    const component = components.find(c => c.id === node.id);
    setSelectedComponent(component || null);
  };

  // Add a new component
  const addComponent = (type: ComponentType) => {
    const newComponent: ModelComponent = {
      id: uuidv4(),
      name: `New ${type}`,
      type,
      dataType: DataType.NUMBER,
      position: { x: 100, y: 100 },
      references: [],
    };
    
    const updatedComponents = [...components, newComponent];
    onComponentsChange(updatedComponents);
    
    // Add to nodes
    const newNode: Node = {
      id: newComponent.id,
      type: 'component',
      position: newComponent.position,
      data: { component: newComponent },
    };
    
    setNodes(prev => [...prev, newNode]);
    setSelectedComponent(newComponent);
  };

  // Update a component
  const updateComponent = (updatedComponent: ModelComponent) => {
    const updatedComponents = components.map(component => 
      component.id === updatedComponent.id ? updatedComponent : component
    );
    
    onComponentsChange(updatedComponents);
    
    // Update node
    setNodes(prev => prev.map(node => 
      node.id === updatedComponent.id 
        ? { ...node, data: { component: updatedComponent } }
        : node
    ));
    
    setSelectedComponent(updatedComponent);
  };

  // Delete a component
  const deleteComponent = (componentId: string) => {
    const updatedComponents = components.filter(component => component.id !== componentId);
    onComponentsChange(updatedComponents);
    
    // Remove node
    setNodes(prev => prev.filter(node => node.id !== componentId));
    
    // Remove edges
    setEdges(prev => prev.filter(edge => 
      edge.source !== componentId && edge.target !== componentId
    ));
    
    setSelectedComponent(null);
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 100px)' }}>
      <div style={{ flex: 3, height: '100%' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Controls />
          <Background />
          <MiniMap />
        </ReactFlow>
      </div>
      <div style={{ flex: 1, padding: '10px', borderLeft: '1px solid #ccc' }}>
        <ComponentPanel 
          selectedComponent={selectedComponent}
          onAddComponent={addComponent}
          onUpdateComponent={updateComponent}
          onDeleteComponent={deleteComponent}
          availableComponents={components}
        />
      </div>
    </div>
  );
};

export default ModelCanvas;