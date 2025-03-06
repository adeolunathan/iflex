// services/collaboration-service/src/types/index.ts

export enum OperationType {
    UPDATE_COMPONENT = 'UPDATE_COMPONENT',
    CREATE_COMPONENT = 'CREATE_COMPONENT',
    DELETE_COMPONENT = 'DELETE_COMPONENT',
    UPDATE_MODEL_METADATA = 'UPDATE_MODEL_METADATA',
    UPDATE_VALUES = 'UPDATE_VALUES',
  }
  
  export interface Position {
    x: number;
    y: number;
  }
  
  export interface ModelComponent {
    id: string;
    name: string;
    description?: string;
    type: string;
    dataType: string;
    formula?: string;
    references?: string[];
    position: Position;
  }
  
  export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  }
  
  export interface Cursor {
    userId: string;
    position: Position;
  }
  
  export interface Operation {
    id: string;
    type: OperationType;
    modelId: string;
    userId: string;
    timestamp: Date;
    componentId?: string;
    data: any;
  }
  
  export interface ModelSession {
    id: string;
    modelId: string;
    connectedUsers: User[];
    cursors: Record<string, Cursor>; // userId -> cursor
    lastOperations: Operation[];
    created: Date;
    updated: Date;
  }