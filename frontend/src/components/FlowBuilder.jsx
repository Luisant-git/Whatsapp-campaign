import React, { useState } from 'react';
import { Save, Eye, ArrowLeft, Trash2, GripVertical, Type, AlignLeft, ChevronDown, Calendar, CheckSquare, Circle, X, Move } from 'lucide-react';
import flowAPI from '../api/flow';
import '../styles/FlowBuilder.css';

const FlowBuilder = ({ onBack }) => {
  const [flowName, setFlowName] = useState('');
  const [screens, setScreens] = useState([
    {
      id: '',
      title: '',
      data: {},
      layout: {
        type: 'SingleColumnLayout',
        children: []
      }
    }
  ]);
  const [currentScreen, setCurrentScreen] = useState(0);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const componentTypes = [
    { type: 'TextInput', label: 'Text Input', Icon: Type },
    { type: 'TextArea', label: 'Text Area', Icon: AlignLeft },
    { type: 'Dropdown', label: 'Dropdown', Icon: ChevronDown },
    { type: 'DatePicker', label: 'Date Picker', Icon: Calendar },
    { type: 'CheckboxGroup', label: 'Checkbox', Icon: CheckSquare },
    { type: 'RadioButtonsGroup', label: 'Radio Button', Icon: Circle },
  ];

  const [draggedComponent, setDraggedComponent] = useState(null);
  const [connections, setConnections] = useState([]);
  const [draggingConnection, setDraggingConnection] = useState(null);
  const canvasRef = React.useRef(null);

  const addComponent = (type, x = 100, y = 100) => {
    const newComponent = {
      type,
      name: `${type.toLowerCase()}_${Date.now()}`,
      label: `${type}`,
      required: false,
      position: { x, y },
      id: Date.now(),
      ...(type === 'TextInput' && { 'input-type': 'text', 'helper-text': '' }),
      ...(type === 'TextArea' && { 'helper-text': '' }),
      ...(type === 'Dropdown' && { 'data-source': [] }),
      ...(type === 'DatePicker' && { 'helper-text': 'Select a date' }),
      ...(type === 'CheckboxGroup' && { 'data-source': [] }),
      ...(type === 'RadioButtonsGroup' && { 'data-source': [] })
    };

    const updatedScreens = [...screens];
    updatedScreens[currentScreen].layout.children.push(newComponent);
    setScreens(updatedScreens);
    setSelectedComponent(updatedScreens[currentScreen].layout.children.length - 1);
  };

  const handleDragStart = (e, type) => {
    setDraggedComponent(type);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (draggedComponent) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      addComponent(draggedComponent, x - 60, y - 30);
      setDraggedComponent(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const moveComponent = (index, newX, newY) => {
    const updatedScreens = [...screens];
    updatedScreens[currentScreen].layout.children[index].position = { x: newX, y: newY };
    setScreens(updatedScreens);
  };

  const getComponentIcon = (type) => {
    const comp = componentTypes.find(c => c.type === type);
    return comp ? comp.Icon : Type;
  };

  const updateComponent = (index, field, value) => {
    const updatedScreens = [...screens];
    updatedScreens[currentScreen].layout.children[index][field] = value;
    setScreens(updatedScreens);
  };

  const removeComponent = (index) => {
    const updatedScreens = [...screens];
    const componentId = updatedScreens[currentScreen].layout.children[index].id;
    updatedScreens[currentScreen].layout.children.splice(index, 1);
    setScreens(updatedScreens);
    setSelectedComponent(null);
    setConnections(connections.filter(c => c.from !== componentId && c.to !== componentId));
  };

  const handleConnectionStart = (e, componentId) => {
    e.stopPropagation();
    const rect = canvasRef.current.getBoundingClientRect();
    setDraggingConnection({ from: componentId, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleConnectionDrag = (e) => {
    if (draggingConnection && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setDraggingConnection({ ...draggingConnection, x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const handleConnectionEnd = (componentId) => {
    if (draggingConnection && draggingConnection.from !== componentId) {
      setConnections([...connections, { from: draggingConnection.from, to: componentId }]);
    }
    setDraggingConnection(null);
  };

  const renderConnections = () => {
    const lines = [];
    
    connections.forEach((conn, idx) => {
      const fromComp = screens[currentScreen].layout.children.find(c => c.id === conn.from);
      const toComp = screens[currentScreen].layout.children.find(c => c.id === conn.to);
      if (!fromComp || !toComp) return;

      const fromX = (fromComp.position?.x || 100) + 120;
      const fromY = (fromComp.position?.y || 100) + 40;
      const toX = (toComp.position?.x || 100);
      const toY = (toComp.position?.y || 100) + 40;

      lines.push(
        <line
          key={idx}
          x1={fromX}
          y1={fromY}
          x2={toX}
          y2={toY}
          stroke="#25D366"
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
        />
      );
    });

    if (draggingConnection) {
      const fromComp = screens[currentScreen].layout.children.find(c => c.id === draggingConnection.from);
      if (fromComp) {
        const fromX = (fromComp.position?.x || 100) + 120;
        const fromY = (fromComp.position?.y || 100) + 40;
        lines.push(
          <line
            key="dragging"
            x1={fromX}
            y1={fromY}
            x2={draggingConnection.x}
            y2={draggingConnection.y}
            stroke="#25D366"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
        );
      }
    }

    return (
      <svg className="connection-svg">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#25D366" />
          </marker>
        </defs>
        {lines}
      </svg>
    );
  };

  const handleSave = async () => {
    if (!flowName) {
      alert('Please enter a flow name');
      return;
    }

    if (screens[0].layout.children.length === 0) {
      alert('Please add at least one component to the flow');
      return;
    }

    const flowJson = {
      version: '5.0',
      screens: screens.map(screen => ({
        id: screen.id || 'SCREEN',
        title: screen.title || flowName,
        data: {},
        layout: screen.layout,
        terminal: true
      }))
    };

    try {
      await flowAPI.createFlow({ name: flowName, flowJson });
      alert('Flow created successfully!');
      onBack();
    } catch (error) {
      console.error('Flow creation error:', error);
      alert('Failed to create flow: ' + (error.response?.data?.error?.message || error.message));
    }
  };

  const renderPreview = () => {
    const currentScreenData = screens[currentScreen];
    return (
      <div className="preview-modal" onClick={() => setShowPreview(false)}>
        <div className="preview-content" onClick={(e) => e.stopPropagation()}>
          <div className="preview-header">
            <h3>{currentScreenData.title || 'Preview'}</h3>
            <button onClick={() => setShowPreview(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="preview-body">
            {currentScreenData.layout.children.map((component, index) => (
              <div key={index} className="preview-field">
                <label>{component.label} {component.required && <span className="required">*</span>}</label>
                {component.type === 'TextInput' && <input type="text" placeholder={component['helper-text']} />}
                {component.type === 'TextArea' && <textarea placeholder={component['helper-text']} rows={3} />}
                {component.type === 'Dropdown' && <select><option>Select an option</option></select>}
                {component.type === 'DatePicker' && <input type="date" />}
                {component.type === 'CheckboxGroup' && (
                  <div><label><input type="checkbox" /> Option 1</label></div>
                )}
                {component.type === 'RadioButtonsGroup' && (
                  <div><label><input type="radio" name={component.name} /> Option 1</label></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flow-builder">
      <div className="builder-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={20} />
          Back
        </button>
        <input
          type="text"
          className="flow-name-input"
          placeholder="Enter Flow Name"
          value={flowName}
          onChange={(e) => setFlowName(e.target.value)}
        />
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => setShowPreview(true)}>
            <Eye size={18} />
            Preview
          </button>
          <button className="btn-primary" onClick={handleSave}>
            <Save size={18} />
            Save Flow
          </button>
        </div>
      </div>

      <div className="builder-content">
        <div className="components-panel">
          <div className="component-list">
            {componentTypes.map((comp) => (
              <div
                key={comp.type}
                draggable
                onDragStart={(e) => handleDragStart(e, comp.type)}
                className="component-btn"
              >
                <comp.Icon size={20} className="component-icon" />
                <span>{comp.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="canvas-panel">
          <div 
            ref={canvasRef}
            className="canvas-wireframe"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onMouseMove={handleConnectionDrag}
            onMouseUp={() => setDraggingConnection(null)}
          >
            {renderConnections()}
            {screens[currentScreen].layout.children.map((component, index) => {
              const ComponentIcon = getComponentIcon(component.type);
              return (
                <div 
                  key={index} 
                  className={`wireframe-node ${selectedComponent === index ? 'selected' : ''}`}
                  style={{
                    left: component.position?.x || 100,
                    top: component.position?.y || 100 + (index * 80)
                  }}
                  onClick={() => setSelectedComponent(index)}
                  onMouseUp={() => draggingConnection && handleConnectionEnd(component.id)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('index', index.toString());
                  }}
                  onDragEnd={(e) => {
                    const rect = e.currentTarget.parentElement.getBoundingClientRect();
                    const newX = e.clientX - rect.left - 60;
                    const newY = e.clientY - rect.top - 30;
                    if (newX > 0 && newY > 0) {
                      moveComponent(index, newX, newY);
                    }
                  }}
                >
                  {selectedComponent === index && (
                    <>
                      <div 
                        className="connection-dot connection-dot-left"
                        onMouseDown={(e) => handleConnectionStart(e, component.id)}
                      />
                      <div 
                        className="connection-dot connection-dot-right"
                        onMouseDown={(e) => handleConnectionStart(e, component.id)}
                      />
                    </>
                  )}
                  <div className="node-content">
                    <ComponentIcon size={16} />
                    <span className="node-label">{component.label}</span>
                    <button 
                      className="node-delete" 
                      onClick={(e) => { e.stopPropagation(); removeComponent(index); }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
            {screens[currentScreen].layout.children.length === 0 && (
              <div className="empty-wireframe">
                <p>👈 Drag components here to build your flow</p>
              </div>
            )}
          </div>
        </div>

        <div className="properties-panel">
          <h3>Properties</h3>
          {selectedComponent !== null ? (
            <div className="properties-form">
              <div className="form-group">
                <label>Label</label>
                <input
                  type="text"
                  value={screens[currentScreen].layout.children[selectedComponent].label}
                  onChange={(e) => updateComponent(selectedComponent, 'label', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Field Name</label>
                <input
                  type="text"
                  value={screens[currentScreen].layout.children[selectedComponent].name}
                  onChange={(e) => updateComponent(selectedComponent, 'name', e.target.value)}
                />
              </div>
              {screens[currentScreen].layout.children[selectedComponent]['helper-text'] !== undefined && (
                <div className="form-group">
                  <label>Helper Text</label>
                  <input
                    type="text"
                    value={screens[currentScreen].layout.children[selectedComponent]['helper-text']}
                    onChange={(e) => updateComponent(selectedComponent, 'helper-text', e.target.value)}
                  />
                </div>
              )}
              {(screens[currentScreen].layout.children[selectedComponent].type === 'Dropdown' ||
                screens[currentScreen].layout.children[selectedComponent].type === 'CheckboxGroup' ||
                screens[currentScreen].layout.children[selectedComponent].type === 'RadioButtonsGroup') && (
                <div className="form-group">
                  <label>Options (comma separated)</label>
                  <input
                    type="text"
                    placeholder="Option 1, Option 2, Option 3"
                    value={(screens[currentScreen].layout.children[selectedComponent]['data-source'] || []).join(', ')}
                    onChange={(e) => {
                      const options = e.target.value.split(',').map(opt => opt.trim()).filter(opt => opt);
                      updateComponent(selectedComponent, 'data-source', options);
                    }}
                  />
                </div>
              )}
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={screens[currentScreen].layout.children[selectedComponent].required}
                    onChange={(e) => updateComponent(selectedComponent, 'required', e.target.checked)}
                  />
                  Required Field
                </label>
              </div>
            </div>
          ) : (
            <p className="no-selection">Select a component to edit its properties</p>
          )}
        </div>
      </div>

      {showPreview && renderPreview()}
    </div>
  );
};

export default FlowBuilder;
