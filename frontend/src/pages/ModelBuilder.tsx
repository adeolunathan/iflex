// frontend/src/pages/ModelBuilder.tsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { gql, useQuery, useMutation } from '@apollo/client';
import ModelCanvas from '../components/model-builder/ModelCanvas';
import { ModelComponent, FinancialModel } from '../types/model';

const GET_MODEL = gql`
  query GetModel($id: ID!) {
    model(id: $id) {
      id
      name
      description
      startDate
      endDate
      timePeriod
      periodCount
      organizationId
      components {
        id
        name
        description
        type
        dataType
        formula
        references
        position {
          x
          y
        }
      }
    }
  }
`;

const UPDATE_COMPONENT = gql`
  mutation UpdateComponent($id: ID!, $input: ModelComponentInput!) {
    updateComponent(id: $id, input: $input) {
      id
      name
      description
      type
      dataType
      formula
      references
      position {
        x
        y
      }
    }
  }
`;

const ADD_COMPONENT = gql`
  mutation AddComponent($modelId: ID!, $input: ModelComponentInput!) {
    addComponent(modelId: $modelId, input: $input) {
      id
      name
      description
      type
      dataType
      formula
      references
      position {
        x
        y
      }
    }
  }
`;

const DELETE_COMPONENT = gql`
  mutation DeleteComponent($id: ID!) {
    deleteComponent(id: $id)
  }
`;

const ModelBuilderPage: React.FC = () => {
  const { modelId } = useParams<{ modelId: string }>();
  const [model, setModel] = useState<FinancialModel | null>(null);
  const [components, setComponents] = useState<ModelComponent[]>([]);
  
  const { loading, error, data } = useQuery(GET_MODEL, {
    variables: { id: modelId },
    skip: !modelId,
  });
  
  const [updateComponent] = useMutation(UPDATE_COMPONENT);
  const [addComponent] = useMutation(ADD_COMPONENT);
  const [deleteComponent] = useMutation(DELETE_COMPONENT);
  
  useEffect(() => {
    if (data && data.model) {
      setModel(data.model);
      setComponents(data.model.components || []);
    }
  }, [data]);
  
  const handleComponentsChange = async (updatedComponents: ModelComponent[]) => {
    setComponents(updatedComponents);
    
    // Find which components were added, updated, or deleted
    if (!model) return;
    
    const originalComponents = model.components || [];
    
    // Added components
    const addedComponents = updatedComponents.filter(
      component => !originalComponents.some(c => c.id === component.id)
    );
    
    // Updated components
    const updatedComponentsToSave = updatedComponents.filter(
      component => 
        originalComponents.some(c => c.id === component.id) &&
        JSON.stringify(component) !== JSON.stringify(
          originalComponents.find(c => c.id === component.id)
        )
    );
    
    // Deleted components
    const deletedComponents = originalComponents.filter(
      component => !updatedComponents.some(c => c.id === component.id)
    );
    
    // Save changes to server
    try {
      // Add new components
      for (const component of addedComponents) {
        await addComponent({
          variables: {
            modelId: model.id,
            input: {
              name: component.name,
              description: component.description || '',
              type: component.type,
              dataType: component.dataType,
              formula: component.formula || '',
              references: component.references || [],
              position: component.position,
            },
          },
        });
      }
      
      // Update existing components
      for (const component of updatedComponentsToSave) {
        await updateComponent({
          variables: {
            id: component.id,
            input: {
              name: component.name,
              description: component.description || '',
              type: component.type,
              dataType: component.dataType,
              formula: component.formula || '',
              references: component.references || [],
              position: component.position,
            },
          },
        });
      }
      
      // Delete components
      for (const component of deletedComponents) {
        await deleteComponent({
          variables: {
            id: component.id,
          },
        });
      }
    } catch (err) {
      console.error('Error saving components:', err);
      // Revert to original state on error
      if (data && data.model) {
        setComponents(data.model.components || []);
      }
    }
  };
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!model) return <div>Model not found</div>;
  
  return (
    <div>
      <div style={{ padding: '10px', borderBottom: '1px solid #ccc' }}>
        <h2>{model.name}</h2>
        <p>{model.description}</p>
      </div>
      <ModelCanvas
        modelId={model.id}
        components={components}
        onComponentsChange={handleComponentsChange}
      />
    </div>
  );
};

export default ModelBuilderPage;